import api from './api';

export const tenderService = {
  // Discover tenders (for bidders)
  discoverTenders: async (params) => {
    const response = await api.get('/bidder/tenders', { params });
    return response;
  },

  // Get full tender details with sections (for bidders)
  getTenderFullDetails: async (id) => {
    const response = await api.get(`/bidder/tenders/${id}`);
    return response;
  },

  // ==========================================
  // SAVED TENDERS
  // ==========================================

  // Get all saved tenders
  getSavedTenders: async (params = {}) => {
    const response = await api.get('/bidder/saved-tenders', { params });
    return response;
  },

  // Get saved tender IDs for quick lookup
  getSavedTenderIds: async () => {
    const response = await api.get('/bidder/saved-tenders/ids');
    return response;
  },

  // Save a tender
  saveTender: async (tenderId, isUploaded = false) => {
    const body = isUploaded ? { uploadedTenderId: tenderId } : { tenderId };
    const response = await api.post('/bidder/saved-tenders', body);
    return response;
  },

  // Unsave a tender
  unsaveTender: async (tenderId, isUploaded = false) => {
    const body = isUploaded ? { uploadedTenderId: tenderId } : { tenderId };
    const response = await api.delete('/bidder/saved-tenders', { data: body });
    return response;
  },

  // Toggle save status
  toggleSaveTender: async (tenderId, isUploaded = false) => {
    const body = isUploaded ? { uploadedTenderId: tenderId } : { tenderId };
    const response = await api.post('/bidder/saved-tenders/toggle', body);
    return response;
  },

  // Other methods (authority-side, not used by bidder UI but keeping for completeness)
  createTender: async (data) => {
    const response = await api.post('/tenders', data);
    return response;
  },

  getTenders: async (params) => {
    const response = await api.get('/tenders', { params });
    return response;
  },

  getTenderById: async (id) => {
    const response = await api.get(`/tenders/${id}`);
    return response;
  },

  updateTender: async (id, data) => {
    const response = await api.put(`/tenders/${id}`, data);
    return response;
  },

  publishTender: async (id) => {
    const response = await api.post(`/tenders/${id}/publish`);
    return response;
  },

  uploadDocument: async (tenderId, file) => {
    const formData = new FormData();
    formData.append('document', file);
    const response = await api.post(`/tenders/${tenderId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  analyzeTender: async (data) => {
    const response = await api.post('/tenders/analyze', data);
    return response;
  },

  searchContent: async (data) => {
    const response = await api.post('/tenders/search-content', data);
    return response;
  },

  createSection: async (tenderId, data) => {
    const response = await api.post(`/tenders/${tenderId}/sections`, data);
    return response;
  },

  getSections: async (tenderId) => {
    const response = await api.get(`/tenders/${tenderId}/sections`);
    return response;
  },

  updateSection: async (sectionId, data) => {
    const response = await api.put(`/sections/${sectionId}`, data);
    return response;
  },

  lockSection: async (sectionId) => {
    const response = await api.post(`/sections/${sectionId}/lock`);
    return response;
  },

  deleteSection: async (sectionId) => {
    const response = await api.delete(`/sections/${sectionId}`);
    return response;
  },
};
