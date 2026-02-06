/**
 * Permission Service
 * Role-based permission helper functions for collaborative proposal drafting
 *
 * IMPORTANT: Roles are INTERNAL ONLY - never exposed in API responses
 * Permission checks use:
 * - user.role (internal database role)
 * - section assignment permissions (EDIT / READ_AND_COMMENT)
 *
 * Permission Hierarchy:
 * - OWNER: Full access (user's organization owns the entity)
 * - EDIT: Can edit content and use AI drafting
 * - READ_AND_COMMENT: Can view and add comments
 * - READ_ONLY: Can only view
 */

import { pool } from '../config/db.js';

// Permission levels (higher number = more access)
const PERMISSION_LEVELS = {
  OWNER: 4,
  EDIT: 3,
  READ_AND_COMMENT: 2,
  READ_ONLY: 1,
  NONE: 0,
};

// Internal roles (never exposed to UI)
const INTERNAL_ROLES = {
  AUTHORITY: 'authority',
  BIDDER: 'bidder',
};

export const PermissionService = {
  // ==========================================
  // SECTION PERMISSION CHECKS
  // ==========================================

  /**
   * Check if user can edit a section
   * @param {Object} user - User object with id, role, organizationId
   * @param {Object} section - Section with proposalId/uploadedTenderId and sectionId/sectionKey
   * @returns {Promise<boolean>}
   */
  async canEditSection(user, section) {
    if (!user?.id || !section) return false;

    const permission = await this.getSectionPermission(user, section);
    return permission === 'OWNER' || permission === 'EDIT';
  },

  /**
   * Check if user can comment on a section
   * @param {Object} user - User object with id, role, organizationId
   * @param {Object} section - Section with proposalId/uploadedTenderId and sectionId/sectionKey
   * @returns {Promise<boolean>}
   */
  async canCommentSection(user, section) {
    if (!user?.id || !section) return false;

    const permission = await this.getSectionPermission(user, section);
    const level = PERMISSION_LEVELS[permission] || 0;
    return level >= PERMISSION_LEVELS.READ_AND_COMMENT;
  },

  /**
   * Check if user can use AI assistance on a section
   * Same as edit permission - AI drafting requires EDIT access
   * @param {Object} user - User object with id, role, organizationId
   * @param {Object} section - Section with proposalId/uploadedTenderId and sectionId/sectionKey
   * @returns {Promise<boolean>}
   */
  async canUseAI(user, section) {
    return this.canEditSection(user, section);
  },

  /**
   * Check if user can view a section
   * @param {Object} user - User object with id, role, organizationId
   * @param {Object} section - Section with proposalId/uploadedTenderId and sectionId/sectionKey
   * @returns {Promise<boolean>}
   */
  async canViewSection(user, section) {
    if (!user?.id || !section) return false;

    const permission = await this.getSectionPermission(user, section);
    return permission !== null && permission !== 'NONE';
  },

  /**
   * Get user's permission level for a section
   * @param {Object} user - User object with id, role, organizationId
   * @param {Object} section - Section object
   * @returns {Promise<string|null>} - 'OWNER' | 'EDIT' | 'READ_AND_COMMENT' | 'READ_ONLY' | null
   */
  async getSectionPermission(user, section) {
    if (!user?.id) return null;

    // Platform tender section
    if (section.proposalId && section.sectionId) {
      return this.getProposalSectionPermission(user.id, section.proposalId, section.sectionId);
    }

    // Uploaded tender section
    if (section.uploadedTenderId && section.sectionKey) {
      return this.getUploadedSectionPermission(user.id, section.uploadedTenderId, section.sectionKey);
    }

    return null;
  },

  // ==========================================
  // PLATFORM TENDER PERMISSIONS
  // ==========================================

  /**
   * Get permission for a proposal section (platform tender)
   */
  async getProposalSectionPermission(userId, proposalId, sectionId) {
    // Check if user is owner (same organization)
    const ownerCheck = await pool.query(
      `SELECT 1
       FROM proposal p
       JOIN "user" u ON p.organization_id = u.organization_id
       WHERE p.proposal_id = $1 AND u.user_id = $2`,
      [proposalId, userId]
    );

    if (ownerCheck.rows.length > 0) {
      return 'OWNER';
    }

    // Check section assignment
    const assignmentCheck = await pool.query(
      `SELECT permission
       FROM proposal_collaborator
       WHERE proposal_id = $1 AND section_id = $2 AND user_id = $3`,
      [proposalId, sectionId, userId]
    );

    if (assignmentCheck.rows.length > 0) {
      return assignmentCheck.rows[0].permission;
    }

    return null;
  },

  /**
   * Check if user is proposal owner (organization membership)
   */
  async isProposalOwner(userId, proposalId) {
    const result = await pool.query(
      `SELECT 1
       FROM proposal p
       JOIN "user" u ON p.organization_id = u.organization_id
       WHERE p.proposal_id = $1 AND u.user_id = $2`,
      [proposalId, userId]
    );

    return result.rows.length > 0;
  },

  // ==========================================
  // UPLOADED TENDER PERMISSIONS
  // ==========================================

  /**
   * Get permission for an uploaded tender section
   */
  async getUploadedSectionPermission(userId, uploadedTenderId, sectionKey) {
    // Check if user is owner (same organization)
    const ownerCheck = await pool.query(
      `SELECT 1
       FROM uploaded_tender ut
       JOIN "user" u ON ut.organization_id = u.organization_id
       WHERE ut.id = $1 AND u.user_id = $2`,
      [uploadedTenderId, userId]
    );

    if (ownerCheck.rows.length > 0) {
      return 'OWNER';
    }

    // Check section assignment
    const assignmentCheck = await pool.query(
      `SELECT permission
       FROM uploaded_proposal_collaborator
       WHERE uploaded_tender_id = $1 AND section_key = $2 AND user_id = $3`,
      [uploadedTenderId, sectionKey, userId]
    );

    if (assignmentCheck.rows.length > 0) {
      return assignmentCheck.rows[0].permission;
    }

    return null;
  },

  /**
   * Check if user is uploaded tender owner
   */
  async isUploadedTenderOwner(userId, uploadedTenderId) {
    const result = await pool.query(
      `SELECT 1
       FROM uploaded_tender ut
       JOIN "user" u ON ut.organization_id = u.organization_id
       WHERE ut.id = $1 AND u.user_id = $2`,
      [uploadedTenderId, userId]
    );

    return result.rows.length > 0;
  },

  // ==========================================
  // ROLE-BASED CHECKS (INTERNAL ONLY)
  // ==========================================

  /**
   * Check if user has authority role (internal use only)
   * Used for admin-level actions like tender creation
   */
  isAuthority(user) {
    return user?.role?.toLowerCase() === INTERNAL_ROLES.AUTHORITY;
  },

  /**
   * Check if user has bidder role (internal use only)
   * Used for bidder-specific features
   */
  isBidder(user) {
    return user?.role?.toLowerCase() === INTERNAL_ROLES.BIDDER;
  },

  /**
   * Check if user can access a specific feature based on role
   * @param {Object} user - User object
   * @param {string} feature - Feature identifier
   * @returns {boolean}
   */
  canAccessFeature(user, feature) {
    if (!user?.role) return false;

    const roleFeatures = {
      [INTERNAL_ROLES.AUTHORITY]: [
        'tender_create',
        'tender_edit',
        'tender_delete',
        'bid_evaluation',
        'analytics',
        'admin_dashboard',
      ],
      [INTERNAL_ROLES.BIDDER]: [
        'proposal_create',
        'proposal_edit',
        'tender_view',
        'tender_analyze',
        'pdf_upload',
        'collaboration',
        'bidder_dashboard',
      ],
    };

    const userRole = user.role.toLowerCase();
    const allowedFeatures = roleFeatures[userRole] || [];

    return allowedFeatures.includes(feature);
  },

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  /**
   * Compare permission levels
   * @param {string} permission1
   * @param {string} permission2
   * @returns {number} - Positive if permission1 > permission2
   */
  comparePermissions(permission1, permission2) {
    const level1 = PERMISSION_LEVELS[permission1] || 0;
    const level2 = PERMISSION_LEVELS[permission2] || 0;
    return level1 - level2;
  },

  /**
   * Check if permission meets required level
   * @param {string} actualPermission
   * @param {string} requiredPermission
   * @returns {boolean}
   */
  meetsRequirement(actualPermission, requiredPermission) {
    return this.comparePermissions(actualPermission, requiredPermission) >= 0;
  },

  /**
   * Get highest permission from an array
   * @param {string[]} permissions
   * @returns {string}
   */
  getHighestPermission(permissions) {
    if (!permissions?.length) return 'NONE';

    return permissions.reduce((highest, current) => {
      return this.comparePermissions(current, highest) > 0 ? current : highest;
    }, permissions[0]);
  },

  // Export constants for external use
  PERMISSION_LEVELS,
};

export default PermissionService;
