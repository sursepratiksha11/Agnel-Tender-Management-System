/**
 * Collaboration Service
 * Handles API calls for collaboration features (search, assignments, permissions)
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tms_token');
      localStorage.removeItem('tms_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const collaborationService = {
  /**
   * Search for assisters/users by email
   * @param {string} email - Email search term (min 3 chars)
   * @returns {Promise<Array>} List of users
   */
  async searchAssistersByEmail(email) {
    const response = await api.get('/collaboration/users/search', {
      params: { email },
    });
    return response.data?.data || [];
  },

  /**
   * Assign an assister to a section with permission
   * @param {string} proposalId - Proposal ID
   * @param {string} sectionId - Section ID
   * @param {string} userId - User ID to assign
   * @param {string} permission - 'EDIT' or 'READ_AND_COMMENT'
   * @returns {Promise<Object>} Assignment data
   */
  async assignAssisterToSection(proposalId, sectionId, userId, permission) {
    const response = await api.post(
      `/collaboration/proposals/${proposalId}/sections/${sectionId}/assign`,
      { userId, permission }
    );
    return response.data?.data;
  },

  /**
   * Assign an assister to an uploaded tender section with permission
   * @param {string} uploadedTenderId - Uploaded tender ID
   * @param {string} sectionKey - Section key
   * @param {string} userId - User ID to assign
   * @param {string} permission - 'EDIT' or 'READ_AND_COMMENT'
   * @returns {Promise<Object>} Assignment data
   */
  async assignAssisterToUploadedSection(uploadedTenderId, sectionKey, userId, permission) {
    const response = await api.post(
      `/collaboration/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}/assign`,
      { userId, permission }
    );
    return response.data?.data;
  },

  /**
   * Remove an assister from a section
   * @param {string} proposalId - Proposal ID
   * @param {string} sectionId - Section ID
   * @param {string} userId - User ID to remove
   * @returns {Promise<void>}
   */
  async removeAssisterFromSection(proposalId, sectionId, userId) {
    await api.delete(`/collaboration/proposals/${proposalId}/sections/${sectionId}/users/${userId}`);
  },

  /**
   * Remove an assister from an uploaded tender section
   * @param {string} uploadedTenderId - Uploaded tender ID
   * @param {string} sectionKey - Section key
   * @param {string} userId - User ID to remove
   * @returns {Promise<void>}
   */
  async removeAssisterFromUploadedSection(uploadedTenderId, sectionKey, userId) {
    await api.delete(
      `/collaboration/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}/users/${userId}`
    );
  },

  /**
   * Get collaboration data for a proposal
   * @param {string} proposalId - Proposal ID
   * @returns {Promise<Object>} Collaboration data with assignments
   */
  async getProposalCollaborationData(proposalId) {
    const response = await api.get(`/collaboration/proposals/${proposalId}/assignments`);
    return response.data?.data || {};
  },

  /**
   * Get collaboration data for an uploaded tender
   * @param {string} uploadedTenderId - Uploaded tender ID
   * @returns {Promise<Object>} Collaboration data with assignments
   */
  async getUploadedTenderCollaborationData(uploadedTenderId) {
    const response = await api.get(`/collaboration/uploaded-tenders/${uploadedTenderId}/assignments`);
    return response.data?.data || {};
  },
};

export default collaborationService;
