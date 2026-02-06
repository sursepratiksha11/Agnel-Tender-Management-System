/**
 * Reviewer / Commenter Routes
 * Handles reviewer and commenter endpoints:
 * - Get all assignments for the logged-in user
 * - Access section content based on section permissions
 *
 * IMPORTANT: Uses section assignment permissions (EDIT / READ_AND_COMMENT)
 * NOT user role. Roles are for routing only.
 */

import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { pool } from '../config/db.js';
import { PermissionService } from '../services/permission.service.js';

const router = Router();

/**
 * GET /api/reviewer/assignments
 * Get all section assignments for the current reviewer/commenter
 * No role requirement - works for REVIEWER and COMMENTER roles
 */
router.get('/assignments', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get platform tender assignments
    const platformAssignments = await pool.query(
      `SELECT
        pc.collaborator_id,
        pc.section_id,
        pc.permission,
        pc.assigned_at,
        'platform' as tender_type,
        p.proposal_id,
        p.status as proposal_status,
        t.title as tender_title,
        ts.title as section_title,
        o.name as organization_name,
        NULL as uploaded_tender_id,
        NULL as section_key
       FROM proposal_collaborator pc
       JOIN proposal p ON pc.proposal_id = p.proposal_id
       JOIN tender t ON p.tender_id = t.tender_id
       JOIN tender_section ts ON pc.section_id = ts.section_id
       JOIN organization o ON p.organization_id = o.organization_id
       WHERE pc.user_id = $1
       ORDER BY pc.assigned_at DESC`,
      [userId]
    );

    // Get uploaded tender assignments
    const uploadedAssignments = await pool.query(
      `SELECT
        upc.collaborator_id,
        upc.section_key as section_id,
        upc.permission,
        upc.assigned_at,
        'uploaded' as tender_type,
        NULL as proposal_id,
        ut.status as proposal_status,
        ut.title as tender_title,
        upc.section_key as section_title,
        o.name as organization_name,
        upc.uploaded_tender_id,
        upc.section_key
       FROM uploaded_proposal_collaborator upc
       JOIN uploaded_tender ut ON upc.uploaded_tender_id = ut.id
       JOIN organization o ON ut.organization_id = o.organization_id
       WHERE upc.user_id = $1
       ORDER BY upc.assigned_at DESC`,
      [userId]
    );

    // Combine assignments
    const allAssignments = [
      ...platformAssignments.rows,
      ...uploadedAssignments.rows,
    ].sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));

    // Calculate stats
    const stats = {
      total: allAssignments.length,
      canEdit: allAssignments.filter(a => a.permission === 'EDIT').length,
      canComment: allAssignments.filter(a => a.permission === 'READ_AND_COMMENT').length,
      completed: 0, // Would need additional tracking for this
    };

    res.json({
      success: true,
      data: {
        assignments: allAssignments,
        stats,
      },
      message: allAssignments.length === 0 ? 'No sections allotted yet' : undefined,
    });
  } catch (err) {
    console.error('[Reviewer/Commenter] Get assignments error:', err);
    next(err);
  }
});

/**
 * GET /api/reviewer/proposals/:proposalId/sections/:sectionId
 * Get section content for review/comment (platform tender)
 * Requires EDIT or READ_AND_COMMENT permission
 */
