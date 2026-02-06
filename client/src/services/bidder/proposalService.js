import api from './api';

export const proposalService = {
  createProposal: async (tenderId) => {
    const response = await api.post('/bidder/proposals', { tenderId });
    return response;
  },

  getMyProposals: async (params) => {
    const response = await api.get('/bidder/proposals/my-proposals', { params });
    return response;
  },

  getProposalById: async (id) => {
    const response = await api.get(`/bidder/proposals/${id}`);
    return response;
  },

  // Get proposal by tender ID (used for workspace)
  getProposalByTenderId: async (tenderId) => {
    const response = await api.get(`/bidder/proposals/tender/${tenderId}`);
    return response;
  },

  updateProposalSection: async (proposalId, sectionId, content) => {
    const response = await api.put(
      `/bidder/proposals/${proposalId}/sections/${sectionId}`,
      { content }
    );
    return response;
  },

  submitProposal: async (proposalId) => {
    try {
      const response = await api.post(`/bidder/proposals/${proposalId}/submit`);
      return response;
    } catch (error) {
      // Re-throw with validation details intact
      if (error.response?.data) {
        const err = new Error(error.response.data.error || 'Submission failed');
        err.response = error.response;
        throw err;
      }
      throw error;
    }
  },

  /**
   * Get AI analysis for a proposal section (advisory only)
   * No auto-write, no auto-apply
   * Backend ALWAYS returns HTTP 200 with fallback on error
   */
  analyzeSectionAsync: async (proposalId, sectionId, data) => {
    const { draftContent, tenderRequirement, sectionType, userQuestion } = data;
    
    try {
      const response = await api.post(
        `/bidder/proposals/${proposalId}/sections/${sectionId}/analyze`,
        {
          draftContent,
          tenderRequirement,
          sectionType,
          userQuestion
        }
      );
      
      // Backend always returns { success: true, data: { analysis } }
      // analysis has structure: { mode: 'ai'|'fallback', suggestions: [...] }
      const analysis = response.data?.data?.analysis;
      
      if (!analysis || !analysis.suggestions) {
        throw new Error('Invalid response format');
      }
      
      return {
        success: true,
        analysis: analysis
      };
      
    } catch (error) {
      // Network error or invalid response - provide emergency fallback
      console.error('[Proposal Service] AI analysis request failed:', error.message);
      
      return {
        success: false,
        analysis: {
          mode: 'fallback',
          suggestions: [{
            observation: 'Unable to connect to analysis service',
            suggestedImprovement: 'Review your draft manually against tender requirements',
            reason: 'Network error or service unavailable. Please check your connection and try again.'
          }]
        }
      };
    }
  },

  checkCompliance: async (sectionId) => {
    const response = await api.post(`/bidder/proposals/sections/${sectionId}/check-compliance`);
    return response;
  },

  getAnalytics: async () => {
    const response = await api.get('/bidder/proposals/analytics');
    return response;
  },
};

