/**
 * Uploaded Tender Service
 * Handles CRUD operations for PDF tenders uploaded by bidders
 */
import { pool } from '../config/db.js';

export const UploadedTenderService = {
  /**
   * Create a new uploaded tender record
   * @param {Object} data - Tender data from PDF analysis
   * @param {string} userId - User ID who uploaded
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Created tender record
   */
  async create(data, userId, organizationId) {
    const {
      title,
      description,
      source = 'PDF_UPLOAD',
      sourceUrl,
      originalFilename,
      fileSize,
      parsedData,
      analysisData,
      metadata = {},
    } = data;

    console.log('[UploadedTender] create called with:', {
      title,
      userId,
      organizationId,
      hasDescription: !!description,
      hasParsedData: !!parsedData,
      hasAnalysisData: !!analysisData
    });

    // Check for existing tender with same title by this user (prevent duplicates)
    const existingCheck = await pool.query(
      `SELECT uploaded_tender_id FROM uploaded_tender 
       WHERE user_id = $1 AND title = $2 
       LIMIT 1`,
      [userId, title]
    );

    if (existingCheck.rows.length > 0) {
      console.log(`[UploadedTender] Duplicate detected for title: "${title}" - Updating existing record`);
      // Update existing instead of creating duplicate
      return this.update(existingCheck.rows[0].uploaded_tender_id, data, userId);
    }

    // Extract metadata from analysis
    const authorityName = metadata.authority || parsedData?.metadata?.authority || null;
    const referenceNumber = metadata.referenceNumber || parsedData?.metadata?.referenceNumber || null;
    const sector = metadata.sector || parsedData?.metadata?.sector || null;
    const estimatedValue = metadata.estimatedValue || parsedData?.metadata?.estimatedValue || null;
    const submissionDeadline = metadata.deadline || parsedData?.metadata?.deadline || null;
    const emdAmount = metadata.emdAmount || parsedData?.metadata?.emdAmount || null;
    const wordCount = parsedData?.stats?.totalWords || 0;
    const sectionCount = parsedData?.sections?.length || 0;
    const opportunityScore = analysisData?.summary?.opportunityScore || 0;

    const query = `
      INSERT INTO uploaded_tender (
        organization_id,
        user_id,
        title,
        description,
        source,
        source_url,
        original_filename,
        file_size,
        parsed_data,
        analysis_data,
        authority_name,
        reference_number,
        sector,
        estimated_value,
        submission_deadline,
        emd_amount,
        word_count,
        section_count,
        opportunity_score,
        status,
        analyzed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'ANALYZED', NOW())
      RETURNING *
    `;

    const values = [
      organizationId,
      userId,
      title,
      description || analysisData?.summary?.executiveSummary?.substring(0, 500) || '',
      source,
      sourceUrl || null,
      originalFilename || null,
      fileSize || null,
      JSON.stringify(parsedData || {}),
      JSON.stringify(analysisData || {}),
      authorityName,
      referenceNumber,
      sector,
      estimatedValue,
      submissionDeadline ? new Date(submissionDeadline) : null,
      emdAmount,
      wordCount,
      sectionCount,
      opportunityScore,
    ];

    console.log('[UploadedTender] Inserting with values:', {
      organizationId,
      userId,
      title,
      hasDescription: !!description,
    });

    try {
      const result = await pool.query(query, values);
      console.log('[UploadedTender] Insert successful:', result.rows[0].uploaded_tender_id);
      return this._transformRecord(result.rows[0]);
    } catch (dbError) {
      console.error('[UploadedTender] Database error:', dbError.message);
      console.error('[UploadedTender] Error detail:', dbError.detail);
      throw dbError;
    }
  },

  /**
   * Get uploaded tender by ID
   * @param {string} id - Uploaded tender ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object|null>} Tender record or null
   */
  async getById(id, userId) {
    const query = `
      SELECT ut.*,
             o.name as organization_name,
             u.name as uploaded_by_name
      FROM uploaded_tender ut
      JOIN organization o ON ut.organization_id = o.organization_id
      JOIN "user" u ON ut.user_id = u.user_id
      WHERE ut.uploaded_tender_id = $1
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;

    return this._transformRecord(result.rows[0], true);
  },

  /**
   * List uploaded tenders for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of uploaded tenders
   */
  async listByOrganization(organizationId, options = {}) {
    const { limit = 50, offset = 0, status = 'ANALYZED' } = options;

    const query = `
      SELECT ut.uploaded_tender_id,
             ut.title,
             ut.description,
             ut.source,
             ut.original_filename,
             ut.authority_name,
             ut.sector,
             ut.estimated_value,
             ut.submission_deadline,
             ut.word_count,
             ut.section_count,
             ut.opportunity_score,
             ut.status,
             ut.created_at,
             ut.analyzed_at,
             u.name as uploaded_by_name
      FROM uploaded_tender ut
      JOIN "user" u ON ut.user_id = u.user_id
      WHERE ut.organization_id = $1
        AND ut.status = $2
      ORDER BY ut.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, [organizationId, status, limit, offset]);
    return result.rows.map(row => this._transformRecord(row, false));
  },

  /**
   * List uploaded tenders for tender discovery (all organizations)
   * Returns simplified records for listing
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of uploaded tenders
   */
  async listForDiscovery(options = {}) {
    const { limit = 50, offset = 0, search = '', sector = '' } = options;

    let query = `
      SELECT ut.uploaded_tender_id,
             ut.organization_id,
             ut.title,
             ut.description,
             ut.source,
             ut.authority_name,
             ut.sector,
             ut.estimated_value,
             ut.submission_deadline,
             ut.word_count,
             ut.opportunity_score,
             ut.created_at,
             o.name as organization_name,
             u.name as uploaded_by_name
      FROM uploaded_tender ut
      LEFT JOIN organization o ON ut.organization_id = o.organization_id
      LEFT JOIN "user" u ON ut.user_id = u.user_id
      WHERE ut.status = 'ANALYZED'
    `;

    const values = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (ut.title ILIKE $${paramIndex} OR ut.description ILIKE $${paramIndex} OR ut.authority_name ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (sector) {
      query += ` AND ut.sector = $${paramIndex}`;
      values.push(sector);
      paramIndex++;
    }

    query += ` ORDER BY ut.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows.map(row => this._transformForDiscovery(row));
  },

  /**
   * Get uploaded tenders for a specific user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User's uploaded tenders
   */
  async getUserUploadedTenders(userId, options = {}) {
    const { limit = 10, offset = 0 } = options;

    const query = `
      SELECT 
             ut.uploaded_tender_id,
             ut.title,
             ut.description,
             ut.authority_name,
             ut.sector,
             ut.estimated_value,
             ut.submission_deadline,
             ut.word_count,
             ut.opportunity_score,
             ut.created_at,
             ut.status,
             o.name as organization_name,
             u.name as uploaded_by_name
      FROM uploaded_tender ut
      LEFT JOIN organization o ON ut.organization_id = o.organization_id
      LEFT JOIN "user" u ON ut.user_id = u.user_id
      WHERE ut.user_id = $1
      ORDER BY ut.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows.map(row => ({
      id: row.uploaded_tender_id,
      title: row.title,
      description: row.description,
      authorityName: row.authority_name,
      sector: row.sector,
      estimatedValue: row.estimated_value,
      submissionDeadline: row.submission_deadline,
      wordCount: row.word_count,
      opportunityScore: row.opportunity_score,
      createdAt: row.created_at,
      status: row.status,
      organizationName: row.organization_name || 'Your Organization',
      uploadedByName: row.uploaded_by_name || 'You',
      isUploaded: true
    }));
  },

  /**
   * Get count of uploaded tenders
   * @param {Object} options - Filter options
   * @returns {Promise<number>} Count
   */
  async getCount(options = {}) {
    const { organizationId, status = 'ANALYZED' } = options;

    let query = `SELECT COUNT(*) FROM uploaded_tender WHERE status = $1`;
    const values = [status];

    if (organizationId) {
      query += ` AND organization_id = $2`;
      values.push(organizationId);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count) || 0;
  },

  /**
   * Update uploaded tender
   * @param {string} id - Tender ID
   * @param {Object} updates - Fields to update
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Updated record
   */
  async update(id, updates, userId = null) {
    // If full data object (from re-upload), handle specially
    if (updates.parsedData && updates.analysisData) {
      const { parsedData, analysisData, metadata = {}, fileSize, originalFilename } = updates;
      
      const authorityName = metadata.authority || parsedData?.metadata?.authority || null;
      const referenceNumber = metadata.referenceNumber || parsedData?.metadata?.referenceNumber || null;
      const sector = metadata.sector || parsedData?.metadata?.sector || null;
      const estimatedValue = metadata.estimatedValue || parsedData?.metadata?.estimatedValue || null;
      const submissionDeadline = metadata.deadline || parsedData?.metadata?.deadline || null;
      const emdAmount = metadata.emdAmount || parsedData?.metadata?.emdAmount || null;
      const wordCount = parsedData?.stats?.totalWords || 0;
      const sectionCount = parsedData?.sections?.length || 0;
      const opportunityScore = analysisData?.summary?.opportunityScore || 0;

      const query = `
        UPDATE uploaded_tender
        SET 
          parsed_data = $1,
          analysis_data = $2,
          authority_name = $3,
          reference_number = $4,
          sector = $5,
          estimated_value = $6,
          submission_deadline = $7,
          emd_amount = $8,
          word_count = $9,
          section_count = $10,
          opportunity_score = $11,
          file_size = $12,
          original_filename = $13,
          status = 'ANALYZED',
          analyzed_at = NOW(),
          updated_at = NOW()
        WHERE uploaded_tender_id = $14
        ${userId ? 'AND user_id = $15' : ''}
        RETURNING *
      `;

      const values = [
        JSON.stringify(parsedData || {}),
        JSON.stringify(analysisData || {}),
        authorityName,
        referenceNumber,
        sector,
        estimatedValue,
        submissionDeadline ? new Date(submissionDeadline) : null,
        emdAmount,
        wordCount,
        sectionCount,
        opportunityScore,
        fileSize || null,
        originalFilename || null,
        id
      ];

      if (userId) values.push(userId);

      const result = await pool.query(query, values);
      return this._transformRecord(result.rows[0]);
    }

    // Standard field updates
    const allowedFields = [
      'title', 'description', 'sector', 'estimated_value',
      'submission_deadline', 'analysis_data', 'status'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setClause.push(`${dbKey} = $${paramIndex}`);
        values.push(key === 'analysis_data' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE uploaded_tender
      SET ${setClause.join(', ')}
      WHERE uploaded_tender_id = $${paramIndex}
      ${userId ? `AND user_id = $${paramIndex + 1}` : ''}
      RETURNING *
    `;

    if (userId) values.push(userId);

    const result = await pool.query(query, values);
    return this._transformRecord(result.rows[0]);
  },

  /**
   * Delete uploaded tender
   * @param {string} id - Tender ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<boolean>} Success status
   */
  async delete(id, userId) {
    const query = `
      DELETE FROM uploaded_tender
      WHERE uploaded_tender_id = $1 AND user_id = $2
      RETURNING uploaded_tender_id
    `;

    const result = await pool.query(query, [id, userId]);
    return result.rows.length > 0;
  },

  /**
   * Transform database record to API response format
   * @param {Object} row - Database row
   * @param {boolean} includeFullData - Include parsed and analysis data
   * @returns {Object} Transformed record
   */
  _transformRecord(row, includeFullData = false) {
    const record = {
      id: row.uploaded_tender_id,
      organizationId: row.organization_id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      source: row.source,
      sourceUrl: row.source_url,
      originalFilename: row.original_filename,
      fileSize: row.file_size,
      authorityName: row.authority_name,
      referenceNumber: row.reference_number,
      sector: row.sector,
      estimatedValue: row.estimated_value ? parseFloat(row.estimated_value) : null,
      submissionDeadline: row.submission_deadline,
      emdAmount: row.emd_amount ? parseFloat(row.emd_amount) : null,
      wordCount: row.word_count,
      sectionCount: row.section_count,
      opportunityScore: row.opportunity_score,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      analyzedAt: row.analyzed_at,
      organizationName: row.organization_name,
      uploadedByName: row.uploaded_by_name,
    };

    if (includeFullData) {
      record.parsedData = typeof row.parsed_data === 'string'
        ? JSON.parse(row.parsed_data)
        : row.parsed_data;
      record.analysisData = typeof row.analysis_data === 'string'
        ? JSON.parse(row.analysis_data)
        : row.analysis_data;
    }

    return record;
  },

  /**
   * Transform record for discovery list (tender card compatible)
   * @param {Object} row - Database row
   * @returns {Object} Tender card compatible format
   */
  _transformForDiscovery(row) {
    const daysRemaining = row.submission_deadline
      ? Math.max(0, Math.ceil((new Date(row.submission_deadline) - new Date()) / (1000 * 60 * 60 * 24)))
      : 30;

    return {
      _id: row.uploaded_tender_id,
      title: row.title,
      description: row.description || '',
      status: 'UPLOADED',
      deadline: row.submission_deadline,
      daysRemaining,
      value: row.estimated_value ? parseFloat(row.estimated_value) : null,
      estimatedValue: row.estimated_value ? parseFloat(row.estimated_value) : null,
      currency: 'INR',
      category: row.sector,
      organizationId: {
        organizationName: row.organization_name || 'Your Organization',
        industryDomain: row.sector || 'General',
      },
      createdAt: row.created_at,
      proposalCount: 0, // Uploaded tenders don't have proposals yet
      // Additional fields to identify uploaded tenders
      isUploaded: true,
      source: row.source,
      uploadedBy: row.uploaded_by_name || 'You',
      authorityName: row.authority_name,
      wordCount: row.word_count,
      opportunityScore: row.opportunity_score,
    };
  },
};