router.get('/proposals/:proposalId/sections/:sectionId', requireAuth, async (req, res, next) => {
  try {
    const { proposalId, sectionId } = req.params;
    const userId = req.user.id;

    // Check if user has permission for this section
    const permissionCheck = await pool.query(
      `SELECT permission FROM proposal_collaborator
       WHERE proposal_id = $1 AND section_id = $2 AND user_id = $3`,
      [proposalId, sectionId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not assigned to this section',
      });
    }

    const permission = permissionCheck.rows[0].permission;

    // Get section content
    const sectionResult = await pool.query(
      `SELECT
        ts.section_id,
        ts.title,
        ts.content as requirements,
        ts.is_mandatory,
        psr.content as draft_content,
        psr.updated_at as last_updated,
        t.title as tender_title,
        p.proposal_id,
        p.status as proposal_status
       FROM tender_section ts
       JOIN tender t ON ts.tender_id = t.tender_id
       JOIN proposal p ON p.tender_id = t.tender_id
       LEFT JOIN proposal_section_response psr ON psr.proposal_id = p.proposal_id AND psr.section_id = ts.section_id
       WHERE p.proposal_id = $1 AND ts.section_id = $2`,
      [proposalId, sectionId]
    );

    if (sectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({
      success: true,
      data: {
        ...sectionResult.rows[0],
        permission,
        canEdit: permission === 'EDIT',
        canComment: ['EDIT', 'READ_AND_COMMENT'].includes(permission),
      },
    });
  } catch (err) {
    console.error('[Reviewer/Commenter] Get section error:', err);
    next(err);
  }
});

/**
 * PUT /api/reviewer/proposals/:proposalId/sections/:sectionId
 * Update section content (requires EDIT permission)
 */
router.put('/proposals/:proposalId/sections/:sectionId', requireAuth, async (req, res, next) => {
  try {
    const { proposalId, sectionId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Check if user has EDIT permission
    const permissionCheck = await pool.query(
      `SELECT permission FROM proposal_collaborator
       WHERE proposal_id = $1 AND section_id = $2 AND user_id = $3`,
      [proposalId, sectionId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not assigned to this section',
      });
    }

    if (permissionCheck.rows[0].permission !== 'EDIT') {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'You have comment-only access to this section. You cannot edit content.',
      });
    }

    // Update or insert section content
    const result = await pool.query(
      `INSERT INTO proposal_section_response (proposal_id, section_id, content, last_edited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (proposal_id, section_id)
       DO UPDATE SET content = $3, last_edited_by = $4, updated_at = NOW()
       RETURNING *`,
      [proposalId, sectionId, content, userId]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Section updated successfully',
    });
  } catch (err) {
    console.error('[Reviewer/Commenter] Update section error:', err);
    next(err);
  }
});

/**
 * GET /api/reviewer/uploaded-tenders/:uploadedTenderId/sections/:sectionKey
 * Get section content for review/comment (uploaded tender)
 * Requires EDIT or READ_AND_COMMENT permission
 */
router.get('/uploaded-tenders/:uploadedTenderId/sections/:sectionKey', requireAuth, async (req, res, next) => {
  try {
    const { uploadedTenderId, sectionKey } = req.params;
    const userId = req.user.id;

    // Check permission
    const permissionCheck = await pool.query(
      `SELECT permission FROM uploaded_proposal_collaborator
       WHERE uploaded_tender_id = $1 AND section_key = $2 AND user_id = $3`,
      [uploadedTenderId, sectionKey, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not assigned to this section',
      });
    }

    const permission = permissionCheck.rows[0].permission;

    // Get uploaded tender info and section content
    const tenderResult = await pool.query(
      `SELECT
        ut.id as uploaded_tender_id,
        ut.title as tender_title,
        ut.status,
        ut.analysis_data
       FROM uploaded_tender ut
       WHERE ut.id = $1`,
      [uploadedTenderId]
    );

    if (tenderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const tender = tenderResult.rows[0];
    const analysisData = tender.analysis_data || {};

    // Find section in normalizedSections
    const normalizedSections = analysisData.normalizedSections || [];
    const section = normalizedSections.find(s => s.key === sectionKey) || {};

    // Get draft content if exists
    const draftResult = await pool.query(
      `SELECT content, updated_at FROM uploaded_proposal_draft
       WHERE uploaded_tender_id = $1 AND section_key = $2`,
      [uploadedTenderId, sectionKey]
    );

    const draft = draftResult.rows[0] || {};

    res.json({
      success: true,
      data: {
        uploaded_tender_id: uploadedTenderId,
        section_key: sectionKey,
        title: section.name || section.title || sectionKey,
        requirements: section.aiSummary || section.content || '',
        draft_content: draft.content || '',
        last_updated: draft.updated_at,
        tender_title: tender.title,
        permission,
        canEdit: permission === 'EDIT',
        canComment: ['EDIT', 'READ_AND_COMMENT'].includes(permission),
      },
    });
  } catch (err) {
    console.error('[Reviewer/Commenter] Get uploaded section error:', err);
    next(err);
  }
});

