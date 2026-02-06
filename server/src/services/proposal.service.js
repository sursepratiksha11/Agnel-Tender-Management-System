import { pool } from '../config/db.js';

export const ProposalService = {
  /**
   * Create a proposal draft for a published tender.
   * Enforces one proposal per (tender, organization).
   */
  async createProposalDraft(tenderId, user) {
    // Ensure tender exists and is published
    const tenderRes = await pool.query(
      'SELECT tender_id, status FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderRes.rows.length === 0) {
      throw new Error('Tender not found');
    }

    if (tenderRes.rows[0].status !== 'PUBLISHED') {
      throw new Error('Cannot create proposal for a non-published tender');
    }

    // Check uniqueness: one proposal per org per tender
    const existing = await pool.query(
      'SELECT proposal_id FROM proposal WHERE tender_id = $1 AND organization_id = $2',
      [tenderId, user.organizationId]
    );

    if (existing.rows.length > 0) {
      throw new Error('Proposal already exists for this organization and tender');
    }

    const result = await pool.query(
      `INSERT INTO proposal (tender_id, organization_id, status)
       VALUES ($1, $2, 'DRAFT')
       RETURNING proposal_id, tender_id, organization_id, status, created_at`,
      [tenderId, user.organizationId]
    );

    return result.rows[0];
  },

  /**
   * Get a proposal; BIDDER can only access own org; AUTHORITY can read proposals for their tender.
   */
  async getProposal(proposalId, user) {
    const res = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.organization_id, p.status, p.created_at,
              o.name as organization_name, t.organization_id as tender_org_id
       FROM proposal p
       JOIN organization o ON p.organization_id = o.organization_id
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (res.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const proposal = res.rows[0];

    // Access control
    if (user.role === 'BIDDER') {
      if (proposal.organization_id !== user.organizationId) {
        throw new Error('Forbidden');
      }
    } else if (user.role === 'AUTHORITY') {
      if (proposal.tender_org_id !== user.organizationId) {
        throw new Error('Forbidden');
      }
    }

    // Fetch section responses
    const responsesRes = await pool.query(
      `SELECT response_id, proposal_id, section_id, content, updated_at
       FROM proposal_section_response
       WHERE proposal_id = $1
       ORDER BY section_id`,
      [proposalId]
    );

    return { ...proposal, responses: responsesRes.rows };
  },

  /**
   * Upsert a section response (only when proposal is DRAFT and belongs to bidder org).
   */
  async upsertSectionResponse(proposalId, sectionId, content, user) {
    if (!content || !content.trim()) {
      throw new Error('Content is required');
    }

    // Verify proposal ownership and status
    const proposalRes = await pool.query(
      `SELECT p.proposal_id, p.status, p.organization_id, p.tender_id
       FROM proposal p
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (proposalRes.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const proposal = proposalRes.rows[0];

    if (proposal.organization_id !== user.organizationId) {
      throw new Error('Forbidden');
    }

    if (proposal.status !== 'DRAFT') {
      throw new Error('Cannot edit a non-draft proposal');
    }

    // Ensure section belongs to tender
    const sectionRes = await pool.query(
      'SELECT section_id FROM tender_section WHERE section_id = $1 AND tender_id = $2',
      [sectionId, proposal.tender_id]
    );

    if (sectionRes.rows.length === 0) {
      throw new Error('Section does not belong to this tender');
    }

    // Upsert response
    const result = await pool.query(
      `INSERT INTO proposal_section_response (proposal_id, section_id, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (proposal_id, section_id)
       DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
       RETURNING response_id, proposal_id, section_id, content, updated_at`,
      [proposalId, sectionId, content]
    );

    return result.rows[0];
  },

  /**
   * Validate proposal before submission
   * Ensures all mandatory sections are completed with minimum content
   */
  async validateProposalForSubmission(proposalId, user) {
    // Check proposal exists and belongs to user
    const proposalRes = await pool.query(
      `SELECT p.proposal_id, p.status, p.organization_id, p.tender_id
       FROM proposal p
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (proposalRes.rows.length === 0) {
      return {
        valid: false,
        error: 'Proposal not found',
        details: 'The proposal you are trying to submit does not exist.'
      };
    }

    const proposal = proposalRes.rows[0];

    // Check ownership
    if (proposal.organization_id !== user.organizationId) {
      return {
        valid: false,
        error: 'Forbidden',
        details: 'You do not have permission to submit this proposal.'
      };
    }

    // Check status is DRAFT
    if (proposal.status !== 'DRAFT') {
      return {
        valid: false,
        error: 'Proposal already submitted',
        details: `This proposal has already been ${proposal.status.toLowerCase()}. Only draft proposals can be submitted.`
      };
    }

    // Get all mandatory sections for the tender
    const mandatorySectionsRes = await pool.query(
      `SELECT section_id, title, is_mandatory
       FROM tender_section
       WHERE tender_id = $1 AND is_mandatory = true
       ORDER BY order_index`,
      [proposal.tender_id]
    );

    const mandatorySections = mandatorySectionsRes.rows;

    // If no mandatory sections, proposal is valid
    if (mandatorySections.length === 0) {
      return { valid: true };
    }

    // Check each mandatory section has content >= 50 characters
    const incompleteIds = [];
    const incompleteSections = [];

    for (const section of mandatorySections) {
      const responseRes = await pool.query(
        `SELECT content FROM proposal_section_response
         WHERE proposal_id = $1 AND section_id = $2`,
        [proposalId, section.section_id]
      );

      const content = responseRes.rows[0]?.content || '';
      const contentLength = content.trim().length;

      if (contentLength < 50) {
        incompleteIds.push(section.section_id);
        incompleteSections.push({
          id: section.section_id,
          title: section.title,
          contentLength: contentLength
        });
      }
    }

    if (incompleteSections.length > 0) {
      return {
        valid: false,
        error: 'Proposal incomplete',
        details: `All mandatory sections must have at least 50 characters. ${incompleteSections.length} section(s) are incomplete:`,
        incompleteSections: incompleteSections,
        incompleteIds: incompleteIds
      };
    }

    return { valid: true };
  },

  /**
   * Submit a draft proposal (BIDDER only). Locks further edits.
   * MUST validate all mandatory sections are complete before submission
   */
  async submitProposal(proposalId, user) {
    // Run full validation
    const validation = await this.validateProposalForSubmission(proposalId, user);
    
    if (!validation.valid) {
      const error = new Error(validation.error);
      error.details = validation.details;
      error.incompleteSections = validation.incompleteSections;
      error.incompleteIds = validation.incompleteIds;
      throw error;
    }

    // All validation passed - update status to SUBMITTED
    const result = await pool.query(
      `UPDATE proposal
       SET status = 'SUBMITTED', submitted_at = NOW()
       WHERE proposal_id = $1
       RETURNING proposal_id, tender_id, organization_id, status, created_at, submitted_at`,
      [proposalId]
    );

    return result.rows[0];
  },

  /**
   * List submitted proposals for tenders owned by an authority organization.
   */
  async listSubmittedForAuthority(user) {
    const res = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.organization_id, p.status, p.created_at,
              org.name as bidder_organization,
              t.title as tender_title
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       JOIN organization org ON p.organization_id = org.organization_id
       WHERE p.status = 'SUBMITTED' AND t.organization_id = $1
       ORDER BY p.created_at DESC`,
      [user.organizationId]
    );

    return res.rows;
  },

  /**
   * List proposals belonging to a bidder's organization (all statuses).
   */
  async listForBidder(user) {
    const res = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.organization_id, p.status, p.created_at, p.updated_at,
              t.title as tender_title, t.status as tender_status,
              COUNT(DISTINCT ts.section_id) as total_sections,
              COUNT(DISTINCT CASE WHEN psr.content IS NOT NULL AND LENGTH(TRIM(psr.content)) >= 50 THEN psr.section_id END) as completed_sections
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       LEFT JOIN tender_section ts ON t.tender_id = ts.tender_id
       LEFT JOIN proposal_section_response psr ON p.proposal_id = psr.proposal_id AND ts.section_id = psr.section_id
       WHERE p.organization_id = $1
       GROUP BY p.proposal_id, p.tender_id, p.organization_id, p.status, p.created_at, p.updated_at, t.title, t.status
       ORDER BY p.created_at DESC`,
      [user.organizationId]
    );

    return res.rows;
  },

  /**
   * List submitted proposals for a specific tender (authority-owned), with optional pagination.
   */
  async listSubmittedForTender(tenderId, user, { limit = 20, offset = 0 } = {}) {
    const tenderRes = await pool.query(
      'SELECT tender_id, organization_id FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderRes.rows.length === 0) {
      throw new Error('Tender not found');
    }

    if (tenderRes.rows[0].organization_id !== user.organizationId) {
      throw new Error('Forbidden');
    }

    const res = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.organization_id, p.status, p.created_at,
              org.name as bidder_organization,
              t.title as tender_title
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       JOIN organization org ON p.organization_id = org.organization_id
       WHERE p.status = 'SUBMITTED' AND t.tender_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenderId, limit, offset]
    );

    return res.rows;
  },

  /**
   * Authority: get full proposal detail (submitted) for tenders they own, including section responses.
   */
  async getProposalForAuthority(proposalId, user) {
    const res = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.organization_id, p.status, p.created_at,
              org.name as bidder_organization,
              t.title as tender_title,
              t.organization_id as tender_org_id
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       JOIN organization org ON p.organization_id = org.organization_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (res.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const proposal = res.rows[0];

    if (proposal.tender_org_id !== user.organizationId) {
      throw new Error('Forbidden');
    }

    if (proposal.status !== 'SUBMITTED') {
      throw new Error('Proposal is not submitted');
    }

    const responsesRes = await pool.query(
      `SELECT r.response_id, r.section_id, r.content, r.updated_at,
              s.title as section_title, s.is_mandatory, s.order_index
       FROM proposal_section_response r
       JOIN tender_section s ON r.section_id = s.section_id
       WHERE r.proposal_id = $1
       ORDER BY s.order_index ASC`,
      [proposalId]
    );

    return { ...proposal, responses: responsesRes.rows };
  },

  /**
   * Authority: update proposal status (e.g., UNDER_REVIEW → ACCEPTED/REJECTED).
   */
  async setProposalStatus(proposalId, newStatus, user) {
    const allowed = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'];
    if (!allowed.includes(newStatus)) {
      throw new Error('Invalid status');
    }

    const res = await pool.query(
      `SELECT p.proposal_id, p.status, t.organization_id as tender_org_id
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (res.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const proposal = res.rows[0];

    if (proposal.tender_org_id !== user.organizationId) {
      throw new Error('Forbidden');
    }

    // Only allow transitions from SUBMITTED or UNDER_REVIEW to ACCEPTED/REJECTED/UNDER_REVIEW
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(proposal.status)) {
      throw new Error('Status transition not allowed');
    }

    const result = await pool.query(
      `UPDATE proposal
       SET status = $1
       WHERE proposal_id = $2
       RETURNING proposal_id, tender_id, organization_id, status, created_at`,
      [newStatus, proposalId]
    );

    return result.rows[0];
  },
};