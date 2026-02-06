import { apiRequest } from './apiClient';

export const tenderService = {
  listTenders: (token, filters = {}) => {
    const search = new URLSearchParams(filters);
    const query = search.toString();
    return apiRequest(`/tenders${query ? `?${query}` : ''}`, { token });
  },
  
  createTender: (payload, token) => 
    apiRequest('/tenders', { method: 'POST', token, body: payload }),
  
  getTender: (id, token) => 
    apiRequest(`/tenders/${id}`, { token }),
  
  updateTender: (id, payload, token) => 
    apiRequest(`/tenders/${id}`, { method: 'PUT', token, body: payload }),
  
  publishTender: (id, token) => 
    apiRequest(`/tenders/${id}/publish`, { method: 'POST', token }),
  
  deleteTender: (id, token) => 
    apiRequest(`/tenders/${id}`, { method: 'DELETE', token }),
  
  addSection: (tenderId, payload, token) => 
    apiRequest(`/tenders/${tenderId}/sections`, { method: 'POST', token, body: payload }),
  
  updateSection: (sectionId, payload, token) => 
    apiRequest(`/tenders/sections/${sectionId}`, { method: 'PUT', token, body: payload }),
  
  deleteSection: (sectionId, token) => 
    apiRequest(`/tenders/sections/${sectionId}`, { method: 'DELETE', token }),
  
  reorderSections: (tenderId, orderedSectionIds, token) => 
    apiRequest(`/tenders/${tenderId}/sections/order`, { method: 'PUT', token, body: { orderedSectionIds } }),
};