/**
 * PUT /api/reviewer/uploaded-tenders/:uploadedTenderId/sections/:sectionKey
 * Update uploaded tender section content (requires EDIT permission)
 */
router.put('/uploaded-tenders/:uploadedTenderId/sections/:sectionKey', requireAuth, async (req, res, next) => {
  try {
    const { uploadedTenderId, sectionKey } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Check EDIT permission
    const permissionCheck = await pool.query(
      `SELECT permission FROM uploaded_proposal_collaborator
       WHERE uploaded_tender_id = $1 AND section_key = $2 AND user_id = $3`,
      [uploadedTenderId, sectionKey, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not assigned to this section',
      });
    }

    if (permissionCheck.rows[0].permission !== 'EDIT') {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'You have comment-only access to this section. You cannot edit content.',
      });
    }

    // Update or insert draft content
    const result = await pool.query(
      `INSERT INTO uploaded_proposal_draft (uploaded_tender_id, section_key, content, last_edited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (uploaded_tender_id, section_key)
       DO UPDATE SET content = $3, last_edited_by = $4, updated_at = NOW()
       RETURNING *`,
      [uploadedTenderId, sectionKey, content, userId]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Section updated successfully',
    });
  } catch (err) {
    console.error('[Reviewer/Commenter] Update uploaded section error:', err);
    next(err);
  }
});

// ==========================================
// REVIEWER/COMMENTER - COMMENTS
// ==========================================

/**
 * GET /api/reviewer/proposals/:proposalId/sections/:sectionId/comments
 * Get all comments for a platform tender section
 */
router.get('/proposals/:proposalId/sections/:sectionId/comments', requireAuth, async (req, res, next) => {
  try {
    const { proposalId, sectionId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this section
    const permissionCheck = await pool.query(
      `SELECT permission FROM proposal_collaborator
       WHERE proposal_id = $1 AND section_id = $2 AND user_id = $3`,
      [proposalId, sectionId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not assigned to this section',
      });
    }

    // Get all comments for the section
    const comments = await pool.query(
      `SELECT
        c.comment_id,
        c.content,
        c.created_at,
        c.updated_at,
        c.user_id,
        c.parent_comment_id,
        c.quoted_text,
        c.selection_start,
        c.selection_end,
        c.is_resolved,
        c.resolved_at,
        u.email,
        u.full_name
       FROM proposal_comment c
       JOIN "user" u ON c.user_id = u.user_id
       WHERE c.proposal_id = $1 AND c.section_id = $2
       ORDER BY c.created_at DESC`,
      [proposalId, sectionId]
    );

    res.json({
      success: true,
      data: comments.rows,
    });
  } catch (err) {
    console.error('[Reviewer/Commenter] Get comments error:', err);
    next(err);
  }
});

/**
 * POST /api/reviewer/proposals/:proposalId/sections/:sectionId/comments
 * Create a comment on a platform tender section
 * Body: { content, parentCommentId?, quotedText?, selectionStart?, selectionEnd? }
 */
