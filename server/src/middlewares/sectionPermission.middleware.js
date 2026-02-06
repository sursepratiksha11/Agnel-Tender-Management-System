/**
 * Section Permission Middleware
 * Enforces section-level access control for collaborative proposal drafting
 *
 * Permission Hierarchy:
 * - OWNER: Full access (user's organization owns the proposal)
 * - EDIT: Can edit content and use AI drafting
 * - READ_AND_COMMENT: Can only view and add comments
 * - READ_ONLY: Can only view (not explicitly assigned)
 */

import { CollaborationService } from '../services/collaboration.service.js';

// Permission levels (higher number = more access)
const PERMISSION_LEVELS = {
  OWNER: 4,
  EDIT: 3,
  READ_AND_COMMENT: 2,
  READ_ONLY: 1,
  NONE: 0,
};

/**
 * Check if user has required permission for a proposal section
 * @param {string} requiredPermission - 'EDIT' | 'READ_AND_COMMENT' | 'READ_ONLY'
 */
export function requireSectionPermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { id: proposalId, sectionId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!proposalId) {
        return res.status(400).json({ error: 'Proposal ID is required' });
      }

      // Check if user's organization owns the proposal (OWNER permission)
      const isOwner = await CollaborationService.isProposalOwner(userId, proposalId);

      if (isOwner) {
        req.sectionPermission = 'OWNER';
        req.isProposalOwner = true;
        return next();
      }

      // If not owner and sectionId is required, check section-specific permission
      if (sectionId) {
        const permission = await CollaborationService.checkSectionPermission(userId, proposalId, sectionId);

        if (!permission) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You are not assigned to this section',
          });
        }

        // Check if permission level is sufficient
        const userLevel = PERMISSION_LEVELS[permission] || 0;
        const requiredLevel = PERMISSION_LEVELS[requiredPermission] || 0;

        if (userLevel < requiredLevel) {
          return res.status(403).json({
            error: 'Insufficient permission',
            message: `This action requires ${requiredPermission} permission. You have ${permission}.`,
            required: requiredPermission,
            actual: permission,
          });
        }

        req.sectionPermission = permission;
        req.isProposalOwner = false;
        return next();
      }

      // No section ID - check if user has any assignment on this proposal
      const userPermissions = await CollaborationService.getUserPermissions(userId, proposalId);
      const hasAnyAssignment = Object.keys(userPermissions).length > 0;

      if (!hasAnyAssignment && requiredPermission !== 'READ_ONLY') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You are not assigned to any sections in this proposal',
        });
      }

      req.sectionPermission = 'READ_ONLY';
      req.isProposalOwner = false;
      req.userSectionPermissions = userPermissions;
      next();

    } catch (err) {
      console.error('[SectionPermission] Error:', err.message);
      next(err);
    }
  };
}

/**
 * Check if user is the proposal owner
 * Use this for actions that only the owner can perform (assignments, validation, etc.)
 */
export function requireProposalOwner() {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { id: proposalId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!proposalId) {
        return res.status(400).json({ error: 'Proposal ID is required' });
      }

      const isOwner = await CollaborationService.isProposalOwner(userId, proposalId);

      if (!isOwner) {
        return res.status(403).json({
          error: 'Owner access required',
          message: 'Only the proposal owner can perform this action',
        });
      }

      req.isProposalOwner = true;
      next();

    } catch (err) {
      console.error('[ProposalOwner] Error:', err.message);
      next(err);
    }
  };
}

/**
 * Check uploaded tender section permission
 */
export function requireUploadedSectionPermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { uploadedTenderId, sectionKey } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!uploadedTenderId) {
        return res.status(400).json({ error: 'Uploaded tender ID is required' });
      }

      // Check ownership
      const isOwner = await CollaborationService.isUploadedTenderOwner(userId, uploadedTenderId);

      if (isOwner) {
        req.sectionPermission = 'OWNER';
        req.isProposalOwner = true;
        return next();
      }

      // Check section permission if sectionKey provided
      if (sectionKey) {
        const permission = await CollaborationService.checkUploadedSectionPermission(
          userId,
          uploadedTenderId,
          sectionKey
        );

        if (!permission) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You are not assigned to this section',
          });
        }

        const userLevel = PERMISSION_LEVELS[permission] || 0;
        const requiredLevel = PERMISSION_LEVELS[requiredPermission] || 0;

        if (userLevel < requiredLevel) {
          return res.status(403).json({
            error: 'Insufficient permission',
            message: `This action requires ${requiredPermission} permission. You have ${permission}.`,
            required: requiredPermission,
            actual: permission,
          });
        }

        req.sectionPermission = permission;
        req.isProposalOwner = false;
        return next();
      }

      // No section key - general access
      req.sectionPermission = 'READ_ONLY';
      req.isProposalOwner = false;
      next();

    } catch (err) {
      console.error('[UploadedSectionPermission] Error:', err.message);
      next(err);
    }
  };
}

/**
 * Check uploaded tender ownership
 */
export function requireUploadedTenderOwner() {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { uploadedTenderId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!uploadedTenderId) {
        return res.status(400).json({ error: 'Uploaded tender ID is required' });
      }

      const isOwner = await CollaborationService.isUploadedTenderOwner(userId, uploadedTenderId);

      if (!isOwner) {
        return res.status(403).json({
          error: 'Owner access required',
          message: 'Only the tender owner can perform this action',
        });
      }

      req.isProposalOwner = true;
      next();

    } catch (err) {
      console.error('[UploadedTenderOwner] Error:', err.message);
      next(err);
    }
  };
}

export default {
  requireSectionPermission,
  requireProposalOwner,
  requireUploadedSectionPermission,
  requireUploadedTenderOwner,
  PERMISSION_LEVELS,
};
