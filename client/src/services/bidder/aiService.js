import api from './api';

export const aiService = {
  /**
   * RAG-based tender chat - queries tender content using vector similarity search
   * This is the main chatbot function for bidders analyzing tenders
   * Uses embeddings to find relevant tender sections and provides contextual answers
   */
  tenderChat: async (tenderId, question) => {
    const response = await api.post('/ai/query', {
      tenderId,
      question
    });
    return response;
  },

  /**
   * Analyze tender for insights (match score, strengths, concerns)
   */
  analyzeTender: async (tenderId) => {
    const response = await api.post('/bidder/tenders/' + tenderId + '/analyze', {
      question: 'Analyze this tender comprehensively. Provide: 1) Key requirements summary, 2) Potential risks, 3) Strategic recommendations for bidding.'
    });
    return response;
  },

  /**
   * Get basic tender summary (rule-based with light AI enhancement)
   * Returns: executive summary, key requirements, risks, opportunity score
   */
  getTenderSummary: async (tenderId) => {
    const response = await api.get('/bidder/tenders/' + tenderId + '/summary');
    return response;
  },

  /**
   * Get comprehensive AI-powered tender summary with bullet points
   * Returns: executive summary, bullet points by category, section summaries, action items
   */
  getComprehensiveSummary: async (tenderId) => {
    const response = await api.get('/bidder/tenders/' + tenderId + '/ai-summary');
    return response;
  },

  /**
   * Get quick summary for list views (lightweight)
   */
  getQuickSummary: async (tenderId) => {
    const response = await api.get('/bidder/tenders/' + tenderId + '/quick-summary');
    return response;
  },

  /**
   * Generate AI draft for a specific tender section
   * @param {string} tenderId - Tender UUID
   * @param {Object} options - { sectionId, sectionType, tenderRequirement, organizationContext?, customInstructions? }
   */
  generateSectionDraft: async (tenderId, options) => {
    const response = await api.post('/bidder/tenders/' + tenderId + '/generate-section-draft', options);
    return response;
  },

  /**
   * Generate AI draft for all sections of a tender
   * @param {string} tenderId - Tender UUID
   * @param {string} organizationContext - Optional context about the bidder organization
   */
  generateFullDraft: async (tenderId, organizationContext) => {
    const response = await api.post('/bidder/tenders/' + tenderId + '/generate-full-draft', {
      organizationContext
    });
    return response;
  },

  /**
   * Improve existing draft content with AI
   * @param {Object} options - { existingDraft, sectionType, tenderRequirement, improvementFocus }
   * improvementFocus: 'clarity' | 'detail' | 'compliance' | 'professional'
   */
  improveDraft: async (options) => {
    // Using a placeholder ID since this is a stateless operation
    const response = await api.post('/bidder/proposals/_/improve-draft', options);
    return response;
  },

  /**
   * Generate a content snippet for inline assistance
   * @param {Object} options - { snippetType, context, length }
   * snippetType: 'experience' | 'certification' | 'methodology' | 'compliance' | 'financial'
   * length: 'short' | 'medium' | 'long'
   */
  generateSnippet: async (options) => {
    const response = await api.post('/bidder/proposals/generate-snippet', options);
    return response;
  },

  suggestSections: async (data) => {
    const response = await api.post('/ai/suggest-sections', data);
    return response;
  },

  explain: async (data) => {
    const response = await api.post('/ai/explain', data);
    return response;
  },

  generateContent: async (data) => {
    const response = await api.post('/ai/generate-content', data);
    return response;
  },

  rewriteLegal: async (data) => {
    const response = await api.post('/ai/rewrite-legal', data);
    return response;
  },

  proposalHelp: async (data) => {
    const response = await api.post('/ai/proposal-help', data);
    return response;
  },

  checkCompliance: async (data) => {
    const response = await api.post('/ai/check-compliance', data);
    return response;
  },
};
