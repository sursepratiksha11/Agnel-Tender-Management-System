/**
 * RAG Retrieval Orchestrator
 * Manages hybrid retrieval with strict limits and section-wise analysis
 */

import { pool } from '../config/db.js';
import { EmbeddingService } from '../services/embedding.service.js';
import { ContextCompressor } from './contextCompressor.js';
import { TokenCounter } from './tokenCounter.js';

// STRICT RETRIEVAL LIMITS (NON-NEGOTIABLE)
const RETRIEVAL_LIMITS = {
  SESSION_MIN: 5,
  SESSION_MAX: 8,
  GLOBAL_MIN: 3,
  GLOBAL_MAX: 5,
  ABSOLUTE_MAX: 10,
};

export const RAGOrchestrator = {
  /**
   * Perform hybrid retrieval with strict limits
   * @param {Object} options - Retrieval options
   * @param {string} options.query - User query
   * @param {string} options.sessionId - Session tender ID (uploaded tender)
   * @param {string} options.analysisType - Type of analysis (eligibility, technical, financial, risk)
   * @param {string} options.modelName - LLM model name
   * @returns {Promise<Object>} Retrieved and compressed context
   */
  async retrieve(options = {}) {
    const { query, sessionId, analysisType = 'general', modelName = 'default' } = options;

    if (!query) {
      throw new Error('Query is required for retrieval');
    }

    console.log(`[RAG] Starting retrieval for: ${analysisType}`);
    console.log(`[RAG] Query: ${query.substring(0, 100)}...`);

    // Step 1: Generate query embedding
    const queryEmbedding = await EmbeddingService.embed(query);

    // Step 2: Retrieve session chunks (from uploaded tender)
    let sessionChunks = [];
    if (sessionId) {
      const sessionLimit = this._getSessionLimit(analysisType);
      console.log(`[RAG] Retrieving ${sessionLimit} session chunks...`);

      const sessionRes = await pool.query(
        `SELECT content
         FROM tender_content_chunk
         WHERE tender_id = $1
         ORDER BY embedding <-> $2::vector
         LIMIT $3`,
        [sessionId, queryEmbedding, sessionLimit]
      );

      sessionChunks = sessionRes.rows.map(r => r.content).filter(Boolean);
      console.log(`[RAG] Retrieved ${sessionChunks.length} session chunks`);
    }

    // Step 3: Retrieve global chunks (from published tenders)
    const globalLimit = this._getGlobalLimit(analysisType);
    console.log(`[RAG] Retrieving ${globalLimit} global chunks...`);

    const globalRes = await pool.query(
      `SELECT tcc.content
       FROM tender_content_chunk tcc
       JOIN tender t ON tcc.tender_id = t.tender_id
       WHERE t.status = 'PUBLISHED'
         ${sessionId ? 'AND t.tender_id != $1' : ''}
       ORDER BY tcc.embedding <-> $${sessionId ? '2' : '1'}::vector
       LIMIT $${sessionId ? '3' : '2'}`,
      sessionId ? [sessionId, queryEmbedding, globalLimit] : [queryEmbedding, globalLimit]
    );

    const globalChunks = globalRes.rows.map(r => r.content).filter(Boolean);
    console.log(`[RAG] Retrieved ${globalChunks.length} global chunks`);

    // Step 4: Enforce absolute limit
    const totalChunks = sessionChunks.length + globalChunks.length;
    if (totalChunks > RETRIEVAL_LIMITS.ABSOLUTE_MAX) {
      console.warn(`[RAG] Total chunks (${totalChunks}) exceeds limit. Trimming...`);
      const excess = totalChunks - RETRIEVAL_LIMITS.ABSOLUTE_MAX;
      
      // Trim from global first
      if (globalChunks.length > excess) {
        globalChunks.splice(globalChunks.length - excess);
      } else {
        const remainingExcess = excess - globalChunks.length;
        globalChunks.length = 0;
        sessionChunks.splice(sessionChunks.length - remainingExcess);
      }
    }

    // Step 5: Compress chunks
    const budget = TokenCounter.getBudget(modelName);
    const contextBudget = budget.context;

    console.log(`[RAG] Context token budget: ${contextBudget}`);

    const compressedSession = ContextCompressor.compressToFit(
      sessionChunks,
      Math.floor(contextBudget * 0.6) // 60% of context for session
    );

    const compressedGlobal = ContextCompressor.compressToFit(
      globalChunks,
      Math.floor(contextBudget * 0.4) // 40% of context for global
    );

    // Step 6: Format context
    const sessionContext = ContextCompressor.formatContext(compressedSession, 'SESSION');
    const globalContext = ContextCompressor.formatContext(compressedGlobal, 'REFERENCE');

    const finalContext = [sessionContext, globalContext].filter(Boolean).join('\n\n');

    const stats = {
      retrieved: {
        session: sessionChunks.length,
        global: globalChunks.length,
        total: sessionChunks.length + globalChunks.length,
      },
      compressed: {
        session: compressedSession.length,
        global: compressedGlobal.length,
        total: compressedSession.length + compressedGlobal.length,
      },
      tokens: {
        estimated: TokenCounter.estimate(finalContext),
        budget: contextBudget,
        utilization: `${Math.round((TokenCounter.estimate(finalContext) / contextBudget) * 100)}%`,
      },
    };

    console.log(`[RAG] Retrieval stats:`, JSON.stringify(stats, null, 2));

    return {
      context: finalContext,
      sessionContext,
      globalContext,
      stats,
    };
  },

  /**
   * Get session chunk limit based on analysis type
   * @param {string} analysisType - Type of analysis
   * @returns {number} Chunk limit
   */
  _getSessionLimit(analysisType) {
    const limits = {
      eligibility: 6,
      technical: 7,
      financial: 6,
      risk: 5,
      evaluation: 6,
      general: 5,
    };

    return Math.min(limits[analysisType] || RETRIEVAL_LIMITS.SESSION_MIN, RETRIEVAL_LIMITS.SESSION_MAX);
  },

  /**
   * Get global chunk limit based on analysis type
   * @param {string} analysisType - Type of analysis
   * @returns {number} Chunk limit
   */
  _getGlobalLimit(analysisType) {
    const limits = {
      eligibility: 4,
      technical: 4,
      financial: 3,
      risk: 3,
      evaluation: 4,
      general: 3,
    };

    return Math.min(limits[analysisType] || RETRIEVAL_LIMITS.GLOBAL_MIN, RETRIEVAL_LIMITS.GLOBAL_MAX);
  },

  /**
   * Build section-specific analysis query
   * @param {string} analysisType - Type of analysis
   * @param {string} content - Content to analyze
   * @returns {string} Optimized query
   */
  buildSectionQuery(analysisType, content = '') {
    const queries = {
      eligibility: 'eligibility criteria requirements qualifications certifications experience financial capacity',
      technical: 'technical specifications standards quality requirements materials resources',
      financial: 'financial terms EMD payment conditions pricing penalties liquidated damages',
      risk: 'penalties risk factors liquidated damages termination force majeure dispute resolution',
      evaluation: 'evaluation criteria scoring methodology selection process weightage',
    };

    let baseQuery = queries[analysisType] || 'tender requirements';

    // Add content snippet if available
    if (content) {
      const contentSnippet = content.substring(0, 200).trim();
      baseQuery += ' ' + contentSnippet;
    }

    return baseQuery;
  },
};
