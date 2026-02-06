/**
 * Assister Service
 * Handles API calls for assister dashboard and section access
 * (Reuses reviewer routes but with assister-specific naming)
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
  (error) => {
    return Promise.reject(error);
  }
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

export const assisterService = {
  /**
   * Get all assignments for the current assister
   * Returns sections from both platform and uploaded tenders
   */
  async getMyAssignments() {
    const response = await api.get('/assister/assignments');
    return response.data?.data || { assignments: [], stats: {} };
  },

  /**
   * Get section content for review/editing (platform tender)
   */
  async getProposalSection(proposalId, sectionId) {
    const response = await api.get(`/assister/proposals/${proposalId}/sections/${sectionId}`);
    return response.data?.data;
  },

  /**
   * Get section content for review/editing (uploaded tender)
   */
  async getUploadedSection(uploadedTenderId, sectionKey) {
    const response = await api.get(`/assister/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}`);
    return response.data?.data;
  },

  /**
   * Update section content (if permission is EDIT)
   */
  async updateSectionContent(proposalId, sectionId, content) {
    const response = await api.put(`/assister/proposals/${proposalId}/sections/${sectionId}`, {
      content,
    });
    return response.data?.data;
  },

  /**
   * Update uploaded section content (if permission is EDIT)
   */
  async updateUploadedSectionContent(uploadedTenderId, sectionKey, content) {
    const response = await api.put(`/assister/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}`, {
      content,
    });
    return response.data?.data;
  },

  /**
   * Get comments for a section
   */
  async getComments(proposalId, sectionId) {
    const response = await api.get(`/collaboration/proposals/${proposalId}/sections/${sectionId}/comments`);
    return response.data?.data || [];
  },

  /**
   * Get comments for uploaded tender section
   */
  async getUploadedComments(uploadedTenderId, sectionKey) {
    const response = await api.get(`/collaboration/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}/comments`);
    return response.data?.data || [];
  },

  /**
   * Add comment to a section
   */
  async addComment(proposalId, sectionId, content, parentCommentId = null) {
    const response = await api.post(`/collaboration/proposals/${proposalId}/sections/${sectionId}/comments`, {
      content,
      parentCommentId,
    });
    return response.data?.data;
  },

  /**
   * Add comment to uploaded tender section
   */
  async addUploadedComment(uploadedTenderId, sectionKey, content, parentCommentId = null) {
    const response = await api.post(`/collaboration/uploaded-tenders/${uploadedTenderId}/sections/${sectionKey}/comments`, {
      content,
      parentCommentId,
    });
    return response.data?.data;
  },
};

export default assisterService;
