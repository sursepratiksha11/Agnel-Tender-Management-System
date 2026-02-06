import { apiRequest } from './apiClient';

export const proposalService = {
  listMine: (token) => apiRequest('/proposals/mine', { token }),
  createDraft: (tenderId, token) => apiRequest('/proposals', { method: 'POST', token, body: { tenderId } }),
  getProposal: (id, token) => apiRequest(`/proposals/${id}`, { token }),
  saveSectionResponse: (proposalId, sectionId, content, token) =>
    apiRequest(`/proposals/${proposalId}/sections/${sectionId}`, {
      method: 'PUT',
      token,
      body: { content },
    }),
  submit: (proposalId, token) => apiRequest(`/proposals/${proposalId}/submit`, { method: 'POST', token }),
};
