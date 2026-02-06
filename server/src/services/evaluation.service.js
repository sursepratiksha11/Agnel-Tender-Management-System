import { pool } from '../config/db.js';

export const EvaluationService = {
  /**
   * Get list of published tenders ready for evaluation (Authority only)
   */
  async getTendersForEvaluation(user) {
    if (user.role !== 'AUTHORITY') {
      throw new Error('Only authorities can evaluate bids');
    }

    const result = await pool.query(
      `SELECT t.tender_id, t.title, t.status, tes.evaluation_status,
              COUNT(p.proposal_id) as total_bids,
              SUM(CASE WHEN bes.technical_status = 'QUALIFIED' THEN 1 ELSE 0 END) as qualified_bids,
              t.created_at
       FROM tender t
       LEFT JOIN tender_evaluation_status tes ON t.tender_id = tes.tender_id
       LEFT JOIN proposal p ON t.tender_id = p.tender_id
       LEFT JOIN bid_evaluation bes ON p.proposal_id = bes.proposal_id
       WHERE t.organization_id = $1 AND t.status = 'PUBLISHED'
       GROUP BY t.tender_id, tes.evaluation_status
       ORDER BY t.created_at DESC`,
      [user.organizationId]
    );

    return result.rows;
  },

  /**
   * Get bids for a specific tender with evaluation status
   */
  async getBidsForTender(tenderId, user) {
    if (user.role !== 'AUTHORITY') {
      throw new Error('Only authorities can view bids');
    }

    // Verify tender belongs to user's organization
    const tenderCheck = await pool.query(
      'SELECT organization_id FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderCheck.rows.length === 0) {
      throw new Error('Tender not found');
    }

    if (tenderCheck.rows[0].organization_id !== user.organizationId) {
      throw new Error('Unauthorized: Tender belongs to another organization');
    }

    // Get all bids with evaluation status
    const result = await pool.query(
      `SELECT p.proposal_id, p.organization_id, o.name as organization_name,
              bes.evaluation_id, bes.bid_amount, bes.technical_status, 
              bes.technical_score, bes.remarks, bes.status as evaluation_progress,
              bes.evaluated_at, p.created_at,
              tes.l1_proposal_id, tes.l1_amount
       FROM proposal p
       JOIN organization o ON p.organization_id = o.organization_id
       LEFT JOIN bid_evaluation bes ON p.proposal_id = bes.proposal_id
       LEFT JOIN tender_evaluation_status tes ON bes.tender_id = tes.tender_id
       WHERE p.tender_id = $1
       ORDER BY CASE WHEN bes.bid_amount IS NOT NULL THEN bes.bid_amount ELSE 999999999 END ASC`,
      [tenderId]
    );

    return result.rows;
  },

  /**
   * Initialize bid evaluation for a tender
   */
  async initializeTenderEvaluation(tenderId, user) {
    if (user.role !== 'AUTHORITY') {
      throw new Error('Only authorities can initialize evaluation');
    }

    // Verify tender belongs to user's organization
    const tenderCheck = await pool.query(
      'SELECT organization_id FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderCheck.rows.length === 0) {
      throw new Error('Tender not found');
    }

    if (tenderCheck.rows[0].organization_id !== user.organizationId) {
      throw new Error('Unauthorized');
    }

    // Check if evaluation already exists
    const existing = await pool.query(
      'SELECT evaluation_status_id FROM tender_evaluation_status WHERE tender_id = $1',
      [tenderId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Get all proposals for this tender
    const proposals = await pool.query(
      `SELECT proposal_id, organization_id FROM proposal WHERE tender_id = $1`,
      [tenderId]
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create tender evaluation status
      const evalStatus = await client.query(
        `INSERT INTO tender_evaluation_status (tender_id, evaluation_status, total_bids_received)
         VALUES ($1, 'IN_PROGRESS', $2)
         RETURNING evaluation_status_id`,
        [tenderId, proposals.rows.length]
      );

      // Create bid evaluation for each proposal
      for (const proposal of proposals.rows) {
        const org = await client.query(
          'SELECT name FROM organization WHERE organization_id = $1',
          [proposal.organization_id]
        );

        await client.query(
          `INSERT INTO bid_evaluation (tender_id, proposal_id, organization_name, status, created_at)
           VALUES ($1, $2, $3, 'PENDING', NOW())
           ON CONFLICT (proposal_id) DO NOTHING`,
          [tenderId, proposal.proposal_id, org.rows[0]?.name || 'Unknown']
        );
      }

      await client.query('COMMIT');
      return evalStatus.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Update bid evaluation
   */
  async updateBidEvaluation(proposalId, evaluationData, user) {
    if (user.role !== 'AUTHORITY') {
      throw new Error('Only authorities can evaluate bids');
    }

    const { technical_status, technical_score, remarks } = evaluationData;
    const normalizedScore =
      technical_score === '' || technical_score === null || typeof technical_score === 'undefined'
        ? null
        : Number(technical_score);

    if (normalizedScore !== null && Number.isNaN(normalizedScore)) {
      throw new Error('Technical score must be a number');
    }

    // Verify authority owns the tender for this proposal
    const verify = await pool.query(
      `SELECT t.organization_id FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (verify.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    if (verify.rows[0].organization_id !== user.organizationId) {
      throw new Error('Unauthorized');
    }

    // Update bid evaluation
    const result = await pool.query(
      `UPDATE bid_evaluation 
       SET technical_status = COALESCE($1, technical_status),
           technical_score = COALESCE(NULLIF($2::text, '')::numeric, technical_score),
           remarks = COALESCE($3, remarks),
           status = 'IN_PROGRESS',
           evaluator_user_id = $4,
           evaluated_at = NOW(),
           updated_at = NOW()
       WHERE proposal_id = $5
       RETURNING evaluation_id, proposal_id, technical_status, technical_score, remarks`,
      [technical_status, normalizedScore, remarks, user.id, proposalId]
    );

    if (result.rows.length === 0) {
      throw new Error('Evaluation record not found');
    }

    return result.rows[0];
  },

  /**
   * Mark evaluation as completed
   */
  async completeEvaluation(tenderId, user) {
    if (user.role !== 'AUTHORITY') {
      throw new Error('Only authorities can complete evaluation');
    }

    // Verify tender belongs to user
    const tenderCheck = await pool.query(
      'SELECT organization_id FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderCheck.rows.length === 0) {
      throw new Error('Tender not found');
    }

    if (tenderCheck.rows[0].organization_id !== user.organizationId) {
      throw new Error('Unauthorized');
    }

    // Get L1 (lowest bid that is qualified)
    const l1Result = await pool.query(
      `SELECT p.proposal_id, bes.bid_amount FROM bid_evaluation bes
       JOIN proposal p ON bes.proposal_id = p.proposal_id
       WHERE bes.tender_id = $1 AND bes.technical_status = 'QUALIFIED'
       ORDER BY bes.bid_amount ASC
       LIMIT 1`,
      [tenderId]
    );

    const l1ProposalId = l1Result.rows[0]?.proposal_id || null;
    const l1Amount = l1Result.rows[0]?.bid_amount || null;

    // Count statistics
    const stats = await pool.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN technical_status = 'QUALIFIED' THEN 1 ELSE 0 END) as qualified,
              SUM(CASE WHEN technical_status = 'DISQUALIFIED' THEN 1 ELSE 0 END) as disqualified
       FROM bid_evaluation
       WHERE tender_id = $1`,
      [tenderId]
    );

    const stats_row = stats.rows[0];

    // Update evaluation status
    const result = await pool.query(
      `UPDATE tender_evaluation_status
       SET evaluation_status = 'COMPLETED',
           bids_qualified = $1,
           bids_disqualified = $2,
           l1_proposal_id = $3,
           l1_amount = $4,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE tender_id = $5
       RETURNING evaluation_status_id, evaluation_status`,
      [stats_row.qualified, stats_row.disqualified, l1ProposalId, l1Amount, tenderId]
    );

    if (result.rows.length === 0) {
      throw new Error('Evaluation status not found');
    }

    return result.rows[0];
  },

  /**
   * Get evaluation details for a tender
   */
  async getTenderEvaluationDetails(tenderId, user) {
    if (user.role !== 'AUTHORITY') {
      throw new Error('Only authorities can view evaluations');
    }

    // Verify access
    const tenderCheck = await pool.query(
      'SELECT organization_id FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderCheck.rows.length === 0) {
      throw new Error('Tender not found');
    }

    if (tenderCheck.rows[0].organization_id !== user.organizationId) {
      throw new Error('Unauthorized');
    }

    const result = await pool.query(
      `SELECT tes.evaluation_status_id, tes.tender_id, tes.evaluation_status,
              tes.total_bids_received, tes.bids_qualified, tes.bids_disqualified,
              tes.l1_amount, tes.completed_at,
              bes.evaluation_id, bes.proposal_id, bes.bid_amount, 
              bes.technical_status, bes.technical_score, bes.remarks,
              o.name as organization_name
       FROM tender_evaluation_status tes
       LEFT JOIN bid_evaluation bes ON tes.tender_id = bes.tender_id
       LEFT JOIN proposal p ON bes.proposal_id = p.proposal_id
       LEFT JOIN organization o ON p.organization_id = o.organization_id
       WHERE tes.tender_id = $1
       ORDER BY bes.bid_amount ASC`,
      [tenderId]
    );

    return result.rows;
  }
};
