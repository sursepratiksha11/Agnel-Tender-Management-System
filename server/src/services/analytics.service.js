import { pool } from '../config/db.js';

export class AnalyticsService {
  // Get comprehensive analytics for Authority organization
  async getAnalytics(user) {
    if (!user || user.role !== 'AUTHORITY') {
      throw new Error('Unauthorized: AUTHORITY role required');
    }

    const organizationId = user.organization_id;

    try {
      // Get all tenders for this organization
      const tendersResult = await pool.query(
        `SELECT * FROM tender WHERE organization_id = $1`,
        [organizationId]
      );
      const tenders = tendersResult.rows;

      // Calculate key metrics
      const metrics = {
        totalTenders: tenders.length,
        publishedTenders: tenders.filter(t => t.status === 'PUBLISHED').length,
        closedTenders: tenders.filter(t => t.status === 'CLOSED').length,
        draftTenders: tenders.filter(t => t.status === 'DRAFT').length,
      };

      // Get bid statistics per tender
      const bidsResult = await pool.query(
        `SELECT tender_id, COUNT(*) as bid_count 
         FROM proposal 
         WHERE tender_id IN (SELECT tender_id FROM tender WHERE organization_id = $1)
         GROUP BY tender_id`,
        [organizationId]
      );
      const bidsByTender = bidsResult.rows;

      // Calculate average bids per tender
      const totalBids = bidsByTender.reduce((sum, row) => sum + row.bid_count, 0);
      metrics.averageBidsPerTender = tenders.length > 0 ? (totalBids / tenders.length).toFixed(1) : 0;
      metrics.totalBids = totalBids;

      // Calculate tender lifecycle duration
      const tenderDurations = tenders
        .filter(t => t.submission_deadline && t.created_at)
        .map(t => {
          const created = new Date(t.created_at);
          const deadline = new Date(t.submission_deadline);
          const durationDays = Math.ceil((deadline - created) / (1000 * 60 * 60 * 24));
          return durationDays;
        });

      metrics.averageLifecycleDays = tenderDurations.length > 0 
        ? Math.round(tenderDurations.reduce((a, b) => a + b, 0) / tenderDurations.length)
        : 0;

      // Build detailed data for charts
      const tenderDetails = tenders.map(tender => {
        const bids = bidsByTender.find(b => b.tender_id === tender.tender_id);
        const created = new Date(tender.created_at);
        const deadline = tender.submission_deadline ? new Date(tender.submission_deadline) : null;
        const durationDays = deadline ? Math.ceil((deadline - created) / (1000 * 60 * 60 * 24)) : 0;

        return {
          tender_id: tender.tender_id,
          title: tender.title,
          status: tender.status,
          bidCount: bids?.bid_count || 0,
          lifecycleDays: durationDays,
          createdAt: tender.created_at,
          publishedAt: tender.published_at,
          closedAt: tender.closed_at,
          estimatedValue: tender.estimated_value,
        };
      });

      // Status distribution
      const statusDistribution = {
        DRAFT: metrics.draftTenders,
        PUBLISHED: metrics.publishedTenders,
        CLOSED: metrics.closedTenders,
      };

      return {
        metrics,
        tenderDetails,
        statusDistribution,
        bidsByTender,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get tender performance (for timeline chart)
  async getTenderPerformance(user) {
    if (!user || user.role !== 'AUTHORITY') {
      throw new Error('Unauthorized: AUTHORITY role required');
    }

    const organizationId = user.organization_id;

    try {
      const result = await pool.query(
        `SELECT 
          t.created_at::DATE as date,
          COUNT(*) as count,
          SUM(CASE WHEN t.status = 'PUBLISHED' THEN 1 ELSE 0 END) as published
        FROM tender t
        WHERE t.organization_id = $1
        GROUP BY t.created_at::DATE
        ORDER BY t.created_at::DATE ASC
        LIMIT 90`,
        [organizationId]
      );

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get bid statistics over time
  async getBidTimeline(user) {
    if (!user || user.role !== 'AUTHORITY') {
      throw new Error('Unauthorized: AUTHORITY role required');
    }

    const organizationId = user.organization_id;

    try {
      const result = await pool.query(
        `SELECT 
          p.created_at::DATE as date,
          COUNT(*) as bid_count,
          COUNT(DISTINCT p.tender_id) as tender_count
        FROM proposal p
        INNER JOIN tender t ON p.tender_id = t.tender_id
        WHERE t.organization_id = $1
        GROUP BY p.created_at::DATE
        ORDER BY p.created_at::DATE ASC
        LIMIT 90`,
        [organizationId]
      );

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get evaluation status summary
  async getEvaluationSummary(user) {
    if (!user || user.role !== 'AUTHORITY') {
      throw new Error('Unauthorized: AUTHORITY role required');
    }

    const organizationId = user.organization_id;

    try {
      const result = await pool.query(
        `SELECT 
          tes.evaluation_status,
          COUNT(*) as count
        FROM tender_evaluation_status tes
        INNER JOIN tender t ON tes.tender_id = t.tender_id
        WHERE t.organization_id = $1
        GROUP BY tes.evaluation_status`,
        [organizationId]
      );

      const summary = {
        PENDING: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
      };

      result.rows.forEach(row => {
        summary[row.evaluation_status] = row.count;
      });

      return summary;
    } catch (error) {
      throw error;
    }
  }
}

export default new AnalyticsService();
