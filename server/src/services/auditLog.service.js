/**
 * Audit Log Service
 * Tracks and stores audit logs for proposal actions including:
 * - CREATE, EDIT, SUBMIT, EXPORT, VIEW, AI_ASSIST
 *
 * Stores logs in database with optional in-memory caching for performance
 */

import { pool } from '../config/db.js';

// In-memory cache for recent logs (optional performance optimization)
const recentLogsCache = new Map();
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const AuditLogService = {
  /**
   * Initialize audit log table if not exists
   * Called on server startup
   */
  async initializeTable() {
    try {
      // Helper to check if a name is a base table
      const isBaseTable = async (tableName) => {
        const res = await pool.query(
          `SELECT table_type FROM information_schema.tables WHERE table_name = $1 LIMIT 1`,
          [tableName]
        );
        return res.rows.length > 0 && res.rows[0].table_type === 'BASE TABLE';
      };

      // Create the table without foreign key constraints first
      await pool.query(`
        CREATE TABLE IF NOT EXISTS proposal_audit_log (
          log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          proposal_id UUID,
          uploaded_tender_id UUID,
          user_id UUID,
          action VARCHAR(50) NOT NULL,
          action_category VARCHAR(50) NOT NULL,
          details JSONB DEFAULT '{}',
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_proposal_id ON proposal_audit_log(proposal_id);
        CREATE INDEX IF NOT EXISTS idx_audit_user_id ON proposal_audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON proposal_audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_audit_created_at ON proposal_audit_log(created_at DESC);
      `);

      // Helper to check if a specific column exists on a table
      const columnExists = async (tableName, columnName) => {
        const res = await pool.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
          [tableName, columnName]
        );
        return res.rows.length > 0;
      };

      // Flexible discovery: find proposal table and its PK column (proposal_id or id)
      const findTableAndPk = async (candidates) => {
        for (const t of candidates) {
          if (!(await isBaseTable(t))) continue;
          if (await columnExists(t, 'proposal_id')) return { table: t, column: 'proposal_id' };
          if (await columnExists(t, 'user_id')) return { table: t, column: 'user_id' };
          if (await columnExists(t, 'id')) return { table: t, column: 'id' };

          // Fallback: try to find primary key column
          const pkRes = await pool.query(
            `SELECT kcu.column_name FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu USING (constraint_name)
             WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY' LIMIT 1`,
            [t]
          );
          if (pkRes.rows.length) return { table: t, column: pkRes.rows[0].column_name };
        }
        return null;
      };

      // Check for proposal/proposals
      const proposalInfo = await findTableAndPk(['proposal', 'proposals']);
      if (proposalInfo) {
        try {
          await pool.query(`
            ALTER TABLE proposal_audit_log
            ADD CONSTRAINT fk_audit_proposal FOREIGN KEY (proposal_id)
            REFERENCES "${proposalInfo.table}"("${proposalInfo.column}") ON DELETE CASCADE;
          `);
          console.log('[AuditLog] FK to proposal added ->', proposalInfo);
        } catch (err) {
          console.warn('[AuditLog] Could not add FK to proposal:', err.message);
        }
      } else {
        console.warn('[AuditLog] proposal table not found (proposal/proposals) — skipping FK creation for proposal');
      }

      // Check for user/users
      const userInfo = await findTableAndPk(['user', 'users']);
      if (userInfo) {
        try {
          await pool.query(`
            ALTER TABLE proposal_audit_log
            ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
            REFERENCES "${userInfo.table}"("${userInfo.column}") ON DELETE SET NULL;
          `);
          console.log('[AuditLog] FK to user added ->', userInfo);
        } catch (err) {
          console.warn('[AuditLog] Could not add FK to user:', err.message);
        }
      } else {
        console.warn('[AuditLog] user table not found (user/users) — skipping FK creation for user');
      }

      console.log('[AuditLog] Audit log table initialized');
    } catch (err) {
      console.error('[AuditLog] Failed to initialize table:', err.message);
    }
  },

  /**
   * Log a proposal action
   * @param {Object} params - Log parameters
   * @returns {Object} Created log entry
   */
  async logAction({
    proposalId,
    uploadedTenderId = null,
    userId,
    action,
    actionCategory,
    details = {},
    ipAddress = null,
    userAgent = null
  }) {
    try {
      // Validate action types
      const validActions = [
        'CREATE', 'EDIT', 'SUBMIT', 'EXPORT', 'VIEW', 'DELETE',
        'AI_DRAFT', 'AI_ANALYZE', 'COMMENT_ADD', 'COMMENT_RESOLVE',
        'ASSIGN_COLLABORATOR', 'FINALIZE', 'PUBLISH', 'REVERT'
      ];

      const validCategories = [
        'PROPOSAL', 'SECTION', 'AI_ASSISTANCE', 'EXPORT', 'COLLABORATION', 'STATUS_CHANGE'
      ];

      if (!validActions.includes(action)) {
        console.warn(`[AuditLog] Unknown action type: ${action}`);
      }

      if (!validCategories.includes(actionCategory)) {
        console.warn(`[AuditLog] Unknown action category: ${actionCategory}`);
      }

      const result = await pool.query(
        `INSERT INTO proposal_audit_log
         (proposal_id, uploaded_tender_id, user_id, action, action_category, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING log_id, proposal_id, user_id, action, action_category, details, created_at`,
        [proposalId, uploadedTenderId, userId, action, actionCategory, JSON.stringify(details), ipAddress, userAgent]
      );

      const log = result.rows[0];

      // Update cache
      this.addToCache(proposalId || uploadedTenderId, log);

      return log;
    } catch (err) {
      console.error('[AuditLog] Failed to log action:', err.message);
      // Don't throw - audit logging should not break main functionality
      return null;
    }
  },

  /**
   * Get audit logs for a specific proposal
   * @param {string} proposalId - The proposal ID
   * @param {Object} options - Query options
   * @returns {Array} Audit logs
   */
  async getLogsForProposal(proposalId, { limit = 50, offset = 0, actions = null } = {}) {
    let query = `
      SELECT al.log_id, al.proposal_id, al.user_id, al.action, al.action_category,
             al.details, al.created_at, al.ip_address,
             u.name as user_name, u.email as user_email
      FROM proposal_audit_log al
      LEFT JOIN "user" u ON al.user_id = u.user_id
      WHERE al.proposal_id = $1
    `;

    const params = [proposalId];

    if (actions && actions.length > 0) {
      query += ` AND al.action = ANY($${params.length + 1})`;
      params.push(actions);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map(log => this.formatLogEntry(log));
  },

  /**
   * Get audit logs for an uploaded tender
   */
  async getLogsForUploadedTender(uploadedTenderId, { limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      `SELECT al.log_id, al.uploaded_tender_id, al.user_id, al.action, al.action_category,
              al.details, al.created_at,
              u.name as user_name, u.email as user_email
       FROM proposal_audit_log al
       LEFT JOIN "user" u ON al.user_id = u.user_id
       WHERE al.uploaded_tender_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2 OFFSET $3`,
      [uploadedTenderId, limit, offset]
    );

    return result.rows.map(log => this.formatLogEntry(log));
  },

  /**
   * Get audit logs for a user
   */
  async getLogsForUser(userId, { limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      `SELECT al.log_id, al.proposal_id, al.uploaded_tender_id, al.action, al.action_category,
              al.details, al.created_at,
              p.tender_id,
              t.title as tender_title
       FROM proposal_audit_log al
       LEFT JOIN proposal p ON al.proposal_id = p.proposal_id
       LEFT JOIN tender t ON p.tender_id = t.tender_id
       WHERE al.user_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(log => this.formatLogEntry(log));
  },

  /**
   * Get audit log count for a proposal
   */
  async getLogCount(proposalId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM proposal_audit_log WHERE proposal_id = $1',
      [proposalId]
    );
    return parseInt(result.rows[0].count);
  },

  /**
   * Get recent activity summary for dashboard
   */
  async getRecentActivitySummary(organizationId, { limit = 10 } = {}) {
    const result = await pool.query(
      `SELECT al.log_id, al.proposal_id, al.action, al.action_category, al.details, al.created_at,
              u.name as user_name,
              p.tender_id,
              t.title as tender_title
       FROM proposal_audit_log al
       JOIN "user" u ON al.user_id = u.user_id
       JOIN proposal p ON al.proposal_id = p.proposal_id
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.organization_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [organizationId, limit]
    );

    return result.rows.map(log => ({
      ...this.formatLogEntry(log),
      tenderTitle: log.tender_title
    }));
  },

  /**
   * Get activity statistics for dashboard
   */
  async getActivityStatistics(organizationId, { days = 7 } = {}) {
    const result = await pool.query(
      `SELECT
         al.action,
         COUNT(*) as count,
         DATE(al.created_at) as date
       FROM proposal_audit_log al
       JOIN proposal p ON al.proposal_id = p.proposal_id
       WHERE p.organization_id = $1
         AND al.created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY al.action, DATE(al.created_at)
       ORDER BY date DESC, count DESC`,
      [organizationId]
    );

    // Aggregate by action
    const actionCounts = {};
    const dailyActivity = {};

    for (const row of result.rows) {
      // Count by action
      actionCounts[row.action] = (actionCounts[row.action] || 0) + parseInt(row.count);

      // Count by date
      const dateStr = row.date.toISOString().split('T')[0];
      dailyActivity[dateStr] = (dailyActivity[dateStr] || 0) + parseInt(row.count);
    }

    return {
      actionCounts,
      dailyActivity,
      totalActions: Object.values(actionCounts).reduce((sum, c) => sum + c, 0),
      periodDays: days
    };
  },

  /**
   * Format a log entry for API response
   */
  formatLogEntry(log) {
    // Generate human-readable description
    const actionDescriptions = {
      CREATE: 'created the proposal',
      EDIT: 'edited a section',
      SUBMIT: 'submitted the proposal',
      EXPORT: 'exported the proposal',
      VIEW: 'viewed the proposal',
      DELETE: 'deleted content',
      AI_DRAFT: 'used AI to draft content',
      AI_ANALYZE: 'used AI to analyze content',
      COMMENT_ADD: 'added a comment',
      COMMENT_RESOLVE: 'resolved a comment',
      ASSIGN_COLLABORATOR: 'assigned a collaborator',
      FINALIZE: 'finalized the proposal',
      PUBLISH: 'published the proposal',
      REVERT: 'reverted to draft'
    };

    const description = actionDescriptions[log.action] || log.action.toLowerCase().replace(/_/g, ' ');

    return {
      id: log.log_id,
      proposalId: log.proposal_id,
      uploadedTenderId: log.uploaded_tender_id,
      userId: log.user_id,
      userName: log.user_name || 'System',
      userEmail: log.user_email,
      action: log.action,
      actionCategory: log.action_category,
      description,
      details: log.details,
      timestamp: log.created_at,
      formattedTime: this.formatTimestamp(log.created_at)
    };
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  },

  /**
   * Add log to in-memory cache
   */
  addToCache(key, log) {
    if (!key) return;

    // Clean old entries if cache is full
    if (recentLogsCache.size >= CACHE_MAX_SIZE) {
      const oldestKey = recentLogsCache.keys().next().value;
      recentLogsCache.delete(oldestKey);
    }

    const existing = recentLogsCache.get(key) || [];
    existing.unshift({ ...log, cachedAt: Date.now() });

    // Keep only recent entries
    const filtered = existing
      .filter(e => Date.now() - e.cachedAt < CACHE_TTL_MS)
      .slice(0, 20);

    recentLogsCache.set(key, filtered);
  },

  /**
   * Helper methods for common logging scenarios
   */
  async logProposalCreate(proposalId, userId, tenderId, req = null) {
    return this.logAction({
      proposalId,
      userId,
      action: 'CREATE',
      actionCategory: 'PROPOSAL',
      details: { tenderId },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  },

  async logSectionEdit(proposalId, userId, sectionId, sectionTitle, req = null) {
    return this.logAction({
      proposalId,
      userId,
      action: 'EDIT',
      actionCategory: 'SECTION',
      details: { sectionId, sectionTitle },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  },

  async logProposalSubmit(proposalId, userId, req = null) {
    return this.logAction({
      proposalId,
      userId,
      action: 'SUBMIT',
      actionCategory: 'STATUS_CHANGE',
      details: { newStatus: 'SUBMITTED' },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  },

  async logProposalExport(proposalId, userId, format, template, req = null) {
    return this.logAction({
      proposalId,
      userId,
      action: 'EXPORT',
      actionCategory: 'EXPORT',
      details: { format, template },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  },

  async logAIDraft(proposalId, userId, sectionId, sectionType, req = null) {
    return this.logAction({
      proposalId,
      userId,
      action: 'AI_DRAFT',
      actionCategory: 'AI_ASSISTANCE',
      details: { sectionId, sectionType },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  },

  async logAIAnalyze(proposalId, userId, sectionId, req = null) {
    return this.logAction({
      proposalId,
      userId,
      action: 'AI_ANALYZE',
      actionCategory: 'AI_ASSISTANCE',
      details: { sectionId },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }
};

export default AuditLogService;
