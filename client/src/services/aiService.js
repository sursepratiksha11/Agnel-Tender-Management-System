import { apiRequest } from "./apiClient";

// AI Service for handling AI-related API calls
export const aiService = {
  /**
   * Get AI assistance for tender drafting
   * @param {Object} params - Request parameters
   * @param {string} params.mode - "section" or "tender"
   * @param {string} params.sectionType - Section key (for section mode)
   * @param {string} params.existingContent - Current section/tender content
   * @param {Object} params.tenderMetadata - Tender metadata (department, sector, etc.)
   * @param {string} params.userQuestion - User's question/request
   * @param {string} token - Auth token
   * @returns {Promise} - Suggestion response with observation, suggestedText, reason
   */
  async assist(params, token) {
    const response = await apiRequest("/ai/assist", {
      method: "POST",
      body: params,
      token: token
    });
    return response;
  },

  /**
   * Query published tender (existing method)
   */
  async queryTender(tenderId, question, token) {
    const response = await apiRequest("/ai/query", {
      method: "POST",
      body: { tenderId, question },
      token: token
    });
    return response;
  },
};
