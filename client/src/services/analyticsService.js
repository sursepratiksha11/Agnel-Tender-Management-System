import { apiRequest } from './apiClient.js';

const BASE_URL = '/analytics';

export const analyticsService = {
  async getAnalytics(token) {
    return apiRequest(`${BASE_URL}`, {
      method: 'GET',
      token,
    });
  },

  async getTenderPerformance(token) {
    return apiRequest(`${BASE_URL}/performance`, {
      method: 'GET',
      token,
    });
  },

  async getBidTimeline(token) {
    return apiRequest(`${BASE_URL}/bids/timeline`, {
      method: 'GET',
      token,
    });
  },

  async getEvaluationSummary(token) {
    return apiRequest(`${BASE_URL}/evaluation/summary`, {
      method: 'GET',
      token,
    });
  },
};
