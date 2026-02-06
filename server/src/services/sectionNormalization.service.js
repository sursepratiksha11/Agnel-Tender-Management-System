/**
 * Section Normalization Service
 * Groups raw PDF sections into bidder-friendly high-level sections
 * Generates AI summaries using RAG retrieval
 *
 * TWO-STAGE PIPELINE:
 * - Stage 1 (Groq): Extract facts into strict JSON
 * - Stage 2 (Gemini): Format JSON into UI-ready text
 */

import { RAGOrchestrator } from '../utils/ragOrchestrator.js';
import { LLMCaller } from '../utils/llmCaller.js';
import { env } from '../config/env.js';
import AIPostProcessor from './ai/postProcessor.js';

const CHAT_MODEL = env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Normalized section definitions
const NORMALIZED_SECTIONS = {
  OVERVIEW: {
    name: 'Overview',
    keywords: ['introduction', 'overview', 'background', 'about', 'summary', 'preface', 'general'],
  },
  SCOPE: {
    name: 'Scope of Work',
    keywords: ['scope', 'work', 'deliverables', 'objectives', 'requirements', 'project', 'services'],
  },
  ELIGIBILITY: {
    name: 'Eligibility Criteria',
    keywords: ['eligibility', 'qualification', 'eligible', 'criteria', 'bidder', 'vendor', 'participant'],
  },
  COMMERCIAL: {
    name: 'Commercial & Financial Terms',
    keywords: ['commercial', 'financial', 'payment', 'price', 'cost', 'emd', 'deposit', 'fee', 'charges'],
  },
  EVALUATION: {
    name: 'Evaluation Criteria',
    keywords: ['evaluation', 'scoring', 'assessment', 'selection', 'marking', 'criteria', 'weightage'],
  },
  TIMELINE: {
    name: 'Timeline & Submission',
    keywords: ['timeline', 'schedule', 'deadline', 'submission', 'dates', 'milestones', 'calendar'],
  },
  PENALTIES: {
    name: 'Penalties, Risks & Liabilities',
    keywords: ['penalty', 'liquidated', 'damages', 'risk', 'liability', 'termination', 'breach'],
  },
  LEGAL: {
    name: 'Legal & Compliance',
    keywords: ['legal', 'compliance', 'terms', 'conditions', 'law', 'regulation', 'clause'],
  },
  ANNEXURES: {
    name: 'Annexures & BOQ',
    keywords: ['annexure', 'annex', 'appendix', 'boq', 'bill', 'quantity', 'attachment', 'schedule'],
  },
};