router.post('/proposals/:proposalId/sections/:sectionId/comments', requireAuth, async (req, res, next) => {
  try {
    const { proposalId, sectionId } = req.params;
    const { content, parentCommentId, quotedText, selectionStart, selectionEnd } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify user has comment permission
    const permissionCheck = await pool.query(
      `SELECT permission FROM proposal_collaborator
       WHERE proposal_id = $1 AND section_id = $2 AND user_id = $3`,
      [proposalId, sectionId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not assigned to this section',
      });
    }

    // Verify permission is EDIT or READ_AND_COMMENT
    const permission = permissionCheck.rows[0].permission;
    if (!['EDIT', 'READ_AND_COMMENT'].includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permission',
        message: 'You do not have permission to comment on this section',
      });
    }

    // Create comment
    const result = await pool.query(
      `INSERT INTO proposal_comment (proposal_id, section_id, user_id, content, parent_comment_id, quoted_text, selection_start, selection_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [proposalId, sectionId, userId, content, parentCommentId || null, quotedText || null, selectionStart || null, selectionEnd || null]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Comment created successfully',
    });
  } catch (err) {
    console.error('[Reviewer/Commenter] Create comment error:', err);
    next(err);
  }
});

/**
 * GET /api/reviewer/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/comments
 * Get all comments for an uploaded tender section
 */
router.get('/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/comments', requireAuth, async (req, res, next) => {
  try {
    const { uploadedTenderId, sectionKey } = req.params;
    const userId = req.user.id;

    // Verify user has access
    const permissionCheck = await pool.query(
      `SELECT permission FROM uploaded_proposal_collaborator
       WHERE uploaded_tender_id = $1 AND section_key = $2 AND user_id = $3`,
      [uploadedTenderId, sectionKey, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not assigned to this section',
      });
    }

    // Get comments (using section_key as identifier)
    const comments = await pool.query(
      `SELECT
        c.comment_id,
        c.content,
        c.created_at,
        c.updated_at,
        c.user_id,
        c.parent_comment_id,
        c.quoted_text,
        c.selection_start,
        c.selection_end,
        c.is_resolved,
        c.resolved_at,
        u.email,
        u.full_name
       FROM uploaded_proposal_comment c
       JOIN "user" u ON c.user_id = u.user_id
       WHERE c.uploaded_tender_id = $1 AND c.section_key = $2
       ORDER BY c.created_at DESC`,
      [uploadedTenderId, sectionKey]
    );

    res.json({
      success: true,
      data: comments.rows,
    });
  } catch (err) {
    // Table might not exist yet, return empty array
    if (err.code === '42P01') {
      return res.json({
        success: true,
        data: [],
      });
    }
    console.error('[Reviewer/Commenter] Get uploaded comments error:', err);
    next(err);
  }
});

/**
 * POST /api/reviewer/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/comments
 * Create a comment on an uploaded tender section
 */
router.post('/uploaded-tenders/:uploadedTenderId/sections/:sectionKey/comments', requireAuth, async (req, res, next) => {
  try {
    const { uploadedTenderId, sectionKey } = req.params;
    const { content, parentCommentId, quotedText, selectionStart, selectionEnd } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify permission
    const permissionCheck = await pool.query(
      `SELECT permission FROM uploaded_proposal_collaborator
       WHERE uploaded_tender_id = $1 AND section_key = $2 AND user_id = $3`,
      [uploadedTenderId, sectionKey, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not assigned to this section',
      });
    }

    const permission = permissionCheck.rows[0].permission;
    if (!['EDIT', 'READ_AND_COMMENT'].includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permission',
        message: 'You do not have permission to comment on this section',
      });
    }

    // Create comment
    const result = await pool.query(
      `INSERT INTO uploaded_proposal_comment (uploaded_tender_id, section_key, user_id, content, parent_comment_id, quoted_text, selection_start, selection_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [uploadedTenderId, sectionKey, userId, content, parentCommentId || null, quotedText || null, selectionStart || null, selectionEnd || null]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Comment created successfully',
    });
  } catch (err) {
    // Table might not exist, create it
    if (err.code === '42P01') {
      console.log('[Reviewer/Commenter] uploaded_proposal_comment table does not exist yet');
      return res.status(501).json({
        error: 'Comment feature not yet available for uploaded tenders',
        message: 'Database table not initialized',
      });
    }
    console.error('[Reviewer/Commenter] Create uploaded comment error:', err);
    next(err);
  }
});

export default router;
