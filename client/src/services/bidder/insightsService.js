/**
 * Insights Service
 * API client for risk assessment, compliance, audit logs, and news feeds
 */

import api from './api';

export const insightsService = {
  // ==========================================
  // RISK ASSESSMENT
  // ==========================================

  /**
   * Get risk assessment for a specific proposal
   * @param {string} proposalId
   * @returns {Promise<Object>} Risk assessment data
   */
  async getProposalRisk(proposalId) {
    const response = await api.get(`/bidder/proposals/${proposalId}/risk`);
    return response.data;
  },

  /**
   * Get risk summary for all draft proposals
   * @returns {Promise<Object>} Risk summary for organization
   */
  async getRiskSummary() {
    const response = await api.get('/insights/risk/summary/organization');
    return response.data;
  },

  // ==========================================
  // COMPLIANCE CHECKS
  // ==========================================

  /**
   * Get compliance check for a specific proposal
   * @param {string} proposalId
   * @returns {Promise<Object>} Compliance check results
   */
  async getProposalCompliance(proposalId) {
    const response = await api.get(`/bidder/proposals/${proposalId}/compliance`);
    return response.data;
  },

  /**
   * Get quick compliance check (lightweight)
   * @param {string} proposalId
   * @returns {Promise<Object>} Quick compliance status
   */
  async getQuickCompliance(proposalId) {
    const response = await api.get(`/insights/compliance/quick/${proposalId}`);
    return response.data;
  },

  /**
   * Get compliance summary for all proposals
   * @returns {Promise<Object>} Compliance summary for organization
   */
  async getComplianceSummary() {
    const response = await api.get('/insights/compliance/summary/organization');
    return response.data;
  },

  // ==========================================
  // AUDIT LOGS
  // ==========================================

  /**
   * Get audit logs for a specific proposal
   * @param {string} proposalId
   * @param {Object} options - { limit, offset, actions }
   * @returns {Promise<Object>} Audit logs with pagination
   */
  async getProposalAuditLogs(proposalId, { limit = 50, offset = 0, actions = null } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (actions) params.append('actions', actions.join(','));

    const response = await api.get(`/bidder/proposals/${proposalId}/audit?${params}`);
    return response.data;
  },

  /**
   * Get recent activity for the organization
   * @param {number} limit
   * @returns {Promise<Array>} Recent activity entries
   */
  async getRecentActivity(limit = 10) {
    const response = await api.get(`/insights/audit/activity/recent?limit=${limit}`);
    return response.data;
  },

  /**
   * Get activity statistics
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} Activity statistics
   */
  async getActivityStatistics(days = 7) {
    const response = await api.get(`/insights/audit/activity/statistics?days=${days}`);
    return response.data;
  },

  // ==========================================
  // NEWS & RSS FEEDS
  // ==========================================

  /**
   * Get aggregated news from RSS feeds
   * @param {Object} options - { limit, categories }
   * @returns {Promise<Object>} News items
   */
  async getNews({ limit = 10, categories = null } = {}) {
    const params = new URLSearchParams({ limit });
    if (categories) params.append('categories', categories.join(','));

    const response = await api.get(`/insights/news?${params}`);
    return response.data;
  },

  /**
   * Get news highlights for dashboard widget
   * @param {number} limit
   * @returns {Promise<Object>} News highlights
   */
  async getNewsHighlights(limit = 5) {
    const response = await api.get(`/insights/news/highlights?limit=${limit}`);
    return response.data;
  },

  /**
   * Get available news sources
   * @returns {Promise<Array>} Feed sources
   */
  async getNewsSources() {
    const response = await api.get('/insights/news/sources');
    return response.data;
  },

  // ==========================================
  // DASHBOARD INSIGHTS
  // ==========================================

  /**
   * Get comprehensive dashboard insights
   * @returns {Promise<Object>} All dashboard insights in one call
   */
  async getDashboardInsights() {
    const response = await api.get('/insights/dashboard');
    return response.data;
  }
};

export default insightsService;
