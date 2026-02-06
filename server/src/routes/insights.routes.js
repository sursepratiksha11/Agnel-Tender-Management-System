/**
 * Insights Routes
 * API endpoints for:
 * - Risk Assessment
 * - Audit Logs
 * - RSS/News Feed
 * - Compliance Checks
 * - Dashboard Insights
 */

import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { RiskAssessmentService } from '../services/riskAssessment.service.js';
import { AuditLogService } from '../services/auditLog.service.js';
import { RSSFeedService } from '../services/rssFeed.service.js';
import { ComplianceCheckService } from '../services/complianceCheck.service.js';
import { pool } from '../config/db.js';

const router = Router();

// ==========================================
// RISK ASSESSMENT ENDPOINTS
// ==========================================

/**
 * GET /api/insights/risk/:proposalId
 * Get comprehensive risk assessment for a proposal
 */
router.get('/risk/:proposalId', requireAuth, async (req, res, next) => {
  try {
    const { proposalId } = req.params;

    // Verify access (bidder owns proposal OR authority owns tender)
    const accessCheck = await pool.query(
      `SELECT p.organization_id, t.organization_id as tender_org_id
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const { organization_id, tender_org_id } = accessCheck.rows[0];

    if (req.user.role === 'BIDDER' && organization_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'AUTHORITY' && tender_org_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const assessment = await RiskAssessmentService.calculateRiskScore(proposalId);

    res.json({
      success: true,
      data: assessment
    });
  } catch (err) {
    if (err.message === 'Proposal not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/insights/risk/summary/organization
 * Get risk summary for all draft proposals in the organization
 */
router.get('/risk/summary/organization', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const summary = await RiskAssessmentService.getProposalsRiskSummary(req.user.organizationId);

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// AUDIT LOG ENDPOINTS
// ==========================================

/**
 * GET /api/insights/audit/:proposalId
 * Get audit logs for a proposal
 */
router.get('/audit/:proposalId', requireAuth, async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    const { limit = 50, offset = 0, actions } = req.query;

    // Verify access
    const accessCheck = await pool.query(
      `SELECT p.organization_id, t.organization_id as tender_org_id
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const { organization_id, tender_org_id } = accessCheck.rows[0];

    if (req.user.role === 'BIDDER' && organization_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'AUTHORITY' && tender_org_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const actionsArray = actions ? actions.split(',') : null;
    const logs = await AuditLogService.getLogsForProposal(proposalId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      actions: actionsArray
    });

    const totalCount = await AuditLogService.getLogCount(proposalId);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insights/audit/activity/recent
 * Get recent activity for the organization
 */
router.get('/audit/activity/recent', requireAuth, async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const activity = await AuditLogService.getRecentActivitySummary(
      req.user.organizationId,
      { limit: parseInt(limit) }
    );

    res.json({
      success: true,
      data: activity
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insights/audit/activity/statistics
 * Get activity statistics for the organization
 */
router.get('/audit/activity/statistics', requireAuth, async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    const statistics = await AuditLogService.getActivityStatistics(
      req.user.organizationId,
      { days: parseInt(days) }
    );

    res.json({
      success: true,
      data: statistics
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// RSS/NEWS FEED ENDPOINTS
// ==========================================

/**
 * GET /api/insights/news
 * Get aggregated news from RSS feeds
 */
router.get('/news', requireAuth, async (req, res, next) => {
  try {
    const { limit = 10, categories } = req.query;

    const categoriesArray = categories ? categories.split(',') : null;
    const news = await RSSFeedService.getAggregatedNews({
      limit: parseInt(limit),
      categories: categoriesArray
    });

    res.json({
      success: true,
      data: news
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insights/news/highlights
 * Get news highlights for dashboard widget
 */
router.get('/news/highlights', requireAuth, async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    const highlights = await RSSFeedService.getHighlights({
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: highlights
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insights/news/sources
 * Get available RSS feed sources
 */
router.get('/news/sources', requireAuth, async (req, res, next) => {
  try {
    const sources = RSSFeedService.getFeedSources();

    res.json({
      success: true,
      data: sources
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// COMPLIANCE CHECK ENDPOINTS
// ==========================================

/**
 * GET /api/insights/compliance/:proposalId
 * Get comprehensive compliance check for a proposal
 */
router.get('/compliance/:proposalId', requireAuth, async (req, res, next) => {
  try {
    const { proposalId } = req.params;

    // Verify access
    const accessCheck = await pool.query(
      `SELECT p.organization_id, t.organization_id as tender_org_id
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const { organization_id, tender_org_id } = accessCheck.rows[0];

    if (req.user.role === 'BIDDER' && organization_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'AUTHORITY' && tender_org_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const compliance = await ComplianceCheckService.checkProposalCompliance(proposalId);

    res.json({
      success: true,
      data: compliance
    });
  } catch (err) {
    if (err.message === 'Proposal not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/insights/compliance/quick/:proposalId
 * Quick compliance check (faster, less detail)
 */
router.get('/compliance/quick/:proposalId', requireAuth, async (req, res, next) => {
  try {
    const { proposalId } = req.params;

    const compliance = await ComplianceCheckService.quickComplianceCheck(proposalId);

    res.json({
      success: true,
      data: compliance
    });
  } catch (err) {
    if (err.message === 'Proposal not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/insights/compliance/summary/organization
 * Get compliance summary for all proposals in organization
 */
router.get('/compliance/summary/organization', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const summary = await ComplianceCheckService.getComplianceSummaryForOrganization(req.user.organizationId);

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// DASHBOARD INSIGHTS ENDPOINTS
// ==========================================

/**
 * GET /api/insights/dashboard
 * Get comprehensive dashboard insights for bidder
 */
router.get('/dashboard', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;

    // Fetch all metrics in parallel
    const [
      proposalsMetrics,
      riskSummary,
      complianceSummary,
      newsHighlights,
      recentActivity
    ] = await Promise.all([
      // Proposals with deadline metrics
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE p.status = 'DRAFT') as draft_count,
          COUNT(*) FILTER (WHERE p.status = 'SUBMITTED') as submitted_count,
          COUNT(*) FILTER (WHERE p.status = 'DRAFT' AND t.submission_deadline < NOW()) as overdue_count,
          COUNT(*) FILTER (WHERE p.status = 'DRAFT' AND t.submission_deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days') as due_this_week,
          COUNT(*) FILTER (WHERE p.status = 'DRAFT' AND t.submission_deadline BETWEEN NOW() AND NOW() + INTERVAL '3 days') as due_in_3_days
        FROM proposal p
        JOIN tender t ON p.tender_id = t.tender_id
        WHERE p.organization_id = $1
      `, [organizationId]),

      // Risk summary
      RiskAssessmentService.getProposalsRiskSummary(organizationId).catch(err => {
        console.error('[Dashboard] Risk summary error:', err.message);
        return { proposals: [], statistics: { highRiskCount: 0, avgRiskScore: 0 } };
      }),

      // Compliance summary
      ComplianceCheckService.getComplianceSummaryForOrganization(organizationId).catch(err => {
        console.error('[Dashboard] Compliance summary error:', err.message);
        return { proposals: [], statistics: { criticalCount: 0, avgComplianceScore: 100 } };
      }),

      // News highlights
      RSSFeedService.getHighlights({ limit: 3 }).catch(err => {
        console.error('[Dashboard] News error:', err.message);
        return { highlights: [], usingFallback: true };
      }),

      // Recent activity
      AuditLogService.getRecentActivitySummary(organizationId, { limit: 5 }).catch(err => {
        console.error('[Dashboard] Activity error:', err.message);
        return [];
      })
    ]);

    const metrics = proposalsMetrics.rows[0];

    // Build actionable insights
    const actionableInsights = [];

    // High risk proposals
    if (riskSummary.statistics.highRiskCount > 0) {
      actionableInsights.push({
        type: 'HIGH_RISK',
        severity: 'CRITICAL',
        title: 'High Risk Proposals',
        description: `${riskSummary.statistics.highRiskCount} proposal(s) have critical risk issues`,
        action: 'Review and address risk factors immediately',
        count: riskSummary.statistics.highRiskCount,
        icon: 'AlertTriangle'
      });
    }

    // Overdue proposals
    if (parseInt(metrics.overdue_count) > 0) {
      actionableInsights.push({
        type: 'OVERDUE',
        severity: 'CRITICAL',
        title: 'Overdue Proposals',
        description: `${metrics.overdue_count} proposal(s) have passed their deadline`,
        action: 'Contact authority or archive these proposals',
        count: parseInt(metrics.overdue_count),
        icon: 'Clock'
      });
    }

    // Due this week
    if (parseInt(metrics.due_this_week) > 0) {
      actionableInsights.push({
        type: 'DUE_SOON',
        severity: parseInt(metrics.due_in_3_days) > 0 ? 'HIGH' : 'MEDIUM',
        title: 'Deadlines This Week',
        description: `${metrics.due_this_week} proposal(s) due within 7 days${parseInt(metrics.due_in_3_days) > 0 ? ` (${metrics.due_in_3_days} within 3 days!)` : ''}`,
        action: 'Prioritize completion of these proposals',
        count: parseInt(metrics.due_this_week),
        icon: 'Calendar'
      });
    }

    // Compliance issues
    if (complianceSummary.statistics.criticalCount > 0) {
      actionableInsights.push({
        type: 'COMPLIANCE',
        severity: 'HIGH',
        title: 'Compliance Issues',
        description: `${complianceSummary.statistics.criticalCount} proposal(s) have critical compliance issues`,
        action: 'Complete mandatory sections before submission',
        count: complianceSummary.statistics.criticalCount,
        icon: 'Shield'
      });
    }

    // Draft proposals needing attention
    const draftsNeedingWork = riskSummary.proposals.filter(p => p.mandatoryCompletion < 100).length;
    if (draftsNeedingWork > 0) {
      actionableInsights.push({
        type: 'INCOMPLETE',
        severity: 'MEDIUM',
        title: 'Incomplete Proposals',
        description: `${draftsNeedingWork} proposal(s) have incomplete mandatory sections`,
        action: 'Complete all mandatory sections',
        count: draftsNeedingWork,
        icon: 'FileText'
      });
    }

    res.json({
      success: true,
      data: {
        // Overview metrics
        overview: {
          totalDrafts: parseInt(metrics.draft_count) || 0,
          totalSubmitted: parseInt(metrics.submitted_count) || 0,
          overdue: parseInt(metrics.overdue_count) || 0,
          dueThisWeek: parseInt(metrics.due_this_week) || 0,
          dueIn3Days: parseInt(metrics.due_in_3_days) || 0
        },

        // Risk metrics
        risk: {
          highRiskCount: riskSummary.statistics.highRiskCount,
          avgRiskScore: riskSummary.statistics.avgRiskScore,
          proposals: riskSummary.proposals.slice(0, 5) // Top 5 by risk
        },

        // Compliance metrics
        compliance: {
          criticalCount: complianceSummary.statistics.criticalCount,
          avgScore: complianceSummary.statistics.avgComplianceScore,
          proposals: complianceSummary.proposals.slice(0, 5)
        },

        // Actionable insights (sorted by severity)
        actionableInsights: actionableInsights.sort((a, b) => {
          const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
        }),

        // News highlights
        news: {
          highlights: newsHighlights.highlights,
          usingFallback: newsHighlights.usingFallback
        },

        // Recent activity
        recentActivity,

        // Metadata
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
