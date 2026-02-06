/**
 * Collaboration Service
 * Client-side service for collaborative proposal drafting
 */

import api from './api';

export const collaborationService = {
  // ==========================================
  // USER SEARCH
  // ==========================================

  /**
   * Search users by email within the organization
   * @param {string} email - Email to search (min 3 chars)
   * @returns {Promise<Array>} List of users [{user_id, name, email}]
   */
  async searchUsers(email) {
    if (!email || email.length < 3) {
      return [];
    }
    const response = await api.get('/collaboration/users/search', {
      params: { email },
    });
    return response.data?.data || [];
  },

  // ==========================================
  // PLATFORM TENDER - ASSIGNMENTS
  // ==========================================

  /**
   * Get all collaboration data for a proposal
   * @param {string} proposalId
   * @returns {Promise<Object>} { isOwner, proposal, assignments, userPermissions, lastEdits, recentActivity }
   */
  async getCollaborationData(proposalId) {
    const response = await api.get(`/collaboration/proposals/${proposalId}/assignments`);
    return response.data?.data || {};
  },

  /**
   * Assign a user to a section
   * @param {string} proposalId
   * @param {string} sectionId
   * @param {string} userId
   * @param {string} permission - 'EDIT' or 'READ_AND_COMMENT'
   */
  async assignUser(proposalId, sectionId, userId, permission) {
    const response = await api.post(
      `/collaboration/proposals/${proposalId}/sections/${sectionId}/assign`,
      { userId, permission }
    );
    return response.data?.data;
  },

  /**
   * Remove user assignment from a section
   */
  async removeAssignment(proposalId, sectionId, userId) {
    const response = await api.delete(
      `/collaboration/proposals/${proposalId}/sections/${sectionId}/users/${userId}`
    );
    return response.data;
  },

  // ==========================================
  // PLATFORM TENDER - COMMENTS
  // ==========================================

  /**
   * Get comments for a section
   */
  async getComments(proposalId, sectionId) {
    const response = await api.get(
      `/collaboration/proposals/${proposalId}/sections/${sectionId}/comments`
    );
    return response.data?.data || [];
  },

  /**
   * Create a comment
   * @param {Object} params - { proposalId, sectionId, content, parentCommentId?, quotedText? }
   */
  async createComment({ proposalId, sectionId, content, parentCommentId, quotedText }) {
    const response = await api.post(
      `/collaboration/proposals/${proposalId}/sections/${sectionId}/comments`,
      { content, parentCommentId, quotedText }
    );
    return response.data?.data;
  },

  /**
   * Update a comment
   */
  async updateComment(commentId, content) {
    const response = await api.put(`/collaboration/comments/${commentId}`, { content });
    return response.data?.data;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId, proposalId) {
    const response = await api.delete(`/collaboration/comments/${commentId}`, {
      params: { proposalId },
    });
    return response.data;
  },

  /**
   * Resolve a comment thread
   */
  async resolveComment(commentId) {
    const response = await api.post(`/collaboration/comments/${commentId}/resolve`);
    return response.data;
  },

  /**
   * Unresolve a comment thread
   */
  async unresolveComment(commentId) {
    const response = await api.post(`/collaboration/comments/${commentId}/unresolve`);
    return response.data;
  },

  /**
   * Get comment counts per section
   */
  async getCommentCounts(proposalId) {
    const response = await api.get(`/collaboration/proposals/${proposalId}/comment-counts`);
    return response.data?.data || {};
  },

  // ==========================================
  // PLATFORM TENDER - AI DRAFTING
  // ==========================================

  /**
   * Generate AI draft for a section
   * @param {string} proposalId
   * @param {string} sectionId
   * @param {string} customInstructions - Optional instructions
   */
  async generateDraft(proposalId, sectionId, customInstructions = '') {
    const response = await api.post(
      `/collaboration/proposals/${proposalId}/sections/${sectionId}/generate-draft`,
      { customInstructions }
    );
    return response.data?.data;
  },

  // ==========================================
  // PLATFORM TENDER - VALIDATION
  // ==========================================

  /**
   * Validate proposal against tender requirements
   */
  async validateProposal(proposalId) {
    const response = await api.post(`/collaboration/proposals/${proposalId}/validate`);
    return response.data?.data;
  },

  // ==========================================
  // PLATFORM TENDER - ACTIVITY
  // ==========================================

  /**
   * Get activity log for a proposal
   */
  async getActivity(proposalId, limit = 50) {
    const response = await api.get(`/collaboration/proposals/${proposalId}/activity`, {
      params: { limit },
    });
    return response.data?.data || [];
  },

  // ==========================================
  // UPLOADED TENDER - ASSIGNMENTS
  // ==========================================

  /**
   * Get collaboration data for uploaded tender
   */
  async getUploadedCollaborationData(uploadedTenderId) {
    const response = await api.get(
      `/collaboration/uploaded-tenders/${uploadedTenderId}/assignments`
    );
    return response.data?.data || {};
  },

  /**
   * Assign user to uploaded tender section
   */
  async assignUserToUploaded(uploadedTenderId, sectionKey, userId, permission) {
    const response = await api.post(
      `/collaboration/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}/assign`,
      { userId, permission }
    );
    return response.data?.data;
  },

  /**
   * Remove user from uploaded tender section
   */
  async removeUploadedAssignment(uploadedTenderId, sectionKey, userId) {
    const response = await api.delete(
      `/collaboration/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}/users/${userId}`
    );
    return response.data;
  },

  // ==========================================
  // UPLOADED TENDER - COMMENTS
  // ==========================================

  /**
   * Get comments for uploaded tender section
   */
  async getUploadedComments(uploadedTenderId, sectionKey) {
    const response = await api.get(
      `/collaboration/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}/comments`
    );
    return response.data?.data || [];
  },

  /**
   * Create comment on uploaded tender section
   */
  async createUploadedComment({ uploadedTenderId, sectionKey, content, parentCommentId, quotedText }) {
    const response = await api.post(
      `/collaboration/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}/comments`,
      { content, parentCommentId, quotedText }
    );
    return response.data?.data;
  },

  // ==========================================
  // UPLOADED TENDER - AI DRAFTING
  // ==========================================

  /**
   * Generate AI draft for uploaded tender section
   */
  async generateUploadedDraft(uploadedTenderId, sectionKey, customInstructions = '') {
    const response = await api.post(
      `/collaboration/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}/generate-draft`,
      { customInstructions }
    );
    return response.data?.data;
  },

  // ==========================================
  // UPLOADED TENDER - VALIDATION
  // ==========================================

  /**
   * Validate uploaded tender proposal
   */
  async validateUploadedProposal(uploadedTenderId) {
    const response = await api.post(
      `/collaboration/uploaded-tenders/${uploadedTenderId}/validate`
    );
    return response.data?.data;
  },
};

export default collaborationService;
