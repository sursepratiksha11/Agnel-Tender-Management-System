/**
 * Collaboration Service
 * Handles section assignments, user search, and permission management
 * for collaborative proposal drafting
 */

import { pool } from '../config/db.js';

export const CollaborationService = {
  // ==========================================
  // USER SEARCH
  // ==========================================

  /**
   * Search users by email within the same organization
   * Returns: [{user_id, name, email, role}] - filtered to ASSISTER role
   */
  async searchUsersByEmail(email, organizationId, limit = 10) {
    if (!email || email.length < 3) {
      return [];
    }

    const result = await pool.query(
      `SELECT user_id, name, email, role
       FROM "user"
       WHERE organization_id = $1
         AND role = 'ASSISTER'
         AND LOWER(email) LIKE LOWER($2)
       ORDER BY name ASC
       LIMIT $3`,
      [organizationId, `%${email}%`, limit]
    );

    return result.rows;
  },

  /**
   * Search assisters by email across all organizations
   * Returns: [{user_id, name, email, role}] - filtered to ASSISTER role
   */
  async searchAssistersByEmail(email, limit = 10) {
    if (!email || email.length < 3) {
      return [];
    }

    const result = await pool.query(
      `SELECT user_id, name, email, role
       FROM "user"
       WHERE role = 'ASSISTER'
         AND LOWER(email) LIKE LOWER($1)
       ORDER BY name ASC
       LIMIT $2`,
      [`%${email}%`, limit]
    );

    return result.rows;
  },

  /**
   * Get user by ID (for display purposes)
   * Returns: {user_id, name, email} - NO roles
   */
  async getUserById(userId) {
    const result = await pool.query(
      `SELECT user_id, name, email
       FROM "user"
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  // ==========================================
  // PLATFORM TENDER ASSIGNMENTS
  // ==========================================

  /**
   * Assign a user to a proposal section
   */
  async assignUserToSection(proposalId, sectionId, userId, permission, assignedBy) {
    // Validate permission value
    if (!['EDIT', 'READ_AND_COMMENT'].includes(permission)) {
      throw new Error('Invalid permission. Must be EDIT or READ_AND_COMMENT');
    }

    // Verify section belongs to the tender of this proposal
    const validation = await pool.query(
      `SELECT p.proposal_id, ts.section_id
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       JOIN tender_section ts ON ts.tender_id = t.tender_id
       WHERE p.proposal_id = $1 AND ts.section_id = $2`,
      [proposalId, sectionId]
    );

    if (validation.rows.length === 0) {
      throw new Error('Section does not belong to this proposal\'s tender');
    }

    // Upsert assignment (update if exists, insert if not)
    const result = await pool.query(
      `INSERT INTO proposal_collaborator (proposal_id, section_id, user_id, permission, assigned_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (proposal_id, section_id, user_id)
       DO UPDATE SET permission = $4, assigned_by = $5, assigned_at = NOW()
       RETURNING *`,
      [proposalId, sectionId, userId, permission, assignedBy]
    );

    // Log activity
    await this.logActivity(proposalId, sectionId, assignedBy, 'ASSIGN', {
      assignedUserId: userId,
      permission,
    });

    // Get user details for response
    const user = await this.getUserById(userId);

    return {
      ...result.rows[0],
      user,
    };
  },

  /**
   * Remove user assignment from a section
   */
  async removeUserFromSection(proposalId, sectionId, userId, removedBy) {
    const result = await pool.query(
      `DELETE FROM proposal_collaborator
       WHERE proposal_id = $1 AND section_id = $2 AND user_id = $3
       RETURNING *`,
      [proposalId, sectionId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Assignment not found');
    }

    // Log activity
    await this.logActivity(proposalId, sectionId, removedBy, 'UNASSIGN', {
      removedUserId: userId,
    });

    return result.rows[0];
  },

  /**
   * Get all section assignments for a proposal
   */
  async getSectionAssignments(proposalId) {
    const result = await pool.query(
      `SELECT pc.collaborator_id, pc.section_id, pc.user_id, pc.permission, pc.assigned_at,
              u.name, u.email
       FROM proposal_collaborator pc
       JOIN "user" u ON pc.user_id = u.user_id
       WHERE pc.proposal_id = $1
       ORDER BY pc.section_id, u.name`,
      [proposalId]
    );

    // Group by section
    const sections = {};
    result.rows.forEach(row => {
      if (!sections[row.section_id]) {
        sections[row.section_id] = [];
      }
      sections[row.section_id].push({
        collaborator_id: row.collaborator_id,
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        permission: row.permission,
        assigned_at: row.assigned_at,
      });
    });

    return sections;
  },

  /**
   * Get user's permissions for all sections of a proposal
   */
  async getUserPermissions(userId, proposalId) {
    const result = await pool.query(
      `SELECT section_id, permission
       FROM proposal_collaborator
       WHERE proposal_id = $1 AND user_id = $2`,
      [proposalId, userId]
    );

    const permissions = {};
    result.rows.forEach(row => {
      permissions[row.section_id] = row.permission;
    });

    return permissions;
  },

  /**
   * Check user's permission for a specific section
   * Returns: 'OWNER' | 'EDIT' | 'READ_AND_COMMENT' | null
   */
  async checkSectionPermission(userId, proposalId, sectionId) {
    // First check if user is owner (belongs to organization that owns the proposal)
    const isOwner = await this.isProposalOwner(userId, proposalId);
    if (isOwner) {
      return 'OWNER';
    }

    // Check section-specific assignment
    const result = await pool.query(
      `SELECT permission
       FROM proposal_collaborator
       WHERE proposal_id = $1 AND section_id = $2 AND user_id = $3`,
      [proposalId, sectionId, userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].permission;
    }

    return null;
  },

  /**
   * Check if user's organization owns the proposal
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

  /**
   * Get proposal with ownership info
   */
  async getProposalWithOwnership(proposalId, userId) {
    const result = await pool.query(
      `SELECT p.*, t.title as tender_title, t.tender_id,
              (p.organization_id = u.organization_id) as is_owner
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       JOIN "user" u ON u.user_id = $2
       WHERE p.proposal_id = $1`,
      [proposalId, userId]
    );

    return result.rows[0] || null;
  },

  // ==========================================
  // UPLOADED TENDER ASSIGNMENTS
  // ==========================================

  /**
   * Assign user to an uploaded tender proposal section
   */
  async assignUserToUploadedSection(uploadedTenderId, sectionKey, userId, permission, assignedBy) {
    if (!['EDIT', 'READ_AND_COMMENT'].includes(permission)) {
      throw new Error('Invalid permission. Must be EDIT or READ_AND_COMMENT');
    }

    const result = await pool.query(
      `INSERT INTO uploaded_proposal_collaborator (uploaded_tender_id, section_key, user_id, permission, assigned_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (uploaded_tender_id, section_key, user_id)
       DO UPDATE SET permission = $4, assigned_by = $5, assigned_at = NOW()
       RETURNING *`,
      [uploadedTenderId, sectionKey, userId, permission, assignedBy]
    );

    const user = await this.getUserById(userId);

    return {
      ...result.rows[0],
      user,
    };
  },

  /**
   * Remove user from uploaded tender section
   */
  async removeUserFromUploadedSection(uploadedTenderId, sectionKey, userId) {
    const result = await pool.query(
      `DELETE FROM uploaded_proposal_collaborator
       WHERE uploaded_tender_id = $1 AND section_key = $2 AND user_id = $3
       RETURNING *`,
      [uploadedTenderId, sectionKey, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Assignment not found');
    }

    return result.rows[0];
  },

  /**
   * Get all section assignments for an uploaded tender
   */
  async getUploadedSectionAssignments(uploadedTenderId) {
    const result = await pool.query(
      `SELECT upc.collaborator_id, upc.section_key, upc.user_id, upc.permission, upc.assigned_at,
              u.name, u.email
       FROM uploaded_proposal_collaborator upc
       JOIN "user" u ON upc.user_id = u.user_id
       WHERE upc.uploaded_tender_id = $1
       ORDER BY upc.section_key, u.name`,
      [uploadedTenderId]
    );

    // Group by section_key
    const sections = {};
    result.rows.forEach(row => {
      if (!sections[row.section_key]) {
        sections[row.section_key] = [];
      }
      sections[row.section_key].push({
        collaborator_id: row.collaborator_id,
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        permission: row.permission,
        assigned_at: row.assigned_at,
      });
    });

    return sections;
  },

  /**
   * Check user's permission for an uploaded tender section
   */
  async checkUploadedSectionPermission(userId, uploadedTenderId, sectionKey) {
    // Check if user owns the uploaded tender
    const isOwner = await this.isUploadedTenderOwner(userId, uploadedTenderId);
    if (isOwner) {
      return 'OWNER';
    }

    // Check section-specific assignment
    const result = await pool.query(
      `SELECT permission
       FROM uploaded_proposal_collaborator
       WHERE uploaded_tender_id = $1 AND section_key = $2 AND user_id = $3`,
      [uploadedTenderId, sectionKey, userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].permission;
    }

    return null;
  },

  /**
   * Check if user's organization owns the uploaded tender
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

  /**
   * Get uploaded tender with ownership info
   */
  async getUploadedTenderWithOwnership(uploadedTenderId, userId) {
    const result = await pool.query(
      `SELECT ut.*,
              (ut.organization_id = u.organization_id) as is_owner
       FROM uploaded_tender ut
       JOIN "user" u ON u.user_id = $2
       WHERE ut.id = $1`,
      [uploadedTenderId, userId]
    );

    return result.rows[0] || null;
  },

  // ==========================================
  // ACTIVITY LOGGING
  // ==========================================

  /**
   * Log an activity on a proposal section
   */
  async logActivity(proposalId, sectionId, userId, activityType, metadata = {}) {
    await pool.query(
      `INSERT INTO proposal_section_activity (proposal_id, section_id, user_id, activity_type, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [proposalId, sectionId, userId, activityType, JSON.stringify(metadata)]
    );
  },

  /**
   * Get activity log for a proposal
   */
  async getProposalActivity(proposalId, limit = 50) {
    const result = await pool.query(
      `SELECT psa.*, u.name as user_name, u.email as user_email,
              ts.title as section_title
       FROM proposal_section_activity psa
       JOIN "user" u ON psa.user_id = u.user_id
       LEFT JOIN tender_section ts ON psa.section_id = ts.section_id
       WHERE psa.proposal_id = $1
       ORDER BY psa.created_at DESC
       LIMIT $2`,
      [proposalId, limit]
    );

    return result.rows;
  },

  /**
   * Get last edit info for each section
   */
  async getSectionLastEdits(proposalId) {
    const result = await pool.query(
      `SELECT DISTINCT ON (psa.section_id)
              psa.section_id, psa.user_id, psa.created_at,
              u.name as user_name
       FROM proposal_section_activity psa
       JOIN "user" u ON psa.user_id = u.user_id
       WHERE psa.proposal_id = $1 AND psa.activity_type = 'EDIT'
       ORDER BY psa.section_id, psa.created_at DESC`,
      [proposalId]
    );

    const lastEdits = {};
    result.rows.forEach(row => {
      lastEdits[row.section_id] = {
        user_id: row.user_id,
        user_name: row.user_name,
        edited_at: row.created_at,
      };
    });

    return lastEdits;
  },

  // ==========================================
  // COMPREHENSIVE DATA LOADING
  // ==========================================

  /**
   * Load all collaboration data for a proposal
   * Used by frontend to initialize collaboration state
   */
  async loadCollaborationData(proposalId, userId) {
    const [
      proposalInfo,
      assignments,
      userPermissions,
      lastEdits,
      recentActivity,
    ] = await Promise.all([
      this.getProposalWithOwnership(proposalId, userId),
      this.getSectionAssignments(proposalId),
      this.getUserPermissions(userId, proposalId),
      this.getSectionLastEdits(proposalId),
      this.getProposalActivity(proposalId, 20),
    ]);

    if (!proposalInfo) {
      throw new Error('Proposal not found');
    }

    return {
      isOwner: proposalInfo.is_owner,
      proposal: {
        id: proposalInfo.proposal_id,
        tenderId: proposalInfo.tender_id,
        tenderTitle: proposalInfo.tender_title,
        status: proposalInfo.status,
      },
      assignments,
      userPermissions,
      lastEdits,
      recentActivity,
    };
  },

  /**
   * Load all collaboration data for an uploaded tender
   */
  async loadUploadedCollaborationData(uploadedTenderId, userId) {
    const [
      tenderInfo,
      assignments,
    ] = await Promise.all([
      this.getUploadedTenderWithOwnership(uploadedTenderId, userId),
      this.getUploadedSectionAssignments(uploadedTenderId),
    ]);

    if (!tenderInfo) {
      throw new Error('Uploaded tender not found');
    }

    // Get user permissions from assignments
    const userPermissions = {};
    Object.entries(assignments).forEach(([sectionKey, users]) => {
      const userAssignment = users.find(u => u.user_id === userId);
      if (userAssignment) {
        userPermissions[sectionKey] = userAssignment.permission;
      }
    });

    return {
      isOwner: tenderInfo.is_owner,
      tender: {
        id: tenderInfo.id,
        title: tenderInfo.title,
        filename: tenderInfo.filename,
        status: tenderInfo.status,
      },
      assignments,
      userPermissions,
    };
  },
};

export default CollaborationService;
