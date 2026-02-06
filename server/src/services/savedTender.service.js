/**
 * Saved Tender Service
 * Handles saving/unsaving tenders for bidders (both platform and uploaded tenders)
 */
import { pool } from '../config/db.js';

export const SavedTenderService = {
  /**
   * Save a tender (platform or uploaded)
   * @param {Object} data - { tenderId?, uploadedTenderId? }
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Created saved tender record
   */
  async saveTender(data, userId, organizationId) {
    const { tenderId, uploadedTenderId } = data;

    if (!tenderId && !uploadedTenderId) {
      throw new Error('Either tenderId or uploadedTenderId is required');
    }

    if (tenderId && uploadedTenderId) {
      throw new Error('Cannot save both platform and uploaded tender at once');
    }

    // Check if already saved
    const existing = await this.isSaved(
      tenderId ? { tenderId } : { uploadedTenderId },
      userId
    );
    if (existing) {
      throw new Error('Tender is already saved');
    }

    const query = `
      INSERT INTO saved_tender (user_id, organization_id, tender_id, uploaded_tender_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      organizationId,
      tenderId || null,
      uploadedTenderId || null,
    ]);

    return this._transformRecord(result.rows[0]);
  },

  /**
   * Unsave a tender
   * @param {Object} data - { tenderId?, uploadedTenderId? }
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async unsaveTender(data, userId) {
    const { tenderId, uploadedTenderId } = data;

    let query;
    let values;

    if (tenderId) {
      query = `DELETE FROM saved_tender WHERE user_id = $1 AND tender_id = $2 RETURNING saved_tender_id`;
      values = [userId, tenderId];
    } else if (uploadedTenderId) {
      query = `DELETE FROM saved_tender WHERE user_id = $1 AND uploaded_tender_id = $2 RETURNING saved_tender_id`;
      values = [userId, uploadedTenderId];
    } else {
      throw new Error('Either tenderId or uploadedTenderId is required');
    }

    const result = await pool.query(query, values);
    return result.rows.length > 0;
  },

  /**
   * Toggle save status of a tender
   * @param {Object} data - { tenderId?, uploadedTenderId? }
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} { saved: boolean, savedTenderId?: string }
   */
  async toggleSave(data, userId, organizationId) {
    const isSaved = await this.isSaved(data, userId);

    if (isSaved) {
      await this.unsaveTender(data, userId);
      return { saved: false };
    } else {
      const saved = await this.saveTender(data, userId, organizationId);
      return { saved: true, savedTenderId: saved.id };
    }
  },

  /**
   * Check if a tender is saved
   * @param {Object} data - { tenderId?, uploadedTenderId? }
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async isSaved(data, userId) {
    const { tenderId, uploadedTenderId } = data;

    let query;
    let values;

    if (tenderId) {
      query = `SELECT 1 FROM saved_tender WHERE user_id = $1 AND tender_id = $2`;
      values = [userId, tenderId];
    } else if (uploadedTenderId) {
      query = `SELECT 1 FROM saved_tender WHERE user_id = $1 AND uploaded_tender_id = $2`;
      values = [userId, uploadedTenderId];
    } else {
      return false;
    }

    const result = await pool.query(query, values);
    return result.rows.length > 0;
  },

  /**
   * Get all saved tenders for a user with full tender details
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of saved tenders
   */
  async getSavedTenders(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    // Get saved platform tenders
    const platformQuery = `
      SELECT
        st.saved_tender_id,
        st.saved_at,
        t.tender_id as _id,
        t.title,
        t.description,
        t.status,
        t.submission_deadline as deadline,
        t.estimated_value as value,
        t.sector as category,
        t.created_at,
        o.name as organization_name,
        o.type as organization_type,
        false as is_uploaded,
        'PLATFORM' as source
      FROM saved_tender st
      JOIN tender t ON st.tender_id = t.tender_id
      JOIN organization o ON t.organization_id = o.organization_id
      WHERE st.user_id = $1 AND st.tender_id IS NOT NULL
    `;

    // Get saved uploaded tenders
    const uploadedQuery = `
      SELECT
        st.saved_tender_id,
        st.saved_at,
        ut.uploaded_tender_id as _id,
        ut.title,
        ut.description,
        ut.status,
        ut.submission_deadline as deadline,
        ut.estimated_value as value,
        ut.sector as category,
        ut.created_at,
        ut.authority_name as organization_name,
        'UPLOADED' as organization_type,
        true as is_uploaded,
        ut.source
      FROM saved_tender st
      JOIN uploaded_tender ut ON st.uploaded_tender_id = ut.uploaded_tender_id
      WHERE st.user_id = $1 AND st.uploaded_tender_id IS NOT NULL
    `;

    // Combine and sort by saved_at
    const combinedQuery = `
      (${platformQuery})
      UNION ALL
      (${uploadedQuery})
      ORDER BY saved_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(combinedQuery, [userId, limit, offset]);

    return result.rows.map(row => this._transformTenderRecord(row));
  },

  /**
   * Get count of saved tenders for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  async getCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM saved_tender WHERE user_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count) || 0;
  },

  /**
   * Get saved tender IDs for a user (for quick lookup)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { platformTenderIds: [], uploadedTenderIds: [] }
   */
  async getSavedIds(userId) {
    const result = await pool.query(
      `SELECT tender_id, uploaded_tender_id FROM saved_tender WHERE user_id = $1`,
      [userId]
    );

    const platformTenderIds = [];
    const uploadedTenderIds = [];

    result.rows.forEach(row => {
      if (row.tender_id) platformTenderIds.push(row.tender_id);
      if (row.uploaded_tender_id) uploadedTenderIds.push(row.uploaded_tender_id);
    });

    return { platformTenderIds, uploadedTenderIds };
  },

  /**
   * Transform database record
   */
  _transformRecord(row) {
    return {
      id: row.saved_tender_id,
      userId: row.user_id,
      organizationId: row.organization_id,
      tenderId: row.tender_id,
      uploadedTenderId: row.uploaded_tender_id,
      savedAt: row.saved_at,
    };
  },

  /**
   * Transform tender record for frontend
   */
  _transformTenderRecord(row) {
    const daysRemaining = row.deadline
      ? Math.max(0, Math.ceil((new Date(row.deadline) - new Date()) / (1000 * 60 * 60 * 24)))
      : 30;

    return {
      _id: row._id,
      title: row.title,
      description: row.description || '',
      status: row.status,
      deadline: row.deadline,
      daysRemaining,
      value: row.value ? parseFloat(row.value) : null,
      estimatedValue: row.value ? parseFloat(row.value) : null,
      currency: 'INR',
      category: row.category,
      organizationId: {
        organizationName: row.organization_name || 'Unknown',
        industryDomain: row.category || 'General',
      },
      createdAt: row.created_at,
      savedAt: row.saved_at,
      isUploaded: row.is_uploaded,
      source: row.source,
      isSaved: true, // Always true since these are saved tenders
    };
  },
};
