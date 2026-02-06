/**
 * Collaboration Routes
 * Handles section assignments, comments, AI drafting, and validation
 * for collaborative proposal drafting
 */

import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { aiRateLimiter } from '../middlewares/rate-limit.middleware.js';
import {
  requireSectionPermission,
  requireProposalOwner,
  requireUploadedSectionPermission,
  requireUploadedTenderOwner,
} from '../middlewares/sectionPermission.middleware.js';
import { CollaborationService } from '../services/collaboration.service.js';
import { CommentService } from '../services/comment.service.js';
import { CollaborativeDrafterService } from '../services/collaborativeDrafter.service.js';

const router = Router();

// ==========================================
// USER SEARCH
// ==========================================

/**
 * GET /api/collaboration/users/search
 * Search assisters by email (can be from any organization)
 * Query params: email (min 3 chars)
 */
router.get('/users/search', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email || email.length < 3) {
      return res.status(400).json({
        error: 'Email search requires at least 3 characters',
      });
    }

    // Search ALL assisters system-wide (not limited to same organization)
    const users = await CollaborationService.searchAssistersByEmail(email, 10);

    // Filter out the current user from results
    const filteredUsers = users.filter(u => u.user_id !== req.user.id);

    res.json({
      success: true,
      data: filteredUsers,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// PLATFORM TENDER - SECTION ASSIGNMENTS
// ==========================================

/**
 * GET /api/collaboration/proposals/:id/assignments
 * Get all section assignments for a proposal
 */
router.get('/proposals/:id/assignments', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id: proposalId } = req.params;

    const data = await CollaborationService.loadCollaborationData(proposalId, req.user.id);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    if (err.message === 'Proposal not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/collaboration/proposals/:id/sections/:sectionId/assign
 * Assign a user to a section
 * Body: { userId, permission }
 */
router.post(
  '/proposals/:id/sections/:sectionId/assign',
  requireAuth,
  requireRole('BIDDER'),
  requireProposalOwner(),
  async (req, res, next) => {
    try {
      const { id: proposalId, sectionId } = req.params;
      const { userId, permission } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      if (!['EDIT', 'READ_AND_COMMENT'].includes(permission)) {
        return res.status(400).json({
          error: 'Invalid permission. Must be EDIT or READ_AND_COMMENT',
        });
      }

      const assignment = await CollaborationService.assignUserToSection(
        proposalId,
        sectionId,
        userId,
        permission,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'User assigned to section',
      });
    } catch (err) {
      if (err.message.includes('does not belong')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  }
);

/**
 * DELETE /api/collaboration/proposals/:id/sections/:sectionId/users/:userId
 * Remove user assignment from a section
 */
router.delete(
  '/proposals/:id/sections/:sectionId/users/:userId',
  requireAuth,
  requireRole('BIDDER'),
  requireProposalOwner(),
  async (req, res, next) => {
    try {
      const { id: proposalId, sectionId, userId } = req.params;

      await CollaborationService.removeUserFromSection(
        proposalId,
        sectionId,
        userId,
        req.user.id
      );

      res.json({
        success: true,
        message: 'User removed from section',
      });
    } catch (err) {
      if (err.message === 'Assignment not found') {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

// ==========================================
// PLATFORM TENDER - COMMENTS
// ==========================================

/**
 * GET /api/collaboration/proposals/:id/sections/:sectionId/comments
 * Get all comments for a section
 */
router.get(
  '/proposals/:id/sections/:sectionId/comments',
  requireAuth,
  requireRole('BIDDER'),
  requireSectionPermission('READ_ONLY'),
  async (req, res, next) => {
    try {
      const { id: proposalId, sectionId } = req.params;

      const comments = await CommentService.getCommentsBySection(proposalId, sectionId);

      res.json({
        success: true,
        data: comments,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/collaboration/proposals/:id/sections/:sectionId/comments
 * Create a comment on a section
 * Body: { content, parentCommentId?, quotedText?, selectionStart?, selectionEnd? }
 */
router.post(
  '/proposals/:id/sections/:sectionId/comments',
  requireAuth,
  requireRole('BIDDER'),
  requireSectionPermission('READ_AND_COMMENT'),
  async (req, res, next) => {
    try {
      const { id: proposalId, sectionId } = req.params;
      const { content, parentCommentId, quotedText, selectionStart, selectionEnd } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      const comment = await CommentService.createComment({
        proposalId,
        sectionId,
        userId: req.user.id,
        content,
        parentCommentId,
        quotedText,
        selectionStart,
        selectionEnd,
      });

      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('same section')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  }
);

/**
 * PUT /api/collaboration/comments/:commentId
 * Update a comment (author only)
 */
router.put('/comments/:commentId', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await CommentService.updateComment(commentId, req.user.id, content);

    res.json({
      success: true,
      data: comment,
    });
  } catch (err) {
    if (err.message === 'Comment not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('Only comment author')) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/collaboration/comments/:commentId
 * Delete a comment (author or proposal owner)
 */
router.delete('/comments/:commentId', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { proposalId } = req.query;

    const result = await CommentService.deleteComment(commentId, req.user.id, proposalId);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.message === 'Comment not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('Only comment author')) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/collaboration/comments/:commentId/resolve
 * Resolve a comment thread
 */
router.post('/comments/:commentId/resolve', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const result = await CommentService.resolveComment(commentId, req.user.id);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.message === 'Comment not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/collaboration/comments/:commentId/unresolve
 * Unresolve a comment thread
 */
router.post('/comments/:commentId/unresolve', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const result = await CommentService.unresolveComment(commentId, req.user.id);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.message === 'Comment not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/collaboration/proposals/:id/comment-counts
 * Get comment counts per section
 */
router.get('/proposals/:id/comment-counts', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id: proposalId } = req.params;

    const counts = await CommentService.getCommentCounts(proposalId);

    res.json({
      success: true,
      data: counts,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// PLATFORM TENDER - AI DRAFTING
// ==========================================

/**
 * POST /api/collaboration/proposals/:id/sections/:sectionId/generate-draft
 * Generate AI draft for a section
 * Requires EDIT permission (not READ_AND_COMMENT)
 * Body: { customInstructions? }
 */
router.post(
  '/proposals/:id/sections/:sectionId/generate-draft',
  requireAuth,
  requireRole('BIDDER'),
  requireSectionPermission('EDIT'),
  aiRateLimiter,
  async (req, res, next) => {
    try {
      const { id: proposalId, sectionId } = req.params;
      const { customInstructions } = req.body;

      // Double-check permission at service layer
      const permission = req.sectionPermission;
      if (permission !== 'OWNER' && permission !== 'EDIT') {
        return res.status(403).json({
          error: 'Insufficient permission',
          message: 'You have comment-only access to this section. AI drafting is only available with edit permission.',
          required: 'EDIT',
          actual: permission,
        });
      }

      const result = await CollaborativeDrafterService.generateSectionDraft({
        proposalId,
        sectionId,
        userId: req.user.id,
        customInstructions,
        tenderType: 'platform',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('[AI Draft] Error:', err.message);
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

// ==========================================
// PLATFORM TENDER - VALIDATION
// ==========================================

/**
 * POST /api/collaboration/proposals/:id/validate
 * Validate proposal against tender requirements
 */
router.post(
  '/proposals/:id/validate',
  requireAuth,
  requireRole('BIDDER'),
  requireProposalOwner(),
  aiRateLimiter,
  async (req, res, next) => {
    try {
      const { id: proposalId } = req.params;

      const result = await CollaborativeDrafterService.validateProposal(
        proposalId,
        req.user.id,
        'platform'
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('[Validate] Error:', err.message);
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

// ==========================================
// PLATFORM TENDER - ACTIVITY
// ==========================================

/**
 * GET /api/collaboration/proposals/:id/activity
 * Get activity log for a proposal
 */
router.get(
  '/proposals/:id/activity',
  requireAuth,
  requireRole('BIDDER'),
  requireSectionPermission('READ_ONLY'),
  async (req, res, next) => {
    try {
      const { id: proposalId } = req.params;
      const { limit = 50 } = req.query;

      const activity = await CollaborationService.getProposalActivity(proposalId, parseInt(limit));

      res.json({
        success: true,
        data: activity,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// UPLOADED TENDER - SECTION ASSIGNMENTS
// ==========================================

/**
 * GET /api/collaboration/uploaded-tenders/:uploadedTenderId/assignments
 * Get assignments for an uploaded tender
 */
router.get(
  '/uploaded-tenders/:uploadedTenderId/assignments',
  requireAuth,
  requireRole('BIDDER'),
  async (req, res, next) => {
    try {
      const { uploadedTenderId } = req.params;

      const data = await CollaborationService.loadUploadedCollaborationData(
        uploadedTenderId,
        req.user.id
      );

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

/**
 * POST /api/collaboration/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/assign
 * Assign user to an uploaded tender section
 */
router.post(
  '/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/assign',
  requireAuth,
  requireRole('BIDDER'),
  requireUploadedTenderOwner(),
  async (req, res, next) => {
    try {
      const { uploadedTenderId, sectionKey } = req.params;
      const { userId, permission } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      if (!['EDIT', 'READ_AND_COMMENT'].includes(permission)) {
        return res.status(400).json({
          error: 'Invalid permission. Must be EDIT or READ_AND_COMMENT',
        });
      }

      const assignment = await CollaborationService.assignUserToUploadedSection(
        uploadedTenderId,
        sectionKey,
        userId,
        permission,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'User assigned to section',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/collaboration/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/users/:userId
 * Remove user from uploaded tender section
 */
router.delete(
  '/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/users/:userId',
  requireAuth,
  requireRole('BIDDER'),
  requireUploadedTenderOwner(),
  async (req, res, next) => {
    try {
      const { uploadedTenderId, sectionKey, userId } = req.params;

      await CollaborationService.removeUserFromUploadedSection(
        uploadedTenderId,
        sectionKey,
        userId
      );

      res.json({
        success: true,
        message: 'User removed from section',
      });
    } catch (err) {
      if (err.message === 'Assignment not found') {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

// ==========================================
// UPLOADED TENDER - COMMENTS
// ==========================================

/**
 * GET /api/collaboration/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/comments
 */
router.get(
  '/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/comments',
  requireAuth,
  requireRole('BIDDER'),
  requireUploadedSectionPermission('READ_ONLY'),
  async (req, res, next) => {
    try {
      const { uploadedTenderId, sectionKey } = req.params;

      const comments = await CommentService.getUploadedCommentsBySection(
        uploadedTenderId,
        sectionKey
      );

      res.json({
        success: true,
        data: comments,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/collaboration/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/comments
 */
router.post(
  '/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/comments',
  requireAuth,
  requireRole('BIDDER'),
  requireUploadedSectionPermission('READ_AND_COMMENT'),
  async (req, res, next) => {
    try {
      const { uploadedTenderId, sectionKey } = req.params;
      const { content, parentCommentId, quotedText } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      const comment = await CommentService.createUploadedComment({
        uploadedTenderId,
        sectionKey,
        userId: req.user.id,
        content,
        parentCommentId,
        quotedText,
      });

      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('same section')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  }
);

// ==========================================
// UPLOADED TENDER - AI DRAFTING
// ==========================================

/**
 * POST /api/collaboration/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/generate-draft
 * Generate AI draft for uploaded tender section
 * Requires EDIT permission (not READ_AND_COMMENT)
 */
router.post(
  '/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/generate-draft',
  requireAuth,
  requireRole('BIDDER'),
  requireUploadedSectionPermission('EDIT'),
  aiRateLimiter,
  async (req, res, next) => {
    try {
      const { uploadedTenderId, sectionKey } = req.params;
      const { customInstructions } = req.body;

      // Double-check permission at service layer
      const permission = req.sectionPermission;
      if (permission !== 'OWNER' && permission !== 'EDIT') {
        return res.status(403).json({
          error: 'Insufficient permission',
          message: 'You have comment-only access to this section. AI drafting is only available with edit permission.',
          required: 'EDIT',
          actual: permission,
        });
      }

      const result = await CollaborativeDrafterService.generateSectionDraft({
        proposalId: null,
        sectionId: sectionKey, // sectionKey is used as sectionId for uploaded tenders
        userId: req.user.id,
        customInstructions,
        tenderType: 'uploaded',
        uploadedTenderId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('[AI Draft Uploaded] Error:', err.message);
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

// ==========================================
// UPLOADED TENDER - VALIDATION
// ==========================================

/**
 * POST /api/collaboration/uploaded-tenders/:uploadedTenderId/validate
 */
router.post(
  '/uploaded-tenders/:uploadedTenderId/validate',
  requireAuth,
  requireRole('BIDDER'),
  requireUploadedTenderOwner(),
  aiRateLimiter,
  async (req, res, next) => {
    try {
      const { uploadedTenderId } = req.params;

      const result = await CollaborativeDrafterService.validateProposal(
        null,
        req.user.id,
        'uploaded',
        uploadedTenderId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('[Validate Uploaded] Error:', err.message);
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

export default router;
