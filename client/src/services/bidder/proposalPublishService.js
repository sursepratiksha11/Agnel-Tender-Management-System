/**
 * Proposal Publish Service
 *
 * Client-side service for proposal publishing workflow.
 * Connected to backend API endpoints.
 *
 * @module proposalPublishService
 */

import api from './api';

/**
 * Proposal statuses in the publishing workflow
 */
export const PROPOSAL_STATUS = {
  DRAFT: 'DRAFT',
  FINAL: 'FINAL',
  PUBLISHED: 'PUBLISHED',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
};

/**
 * Status transition rules
 */
export const STATUS_TRANSITIONS = {
  DRAFT: ['FINAL', 'SUBMITTED'],
  FINAL: ['DRAFT', 'PUBLISHED'],
  PUBLISHED: [], // Cannot transition from PUBLISHED
  SUBMITTED: [], // Cannot transition from SUBMITTED
  UNDER_REVIEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: []
};

export const proposalPublishService = {
  /**
   * Finalize a proposal (DRAFT → FINAL)
   *
   * @param {string} proposalId - The proposal ID to finalize
   * @returns {Promise<Object>} - Updated proposal data
   */
  finalizeProposal: async (proposalId) => {
    try {
      const response = await api.post(`/bidder/proposals/${proposalId}/finalize`);
      return response.data;
    } catch (error) {
      console.error('[Publish Service] Finalize failed:', error);
      const errorData = error.response?.data || {};
      const err = new Error(errorData.error || errorData.message || 'Failed to finalize proposal');
      err.incompleteSections = errorData.incompleteSections;
      throw err;
    }
  },

  /**
   * Publish a proposal (FINAL → PUBLISHED)
   *
   * @param {string} proposalId - The proposal ID to publish
   * @returns {Promise<Object>} - Updated proposal data
   */
  publishProposal: async (proposalId) => {
    try {
      const response = await api.post(`/bidder/proposals/${proposalId}/publish`);
      return response.data;
    } catch (error) {
      console.error('[Publish Service] Publish failed:', error);
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to publish proposal');
    }
  },

  /**
   * Revert a finalized proposal back to draft (FINAL → DRAFT)
   *
   * @param {string} proposalId - The proposal ID to revert
   * @returns {Promise<Object>} - Updated proposal data
   */
  revertToDraft: async (proposalId) => {
    try {
      const response = await api.post(`/bidder/proposals/${proposalId}/revert`);
      return response.data;
    } catch (error) {
      console.error('[Publish Service] Revert failed:', error);
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to revert proposal');
    }
  },

  /**
   * Create a new version of a published proposal
   *
   * @param {string} proposalId - The proposal ID to create version from
   * @returns {Promise<Object>} - New proposal version data
   */
  createNewVersion: async (proposalId) => {
    try {
      const response = await api.post(`/bidder/proposals/${proposalId}/new-version`);
      return response.data;
    } catch (error) {
      console.error('[Publish Service] Create version failed:', error);
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to create new version');
    }
  },

  /**
   * Get version history for a proposal
   *
   * @param {string} proposalId - The proposal ID
   * @returns {Promise<Object>} - Version history data
   */
  getVersionHistory: async (proposalId) => {
    try {
      const response = await api.get(`/bidder/proposals/${proposalId}/versions`);
      return response.data;
    } catch (error) {
      console.error('[Publish Service] Get versions failed:', error);
      throw new Error(error.response?.data?.error || 'Failed to get version history');
    }
  },

  /**
   * Get a specific version snapshot
   *
   * @param {string} proposalId - The proposal ID
   * @param {number} versionNumber - The version number to retrieve
   * @returns {Promise<Object>} - Version snapshot data
   */
  getVersionSnapshot: async (proposalId, versionNumber) => {
    try {
      const response = await api.get(`/bidder/proposals/${proposalId}/versions/${versionNumber}`);
      return response.data;
    } catch (error) {
      console.error('[Publish Service] Get version snapshot failed:', error);
      throw new Error(error.response?.data?.error || 'Failed to get version snapshot');
    }
  },

  /**
   * Check if a status transition is valid
   *
   * @param {string} currentStatus - Current proposal status
   * @param {string} targetStatus - Target status to transition to
   * @returns {boolean} - Whether the transition is valid
   */
  canTransitionTo: (currentStatus, targetStatus) => {
    const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    return validTransitions.includes(targetStatus);
  },

  /**
   * Get the next available status for a proposal
   *
   * @param {string} currentStatus - Current proposal status
   * @returns {Array<string>} - Array of valid next statuses
   */
  getNextStatuses: (currentStatus) => {
    return STATUS_TRANSITIONS[currentStatus] || [];
  }
};

export default proposalPublishService;
