import { pool } from '../config/db.js';
import { AIService } from './ai.service.js';

export const TenderService = {
  /**
   * List tenders with role-based filtering
   * AUTHORITY: tenders in their organization (all statuses)
   * BIDDER: only PUBLISHED tenders
   * Optional filters: status (DRAFT|PUBLISHED)
   */
  async listTenders(user, { status } = {}) {
    let query;
    let params = [];
    let paramIndex = 1;

    const baseQuery = `
      SELECT t.tender_id, t.organization_id, t.title, t.description, 
             t.status, t.submission_deadline, t.created_at,
             o.name as organization_name
      FROM tender t
      JOIN organization o ON t.organization_id = o.organization_id
    `;

    const conditions = [];

    if (user.role === 'AUTHORITY') {
      // AUTHORITY can see tenders in their organization
      conditions.push(`t.organization_id = $${paramIndex++}`);
      params.push(user.organizationId);
    } else {
      // BIDDER can only see PUBLISHED tenders
      conditions.push(`t.status = 'PUBLISHED'`);
    }

    if (status) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    query = `${baseQuery} ${whereClause} ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Create a new tender (DRAFT status by default)
   */
  async createTender(data, user) {
    const { 
      title, 
      description, 
      submission_deadline,
      authority_name,
      reference_id,
      tender_type,
      sector,
      estimated_value,
      submission_start_date
    } = data;

    if (!title || !description || !submission_deadline) {
      throw new Error('Missing required fields: title, description, submission_deadline');
    }

    const result = await pool.query(
      `INSERT INTO tender (
        organization_id, 
        title, 
        description, 
        submission_deadline, 
        status,
        authority_name,
        reference_id,
        tender_type,
        sector,
        estimated_value,
        submission_start_date
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING tender_id, organization_id, title, description, status, submission_deadline, 
                 authority_name, reference_id, tender_type, sector, estimated_value, 
                 submission_start_date, created_at`,
      [
        user.organizationId, 
        title, 
        description, 
        submission_deadline, 
        'DRAFT',
        authority_name || null,
        reference_id || null,
        tender_type || null,
        sector || null,
        estimated_value || null,
        submission_start_date || null
      ]
    );

    return result.rows[0];
  },

  /**
   * Update a tender (only if DRAFT and belongs to user's organization)
   */
  async updateTender(tenderId, data, user) {
    // Check if tender exists and belongs to user's organization
    const tenderCheck = await pool.query(
      'SELECT tender_id, status, organization_id FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderCheck.rows.length === 0) {
      throw new Error('Tender not found');
    }

    const tender = tenderCheck.rows[0];

    if (tender.organization_id !== user.organizationId) {
      throw new Error('Unauthorized: Tender belongs to another organization');
    }

    if (tender.status !== 'DRAFT') {
      throw new Error('Cannot update published tender');
    }

    const { 
      title, 
      description, 
      submission_deadline,
      authority_name,
      reference_id,
      tender_type,
      sector,
      estimated_value,
      submission_start_date
    } = data;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (submission_deadline !== undefined) {
      updates.push(`submission_deadline = $${paramIndex++}`);
      values.push(submission_deadline);
    }
    if (authority_name !== undefined) {
      updates.push(`authority_name = $${paramIndex++}`);
      values.push(authority_name);
    }
    if (reference_id !== undefined) {
      updates.push(`reference_id = $${paramIndex++}`);
      values.push(reference_id);
    }
    if (tender_type !== undefined) {
      updates.push(`tender_type = $${paramIndex++}`);
      values.push(tender_type);
    }
    if (sector !== undefined) {
      updates.push(`sector = $${paramIndex++}`);
      values.push(sector);
    }
    if (estimated_value !== undefined) {
      updates.push(`estimated_value = $${paramIndex++}`);
      values.push(estimated_value);
    }
    if (submission_start_date !== undefined) {
      updates.push(`submission_start_date = $${paramIndex++}`);
      values.push(submission_start_date);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(tenderId);
    const result = await pool.query(
      `UPDATE tender SET ${updates.join(', ')} 
       WHERE tender_id = $${paramIndex}
       RETURNING tender_id, organization_id, title, description, status, submission_deadline, 
                 authority_name, reference_id, tender_type, sector, estimated_value, 
                 submission_start_date, created_at`,
      values
    );

    return result.rows[0];
  },

  /**
   * Get tender by ID
   * AUTHORITY: Can access only own tenders
   * BIDDER: Can access only PUBLISHED tenders
   */
  async getTenderById(tenderId, user) {
    let query;
    let params;

    if (user.role === 'AUTHORITY') {
      // AUTHORITY can only see their own organization's tenders
      query = `
        SELECT t.tender_id, t.organization_id, t.title, t.description, 
               t.status, t.submission_deadline, t.authority_name, t.reference_id,
               t.tender_type, t.sector, t.estimated_value, t.submission_start_date,
               t.created_at, o.name as organization_name
        FROM tender t
        JOIN organization o ON t.organization_id = o.organization_id
        WHERE t.tender_id = $1 AND t.organization_id = $2
      `;
      params = [tenderId, user.organizationId];
    } else {
      // BIDDER can only see PUBLISHED tenders
      query = `
        SELECT t.tender_id, t.organization_id, t.title, t.description, 
               t.status, t.submission_deadline, t.authority_name, t.reference_id,
               t.tender_type, t.sector, t.estimated_value, t.submission_start_date,
               t.created_at,
               o.name as organization_name
        FROM tender t
        JOIN organization o ON t.organization_id = o.organization_id
        WHERE t.tender_id = $1 AND t.status = 'PUBLISHED'
      `;
      params = [tenderId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Tender not found');
    }

    const tender = result.rows[0];

    // Get sections for this tender
    const sectionsResult = await pool.query(
      `SELECT section_id, tender_id, title, description, content, order_index, is_mandatory, created_at
       FROM tender_section
       WHERE tender_id = $1
       ORDER BY order_index ASC`,
      [tenderId]
    );

    tender.sections = sectionsResult.rows;

    return tender;
  },

  /**
   * Publish a tender (change status from DRAFT to PUBLISHED)
   * Must have at least one section
   */
  async publishTender(tenderId, user) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const tenderCheck = await client.query(
        'SELECT tender_id, status, organization_id FROM tender WHERE tender_id = $1 FOR UPDATE',
        [tenderId]
      );

      if (tenderCheck.rows.length === 0) {
        throw new Error('Tender not found');
      }

      const tender = tenderCheck.rows[0];

      if (tender.organization_id !== user.organizationId) {
        throw new Error('Unauthorized: Tender belongs to another organization');
      }

      if (tender.status !== 'DRAFT') {
        throw new Error('Tender is already published');
      }

      // Check if tender has at least one section
      const sectionsCheck = await client.query(
        'SELECT COUNT(*) as count FROM tender_section WHERE tender_id = $1',
        [tenderId]
      );

      if (parseInt(sectionsCheck.rows[0].count) === 0) {
        throw new Error('Cannot publish tender without sections');
      }

      const publishResult = await client.query(
        `UPDATE tender SET status = 'PUBLISHED' 
         WHERE tender_id = $1
         RETURNING tender_id, organization_id, title, description, status, submission_deadline, created_at`,
        [tenderId]
      );

      // Ingest tender content for AI (same transaction) - gracefully handle AI errors
      try {
        await AIService.ingestTender(tenderId, { client, skipTransaction: true });
      } catch (aiErr) {
        console.warn('AI ingestion failed, continuing with publish:', aiErr.message);
        // Don't fail publish if AI ingestion fails
      }

      await client.query('COMMIT');

      return publishResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Delete a tender (only DRAFT status, belongs to user org)
   */
  async deleteTender(tenderId, user) {
    const tenderCheck = await pool.query(
      'SELECT tender_id, status, organization_id FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderCheck.rows.length === 0) {
      throw new Error('Tender not found');
    }

    const tender = tenderCheck.rows[0];

    if (tender.organization_id !== user.organizationId) {
      throw new Error('Unauthorized: Tender belongs to another organization');
    }

    if (tender.status !== 'DRAFT') {
      throw new Error('Cannot delete published tender');
    }

    // Delete sections first (foreign key constraint)
    await pool.query('DELETE FROM tender_section WHERE tender_id = $1', [tenderId]);

    // Delete tender
    await pool.query('DELETE FROM tender WHERE tender_id = $1', [tenderId]);

    return { success: true, message: 'Tender deleted successfully' };
  },

  /**
   * Add a section to a tender (only if DRAFT)
   */
  async addSection(tenderId, data, user) {
    const { title, is_mandatory, content, section_key, description } = data;
    
    if (!title) {
      throw new Error('Section title is required');
    }

    // Check if tender exists, belongs to user, and is DRAFT
    const tenderCheck = await pool.query(
      'SELECT tender_id, status, organization_id FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderCheck.rows.length === 0) {
      throw new Error('Tender not found');
    }

    const tender = tenderCheck.rows[0];

    if (tender.organization_id !== user.organizationId) {
      throw new Error('Unauthorized: Tender belongs to another organization');
    }

    if (tender.status !== 'DRAFT') {
      throw new Error('Cannot add sections to published tender');
    }

    // Get the next order_index (starts from 1, not 0)
    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM tender_section WHERE tender_id = $1',
      [tenderId]
    );
    const nextOrder = orderResult.rows[0].next_order;

    // Insert the section
    const result = await pool.query(
      `INSERT INTO tender_section (tender_id, title, order_index, is_mandatory, content, section_key, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING section_id, tender_id, title, order_index, is_mandatory, content, section_key, description, created_at`,
      [tenderId, title, nextOrder, is_mandatory || false, content || null, section_key || null, description || null]
    );

    return result.rows[0];
  },

  /**
   * Update a section (only if tender is DRAFT)
   */
  async updateSection(sectionId, data, user) {
    // Get section and tender info
    const sectionCheck = await pool.query(
      `SELECT s.section_id, s.tender_id, t.status, t.organization_id
       FROM tender_section s
       JOIN tender t ON s.tender_id = t.tender_id
       WHERE s.section_id = $1`,
      [sectionId]
    );

    if (sectionCheck.rows.length === 0) {
      throw new Error('Section not found');
    }

    const section = sectionCheck.rows[0];

    if (section.organization_id !== user.organizationId) {
      throw new Error('Unauthorized: Section belongs to another organization');
    }

    if (section.status !== 'DRAFT') {
      throw new Error('Cannot update sections of published tender');
    }

    const { title, is_mandatory, content, description } = data;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (is_mandatory !== undefined) {
      updates.push(`is_mandatory = $${paramIndex++}`);
      values.push(is_mandatory);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(sectionId);
    const result = await pool.query(
      `UPDATE tender_section SET ${updates.join(', ')} 
       WHERE section_id = $${paramIndex}
       RETURNING section_id, tender_id, title, order_index, is_mandatory, content, description, created_at`,
      values
    );

    return result.rows[0];
  },

  /**
   * Delete a section (only if tender is DRAFT)
   */
  async deleteSection(sectionId, user) {
    // Get section and tender info
    const sectionCheck = await pool.query(
      `SELECT s.section_id, s.tender_id, t.status, t.organization_id
       FROM tender_section s
       JOIN tender t ON s.tender_id = t.tender_id
       WHERE s.section_id = $1`,
      [sectionId]
    );

    if (sectionCheck.rows.length === 0) {
      throw new Error('Section not found');
    }

    const section = sectionCheck.rows[0];

    if (section.organization_id !== user.organizationId) {
      throw new Error('Unauthorized: Section belongs to another organization');
    }

    if (section.status !== 'DRAFT') {
      throw new Error('Cannot delete sections of published tender');
    }

    // Delete the section (CASCADE will handle related content chunks)
    await pool.query('DELETE FROM tender_section WHERE section_id = $1', [sectionId]);

    return { message: 'Section deleted successfully' };
  },

  /**
   * Reorder sections
   */
  async reorderSections(tenderId, orderedSectionIds, user) {
    if (!Array.isArray(orderedSectionIds) || orderedSectionIds.length === 0) {
      throw new Error('orderedSectionIds must be a non-empty array');
    }

    // Check if tender exists, belongs to user, and is DRAFT
    const tenderCheck = await pool.query(
      'SELECT tender_id, status, organization_id FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderCheck.rows.length === 0) {
      throw new Error('Tender not found');
    }

    const tender = tenderCheck.rows[0];

    if (tender.organization_id !== user.organizationId) {
      throw new Error('Unauthorized: Tender belongs to another organization');
    }

    if (tender.status !== 'DRAFT') {
      throw new Error('Cannot reorder sections of published tender');
    }

    // Verify all sections belong to this tender
    const sectionsCheck = await pool.query(
      'SELECT section_id FROM tender_section WHERE tender_id = $1',
      [tenderId]
    );

    const existingSectionIds = sectionsCheck.rows.map((row) => row.section_id);
    const allValid = orderedSectionIds.every((id) => existingSectionIds.includes(id));

    if (!allValid) {
      throw new Error('Some section IDs do not belong to this tender');
    }

    // Update order_index for each section
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < orderedSectionIds.length; i++) {
        await client.query(
          'UPDATE tender_section SET order_index = $1 WHERE section_id = $2',
          [i, orderedSectionIds[i]]
        );
      }

      await client.query('COMMIT');

      // Return updated sections
      const result = await pool.query(
        `SELECT section_id, tender_id, title, order_index, is_mandatory, created_at
         FROM tender_section
         WHERE tender_id = $1
         ORDER BY order_index ASC`,
        [tenderId]
      );

      return result.rows;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