export const SectionNormalizationService = {
  /**
   * Normalize raw PDF sections into high-level bidder-friendly sections
   * @param {Array} rawSections - Raw sections from PDF parser
   * @param {string} sessionId - Session ID for RAG retrieval
   * @returns {Promise<Array>} Normalized sections with AI summaries
   */
  async normalizeSections(rawSections, sessionId = null) {
    console.log(`[Section Normalization] Processing ${rawSections.length} raw sections`);
    console.log(`[Section Normalization] sessionId: ${sessionId}`);

    // Step 1: Group raw sections into normalized categories
    const groupedSections = this._groupSections(rawSections);

    // Step 2: Generate AI summaries for each normalized section
    const normalizedSections = [];

    for (const [category, data] of Object.entries(groupedSections)) {
      if (data.sections.length === 0) continue;

      console.log(`[Section Normalization] Processing ${category}: ${data.sections.length} raw sections`);

      try {
        const summary = await this._generateSectionSummary(
          category,
          data.name,
          data.sections,
          sessionId
        );

        normalizedSections.push({
          category,
          name: data.name,
          aiSummary: summary.summary,
          keyPoints: summary.keyPoints,
          importantNumbers: summary.importantNumbers,
          rawSectionCount: data.sections.length,
        });
      } catch (err) {
        console.error(`[Section Normalization] Failed to generate summary for ${category}:`, err.message);
        
        // Fallback summary
        normalizedSections.push({
          category,
          name: data.name,
          aiSummary: this._getFallbackSummary(category, data.sections),
          keyPoints: this._extractBasicKeyPoints(data.sections),
          importantNumbers: [],
          rawSectionCount: data.sections.length,
        });
      }
    }

    console.log(`[Section Normalization] Created ${normalizedSections.length} normalized sections`);
    console.log('[Section Normalization] Categories created:', normalizedSections.map(s => s.category).join(', '));

    return normalizedSections;
  },

  /**
   * Group raw sections by category
   */
  _groupSections(rawSections) {
    const grouped = {};

    // Initialize groups
    Object.entries(NORMALIZED_SECTIONS).forEach(([category, config]) => {
      grouped[category] = {
        name: config.name,
        keywords: config.keywords,
        sections: [],
      };
    });

    // Categorize each raw section
    rawSections.forEach(section => {
      const sectionTitle = (section.title || '').toLowerCase();
      const sectionContent = (section.content || '').toLowerCase().substring(0, 500);
      
      let bestMatch = null;
      let bestScore = 0;

      // Find best matching category
      Object.entries(NORMALIZED_SECTIONS).forEach(([category, config]) => {
        let score = 0;
        
        config.keywords.forEach(keyword => {
          if (sectionTitle.includes(keyword)) score += 3;
          if (sectionContent.includes(keyword)) score += 1;
        });

        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      });

      // Assign to best match or OVERVIEW as default
      const targetCategory = bestMatch || 'OVERVIEW';
      grouped[targetCategory].sections.push(section);
    });

    return grouped;
  },

  /**
   * Generate AI summary for a normalized section
   *
   * TWO-STAGE PIPELINE:
   * Stage 1 (Groq): Extract facts into strict JSON
   * Stage 2 (Gemini): Format JSON into UI-ready text
   */
  async _generateSectionSummary(category, sectionName, rawSections, sessionId) {
    // Combine content from raw sections
    const combinedContent = rawSections
      .map(s => `${s.title}:\n${s.content}`)
      .join('\n\n')
      .substring(0, 4000); // Limit content

    // Use RAG to retrieve relevant context
    let ragContext = '';
    if (sessionId) {
      try {
        const ragResult = await RAGOrchestrator.retrieve({
          query: `${sectionName} ${combinedContent.substring(0, 300)}`,
          sessionId,
          analysisType: category.toLowerCase(),
          modelName: CHAT_MODEL,
        });

        ragContext = ragResult.context;
      } catch (err) {
        console.warn(`[Section Normalization] RAG retrieval failed for ${category}`);
      }
    }

    // ============================================
    // STAGE 1: GROQ FACT EXTRACTION
    // ============================================
    const groqSystemPrompt = `You are a fact extraction engine for tender document sections.

YOUR ONLY TASK: Extract factual information and output STRICT JSON.

CRITICAL RULES:
- Output ONLY valid JSON - no prose, no explanations
- Extract ONLY facts present in the provided content
- Use EXACT values from the document
- If information is NOT present, use null or empty array
- Do NOT infer or hallucinate any information`;

    const groqUserPrompt = `EXTRACT FACTS FROM THIS TENDER SECTION:

SECTION: ${sectionName}
CATEGORY: ${category}

${ragContext ? `CONTEXT:\n${ragContext}\n\n` : ''}CONTENT:\n${combinedContent}

OUTPUT STRICT JSON (no other text):
{
  "summary": "raw extracted summary of section content or null",
  "keyPoints": ["extracted point 1", "extracted point 2", "extracted point 3"],
  "importantNumbers": ["extracted number/date 1", "extracted number/date 2"]
}`;

    const groqResponse = await LLMCaller.call({
      systemPrompt: groqSystemPrompt,
      userPrompt: groqUserPrompt,
      model: CHAT_MODEL,
      temperature: 0, // Zero temperature for deterministic extraction
      maxTokens: 800,
    });

    // Parse Groq response
    const groqJson = this._parseAISummaryResponse(groqResponse, category, rawSections);

    // ============================================
    // STAGE 2: GEMINI FORMATTING
    // ============================================
    try {
      const formattingResult = await AIPostProcessor.formatSectionWithGemini(groqJson, sectionName);

      if (formattingResult.success) {
        return {
          summary: formattingResult.aiSummary || groqJson.summary,
          keyPoints: formattingResult.keyPoints || groqJson.keyPoints,
          importantNumbers: formattingResult.importantNumbers || groqJson.importantNumbers,
        };
      }
    } catch (err) {
      console.warn(`[Section Normalization] Gemini formatting failed for ${category}, using Groq output`);
    }

    // Fallback to Groq output if Gemini fails
    return groqJson;
  },

  /**
   * Parse AI summary response
   */
  _parseAISummaryResponse(response, category, rawSections) {
    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

      const parsed = JSON.parse(cleaned.trim());

      return {
        summary: parsed.summary || this._getFallbackSummary(category, rawSections),
        keyPoints: (parsed.keyPoints || []).slice(0, 5),
        importantNumbers: (parsed.importantNumbers || []).slice(0, 5),
      };
    } catch (err) {
      console.warn(`[Section Normalization] Failed to parse AI response for ${category}`);
      return {
        summary: this._getFallbackSummary(category, rawSections),
        keyPoints: this._extractBasicKeyPoints(rawSections),
        importantNumbers: [],
      };
    }
  },

  /**
   * Get fallback summary when AI fails
   */
  _getFallbackSummary(category, rawSections) {
    const summaries = {
      OVERVIEW: `This section provides an overview of the tender including background, objectives, and general information. ${rawSections.length} subsections available for detailed review.`,
      SCOPE: `Defines the scope of work, deliverables, and project requirements. Review detailed specifications in ${rawSections.length} subsections.`,
      ELIGIBILITY: `Outlines eligibility criteria and qualification requirements for bidders. ${rawSections.length} criteria sections to review.`,
      COMMERCIAL: `Covers commercial terms, financial requirements, payment conditions, and EMD details. ${rawSections.length} financial clauses included.`,
      EVALUATION: `Describes the evaluation methodology, scoring criteria, and selection process. ${rawSections.length} evaluation parameters defined.`,
      TIMELINE: `Specifies key dates, deadlines, submission timeline, and project milestones. ${rawSections.length} schedule-related sections.`,
      PENALTIES: `Details penalty clauses, liquidated damages, liabilities, and risk allocation. ${rawSections.length} risk-related clauses.`,
      LEGAL: `Contains legal terms, compliance requirements, and contractual conditions. ${rawSections.length} legal clauses to review.`,
      ANNEXURES: `Includes annexures, appendices, bill of quantities (BOQ), and supplementary documents. ${rawSections.length} attachments.`,
    };

    return summaries[category] || `This section contains ${rawSections.length} subsections with detailed information.`;
  },

  /**
   * Extract basic key points from raw sections
   */
  _extractBasicKeyPoints(rawSections) {
    const points = [];

    rawSections.slice(0, 5).forEach(section => {
      if (section.title) {
        points.push(section.title);
      }
    });

    if (points.length === 0) {
      points.push('Detailed requirements specified');
      points.push('Review complete section content');
    }

    return points.slice(0, 5);
  },
};
