import { apiRequest } from './apiClient';

export const evaluationService = {
  // Get list of tenders ready for evaluation
  getTendersForEvaluation: (token) =>
    apiRequest('/evaluation/tenders', { token }),

  // Get bids for a specific tender
  getBidsForTender: (tenderId, token) =>
    apiRequest(`/evaluation/tenders/${tenderId}/bids`, { token }),

  // Initialize evaluation for a tender
  initializeTenderEvaluation: (tenderId, token) =>
    apiRequest(`/evaluation/tenders/${tenderId}/initialize`, { 
      method: 'POST', 
      token 
    }),

  // Update bid evaluation
  updateBidEvaluation: (proposalId, data, token) =>
    apiRequest(`/evaluation/bids/${proposalId}`, {
      method: 'PUT',
      body: data,
      token
    }),

  // Complete evaluation for a tender
  completeEvaluation: (tenderId, token) =>
    apiRequest(`/evaluation/tenders/${tenderId}/complete`, {
      method: 'POST',
      token
    }),

  // Get evaluation details for a tender
  getTenderEvaluationDetails: (tenderId, token) =>
    apiRequest(`/evaluation/tenders/${tenderId}/details`, { token }),
};
