/**
 * Uploaded Proposal Draft Service
 * Handles CRUD operations for proposal drafts created from uploaded PDF tenders
 */
import { pool } from '../config/db.js';

export const UploadedProposalDraftService = {
  /**
   * Create or update a proposal draft for an uploaded tender
   * @param {Object} data - Draft data
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Created/updated draft
   */
  async upsert(data, userId, organizationId) {
    const { uploadedTenderId, sections, title } = data;

    if (!uploadedTenderId) {
      throw new Error('uploadedTenderId is required');
    }

    // Calculate metadata
    const totalSections = sections?.length || 0;
    const totalWords = sections?.reduce((sum, s) => sum + (s.wordCount || 0), 0) || 0;
    const completedSections = sections?.filter(s => s.content && s.content.trim().length >= 50).length || 0;
    const completionPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    const query = `
      INSERT INTO uploaded_proposal_draft (
        uploaded_tender_id,
        user_id,
        organization_id,
        sections,
        title,
        total_sections,
        total_words,
        completion_percent,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id, uploaded_tender_id)
      DO UPDATE SET
        sections = EXCLUDED.sections,
        title = COALESCE(EXCLUDED.title, uploaded_proposal_draft.title),
        total_sections = EXCLUDED.total_sections,
        total_words = EXCLUDED.total_words,
        completion_percent = EXCLUDED.completion_percent,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      uploadedTenderId,
      userId,
      organizationId,
      JSON.stringify(sections || []),
      title || null,
      totalSections,
      totalWords,
      completionPercent,
    ]);

    return this._transformRecord(result.rows[0]);
  },

  /**
   * Get draft by uploaded tender ID
   * @param {string} uploadedTenderId - Uploaded tender ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>}
   */
  async getByUploadedTenderId(uploadedTenderId, userId) {
    const query = `
      SELECT d.*, ut.title as tender_title, ut.authority_name
      FROM uploaded_proposal_draft d
      JOIN uploaded_tender ut ON d.uploaded_tender_id = ut.uploaded_tender_id
      WHERE d.uploaded_tender_id = $1 AND d.user_id = $2
    `;

    const result = await pool.query(query, [uploadedTenderId, userId]);
    if (result.rows.length === 0) return null;

    return this._transformRecord(result.rows[0], true);
  },

  /**
   * Get draft by ID
   * @param {string} draftId - Draft ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>}
   */
  async getById(draftId, userId) {
    const query = `
      SELECT d.*, ut.title as tender_title, ut.authority_name
      FROM uploaded_proposal_draft d
      JOIN uploaded_tender ut ON d.uploaded_tender_id = ut.uploaded_tender_id
      WHERE d.draft_id = $1 AND d.user_id = $2
    `;

    const result = await pool.query(query, [draftId, userId]);
    if (result.rows.length === 0) return null;

    return this._transformRecord(result.rows[0], true);
  },

  /**
   * List all drafts for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async listByUser(userId, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    let query = `
      SELECT d.*, ut.title as tender_title, ut.authority_name, ut.submission_deadline
      FROM uploaded_proposal_draft d
      JOIN uploaded_tender ut ON d.uploaded_tender_id = ut.uploaded_tender_id
      WHERE d.user_id = $1
    `;

    const values = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    query += ` ORDER BY d.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows.map(row => this._transformRecord(row));
  },

  /**
   * Update draft status
   * @param {string} draftId - Draft ID
   * @param {string} status - New status
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async updateStatus(draftId, status, userId) {
    const query = `
      UPDATE uploaded_proposal_draft
      SET status = $1, updated_at = NOW()
      WHERE draft_id = $2 AND user_id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [status, draftId, userId]);
    if (result.rows.length === 0) {
      throw new Error('Draft not found');
    }

    return this._transformRecord(result.rows[0]);
  },

  /**
   * Record an export
   * @param {string} draftId - Draft ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async recordExport(draftId, userId) {
    const query = `
      UPDATE uploaded_proposal_draft
      SET last_exported_at = NOW(), export_count = export_count + 1, updated_at = NOW()
      WHERE draft_id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [draftId, userId]);
    if (result.rows.length === 0) {
      throw new Error('Draft not found');
    }

    return this._transformRecord(result.rows[0]);
  },

  /**
   * Delete a draft
   * @param {string} draftId - Draft ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async delete(draftId, userId) {
    const result = await pool.query(
      `DELETE FROM uploaded_proposal_draft WHERE draft_id = $1 AND user_id = $2 RETURNING draft_id`,
      [draftId, userId]
    );
    return result.rows.length > 0;
  },

  /**
   * Get count of drafts for a user
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @returns {Promise<number>}
   */
  async getCount(userId, options = {}) {
    const { status } = options;

    let query = `SELECT COUNT(*) FROM uploaded_proposal_draft WHERE user_id = $1`;
    const values = [userId];

    if (status) {
      query += ` AND status = $2`;
      values.push(status);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count) || 0;
  },

  /**
   * Transform database record to API response format
   */
  _transformRecord(row, includeSections = false) {
    const record = {
      id: row.draft_id,
      uploadedTenderId: row.uploaded_tender_id,
      userId: row.user_id,
      organizationId: row.organization_id,
      title: row.title || row.tender_title,
      tenderTitle: row.tender_title,
      authorityName: row.authority_name,
      status: row.status,
      totalSections: row.total_sections,
      totalWords: row.total_words,
      completionPercent: row.completion_percent,
      lastExportedAt: row.last_exported_at,
      exportCount: row.export_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      submissionDeadline: row.submission_deadline,
    };

    if (includeSections) {
      record.sections = typeof row.sections === 'string'
        ? JSON.parse(row.sections)
        : row.sections;
    }

    return record;
  },
};
