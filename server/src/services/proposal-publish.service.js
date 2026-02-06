/**
 * Proposal Publish Service
 * Handles proposal publishing workflow and versioning
 */

import { pool } from '../config/db.js';

/**
 * Valid status transitions
 */
const STATUS_TRANSITIONS = {
  DRAFT: ['FINAL', 'SUBMITTED'],
  FINAL: ['DRAFT', 'PUBLISHED'],
  PUBLISHED: [], // Cannot transition from PUBLISHED (read-only)
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: []
};

export const ProposalPublishService = {
  /**
   * Check if proposal belongs to user's organization
   */
  async verifyOwnership(proposalId, user) {
    const res = await pool.query(
      `SELECT p.proposal_id, p.status, p.organization_id, p.tender_id, p.version
       FROM proposal p
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (res.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const proposal = res.rows[0];

    if (proposal.organization_id !== user.organizationId) {
      throw new Error('Forbidden');
    }

    return proposal;
  },

  /**
   * Check if status transition is valid
   */
  canTransition(currentStatus, targetStatus) {
    const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    return validTransitions.includes(targetStatus);
  },

  /**
   * Finalize proposal (DRAFT -> FINAL)
   * Creates a version snapshot before finalizing
   */
  async finalizeProposal(proposalId, user) {
    const proposal = await this.verifyOwnership(proposalId, user);

    if (proposal.status !== 'DRAFT') {
      throw new Error(`Cannot finalize proposal with status ${proposal.status}. Only DRAFT proposals can be finalized.`);
    }

    // Validate all mandatory sections are complete
    const validationRes = await pool.query(
      `SELECT ts.section_id, ts.title, ts.is_mandatory,
              COALESCE(psr.content, '') as content
       FROM tender_section ts
       LEFT JOIN proposal_section_response psr ON ts.section_id = psr.section_id AND psr.proposal_id = $1
       WHERE ts.tender_id = $2 AND ts.is_mandatory = true`,
      [proposalId, proposal.tender_id]
    );

    const incompleteSections = validationRes.rows.filter(
      s => s.is_mandatory && (!s.content || s.content.trim().length < 50)
    );

    if (incompleteSections.length > 0) {
      const error = new Error('Cannot finalize: incomplete mandatory sections');
      error.incompleteSections = incompleteSections.map(s => ({
        id: s.section_id,
        title: s.title,
        contentLength: s.content ? s.content.trim().length : 0
      }));
      throw error;
    }

    // Create version snapshot
    await this.createVersionSnapshot(proposalId, proposal.version, 'DRAFT', user.userId, 'Auto-snapshot before finalize');

    // Update status to FINAL
    const result = await pool.query(
      `UPDATE proposal
       SET status = 'FINAL', finalized_at = NOW(), updated_at = NOW()
       WHERE proposal_id = $1
       RETURNING proposal_id, tender_id, organization_id, status, version, created_at, finalized_at`,
      [proposalId]
    );

    return result.rows[0];
  },

  /**
   * Publish proposal (FINAL -> PUBLISHED)
   * Creates a version snapshot and locks the proposal
   */
  async publishProposal(proposalId, user) {
    const proposal = await this.verifyOwnership(proposalId, user);

    if (proposal.status !== 'FINAL') {
      throw new Error(`Cannot publish proposal with status ${proposal.status}. Only FINAL proposals can be published.`);
    }

    // Create version snapshot
    await this.createVersionSnapshot(proposalId, proposal.version, 'FINAL', user.userId, 'Auto-snapshot before publish');

    // Update status to PUBLISHED
    const result = await pool.query(
      `UPDATE proposal
       SET status = 'PUBLISHED', published_at = NOW(), updated_at = NOW()
       WHERE proposal_id = $1
       RETURNING proposal_id, tender_id, organization_id, status, version, created_at, finalized_at, published_at`,
      [proposalId]
    );

    return result.rows[0];
  },

  /**
   * Revert proposal to draft (FINAL -> DRAFT)
   */
  async revertToDraft(proposalId, user) {
    const proposal = await this.verifyOwnership(proposalId, user);

    if (proposal.status !== 'FINAL') {
      throw new Error(`Cannot revert proposal with status ${proposal.status}. Only FINAL proposals can be reverted to DRAFT.`);
    }

    // Update status back to DRAFT
    const result = await pool.query(
      `UPDATE proposal
       SET status = 'DRAFT', finalized_at = NULL, updated_at = NOW()
       WHERE proposal_id = $1
       RETURNING proposal_id, tender_id, organization_id, status, version, created_at`,
      [proposalId]
    );

    return result.rows[0];
  },

  /**
   * Create a new version of a published proposal
   * This creates a new proposal entry linked to the original
   */
  async createNewVersion(proposalId, user) {
    const proposal = await this.verifyOwnership(proposalId, user);

    if (proposal.status !== 'PUBLISHED') {
      throw new Error(`Cannot create new version from proposal with status ${proposal.status}. Only PUBLISHED proposals can have new versions.`);
    }

    // Get current section responses
    const responsesRes = await pool.query(
      `SELECT section_id, content FROM proposal_section_response WHERE proposal_id = $1`,
      [proposalId]
    );

    // Get current max version for this proposal chain
    const maxVersionRes = await pool.query(
      `SELECT COALESCE(MAX(version), 1) as max_version
       FROM proposal
       WHERE proposal_id = $1 OR parent_proposal_id = $1`,
      [proposalId]
    );

    const newVersion = maxVersionRes.rows[0].max_version + 1;

    // Create new proposal with incremented version
    const newProposalRes = await pool.query(
      `INSERT INTO proposal (tender_id, organization_id, status, version, parent_proposal_id)
       VALUES ($1, $2, 'DRAFT', $3, $4)
       RETURNING proposal_id, tender_id, organization_id, status, version, parent_proposal_id, created_at`,
      [proposal.tender_id, proposal.organization_id, newVersion, proposalId]
    );

    const newProposal = newProposalRes.rows[0];

    // Copy section responses to new proposal
    for (const response of responsesRes.rows) {
      await pool.query(
        `INSERT INTO proposal_section_response (proposal_id, section_id, content)
         VALUES ($1, $2, $3)`,
        [newProposal.proposal_id, response.section_id, response.content]
      );
    }

    return newProposal;
  },

  /**
   * Create a version snapshot
   */
  async createVersionSnapshot(proposalId, versionNumber, status, userId, notes = null) {
    // Get section responses for snapshot
    const responsesRes = await pool.query(
      `SELECT psr.section_id, psr.content, ts.title as section_title, ts.order_index
       FROM proposal_section_response psr
       JOIN tender_section ts ON psr.section_id = ts.section_id
       WHERE psr.proposal_id = $1
       ORDER BY ts.order_index`,
      [proposalId]
    );

    const snapshotData = {
      sections: responsesRes.rows,
      createdAt: new Date().toISOString()
    };

    await pool.query(
      `INSERT INTO proposal_version (proposal_id, version_number, status, snapshot_data, created_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (proposal_id, version_number) DO UPDATE
       SET snapshot_data = EXCLUDED.snapshot_data, status = EXCLUDED.status`,
      [proposalId, versionNumber, status, JSON.stringify(snapshotData), userId, notes]
    );
  },

  /**
   * Get version history for a proposal
   */
  async getVersionHistory(proposalId, user) {
    // Verify access
    const proposal = await this.verifyOwnership(proposalId, user);

    // Get all versions from the version table
    const versionsRes = await pool.query(
      `SELECT pv.version_id, pv.version_number, pv.status, pv.created_at, pv.notes,
              u.email as created_by_email
       FROM proposal_version pv
       LEFT JOIN "user" u ON pv.created_by = u.user_id
       WHERE pv.proposal_id = $1
       ORDER BY pv.version_number DESC`,
      [proposalId]
    );

    // Also get related proposals (different versions of same proposal)
    const relatedProposalsRes = await pool.query(
      `SELECT proposal_id, version, status, created_at, finalized_at, published_at
       FROM proposal
       WHERE proposal_id = $1 OR parent_proposal_id = $1 OR proposal_id = (
         SELECT parent_proposal_id FROM proposal WHERE proposal_id = $1
       )
       ORDER BY version DESC`,
      [proposalId]
    );

    return {
      currentVersion: proposal.version,
      currentStatus: proposal.status,
      versionSnapshots: versionsRes.rows,
      proposalVersions: relatedProposalsRes.rows.map(p => ({
        proposalId: p.proposal_id,
        version: p.version,
        status: p.status,
        createdAt: p.created_at,
        finalizedAt: p.finalized_at,
        publishedAt: p.published_at,
        isCurrent: p.proposal_id === proposalId
      }))
    };
  },

  /**
   * Get a specific version snapshot
   */
  async getVersionSnapshot(proposalId, versionNumber, user) {
    // Verify access
    await this.verifyOwnership(proposalId, user);

    const res = await pool.query(
      `SELECT pv.version_id, pv.version_number, pv.status, pv.snapshot_data, pv.created_at, pv.notes
       FROM proposal_version pv
       WHERE pv.proposal_id = $1 AND pv.version_number = $2`,
      [proposalId, versionNumber]
    );

    if (res.rows.length === 0) {
      throw new Error('Version not found');
    }

    return res.rows[0];
  }
};
