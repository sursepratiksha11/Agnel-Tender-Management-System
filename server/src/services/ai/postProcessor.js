/**
 * AI Post-Processor Service (Gemini)
 *
 * STAGE 2 of Two-Stage AI Pipeline:
 *
 * STAGE 1 (Groq): RAG-based fact extraction → Strict JSON output
 * STAGE 2 (Gemini): Format JSON → Clean, UI-ready text
 *
 * STRICT RULES:
 * - Gemini is ONLY a formatter, NOT an analyst
 * - Gemini NEVER sees PDFs or embeddings
 * - Gemini NEVER reasons about correctness
 * - Gemini NEVER adds new facts or infers information
 * - Gemini NEVER uses external knowledge
 * - Gemini ONLY reformats provided JSON data
 * - If info missing, says "Not specified in the analysis output"
 */

import { LLMCaller } from '../../utils/llmCaller.js';
import { env } from '../../config/env.js';

const GEMINI_MODEL = 'gemini-1.5-flash';

const FORMATTING_SYSTEM_PROMPT = `You are a formatter and technical writer for government tender documents.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
1. You are NOT an analyst. You are ONLY a FORMATTER.
2. You MUST NOT add or infer any information beyond what is provided in the input JSON.
3. You MUST NOT use external knowledge, context, or make assumptions.
4. You MUST NOT hallucinate values, dates, amounts, or requirements.
5. You may ONLY rephrase, structure, and format the given data.
6. If information is missing, null, empty, or unclear, you MUST say: "Not specified in the analysis output."

YOUR TASKS:
- Convert raw JSON data into clean, readable text
- Create section-wise summaries (2-4 lines each)
- Format information as bullet points
- Use clear headings and structure
- Apply risk labels where data indicates risks
- Make text professional and demo-ready

You are being used in a government tender analysis system. Factual accuracy is paramount. Do NOT invent anything.`;

class AIPostProcessor {
  constructor() {
    this.useGemini = !!env.GEMINI_API_KEY;
    if (!this.useGemini) {
      console.warn('[PostProcessor] GEMINI_API_KEY not set. Using fallback formatting.');
    }
  }

  /**
   * Format Groq's raw JSON output into UI-ready structured data
   * This is the main entry point for the two-stage pipeline
   *
   * @param {Object} groqJson - Raw JSON from Groq fact extraction (Stage 1)
   * @returns {Promise<Object>} Formatted, UI-ready data (Stage 2)
   */
  async formatAnalysisWithGemini(groqJson) {
    if (!groqJson) {
      return this._getEmptyFormattedOutput();
    }

    if (!this.useGemini) {
      console.log('[PostProcessor] Gemini not available, using direct passthrough');
      return this._directPassthrough(groqJson);
    }

    try {
      const userPrompt = this._buildFormattingPrompt(groqJson);

      const response = await LLMCaller.call({
        systemPrompt: FORMATTING_SYSTEM_PROMPT,
        userPrompt,
        provider: 'gemini',
        model: GEMINI_MODEL,
        temperature: 0.1, // Very low temperature for consistent formatting
        maxTokens: 4000,
      });

      const formatted = this._parseGeminiResponse(response);

      // Validate no hallucination occurred
      const validation = this._validateNoHallucination(groqJson, formatted);
      if (!validation.isValid) {
        console.warn('[PostProcessor] Potential hallucination detected:', validation.issues);
      }

      return {
        success: true,
        formatted,
        metadata: {
          formattedBy: 'gemini-1.5-flash',
          sourceData: 'groq-rag-extraction',
          validationPassed: validation.isValid,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[PostProcessor] Gemini formatting failed:', error.message);
      return {
        success: false,
        error: error.message,
        formatted: this._directPassthrough(groqJson).formatted,
        metadata: {
          formattedBy: 'fallback',
          sourceData: 'groq-rag-extraction',
          validationPassed: true,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Format a single section's Groq output
   * @param {Object} groqSectionJson - Raw JSON for a section from Groq
   * @param {string} sectionName - Name of the section being formatted
   * @returns {Promise<Object>} Formatted section data
   */
  async formatSectionWithGemini(groqSectionJson, sectionName) {
    if (!groqSectionJson) {
      return this._getEmptySectionOutput(sectionName);
    }

    if (!this.useGemini) {
      return this._directSectionPassthrough(groqSectionJson, sectionName);
    }

    try {
      const userPrompt = this._buildSectionFormattingPrompt(groqSectionJson, sectionName);

      const response = await LLMCaller.call({
        systemPrompt: FORMATTING_SYSTEM_PROMPT,
        userPrompt,
        provider: 'gemini',
        model: GEMINI_MODEL,
        temperature: 0.1,
        maxTokens: 1500,
      });

      const formatted = this._parseSectionResponse(response, sectionName);

      return {
        success: true,
        ...formatted,
        metadata: {
          formattedBy: 'gemini-1.5-flash',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`[PostProcessor] Section formatting failed for ${sectionName}:`, error.message);
      return this._directSectionPassthrough(groqSectionJson, sectionName);
    }
  }

  /**
   * Build the formatting prompt for full analysis
   */
  _buildFormattingPrompt(groqJson) {
    return `FORMAT THE FOLLOWING TENDER ANALYSIS DATA INTO UI-READY TEXT

INPUT DATA (from Groq RAG extraction - use ONLY this data):
\`\`\`json
${JSON.stringify(groqJson, null, 2)}
\`\`\`

FORMATTING TASK:
Convert the above JSON into a well-structured tender summary with these sections:

1. EXECUTIVE SUMMARY
   - Write 3-5 clear sentences summarizing the tender
   - Include: tender title, authority, main purpose, key deadline
   - Use ONLY data from executiveSummary and metadata fields

2. CRITICAL REQUIREMENTS (bullet list)
   - List mandatory requirements bidders must meet
   - Use data from criticalRequirements array
   - If empty, write: "Not specified in the analysis output"

3. ELIGIBILITY CRITERIA (bullet list)
   - List who can bid and qualifications needed
   - Use data from eligibilityCriteria array
   - If empty, write: "Not specified in the analysis output"

4. TECHNICAL SPECIFICATIONS (bullet list)
   - List key technical requirements
   - Use data from technicalSpecifications array
   - If empty, write: "Not specified in the analysis output"

5. FINANCIAL DETAILS (structured)
   - EMD amount, estimated value, payment terms
   - Use data from financialTerms array
   - Format currency as ₹ with proper formatting

6. DEADLINES & TIMELINE (bullet list)
   - All important dates and milestones
   - Use data from deadlinesAndTimelines array
   - If empty, write: "Not specified in the analysis output"

7. RISK FACTORS (bullet list with risk labels)
   - Potential risks and penalties
   - Use data from riskFactors array
   - If empty, write: "Not specified in the analysis output"

8. RECOMMENDED ACTIONS (numbered list)
   - What bidder should do next
   - Use data from actionItems array
   - If empty, write: "Not specified in the analysis output"

9. OPPORTUNITY ASSESSMENT
   - Score and assessment
   - Use opportunityScore and opportunityAssessment fields

OUTPUT FORMAT - Return ONLY valid JSON:
\`\`\`json
{
  "executiveSummary": "3-5 sentence formatted summary...",
  "criticalRequirements": ["formatted requirement 1", "formatted requirement 2"],
  "eligibilityCriteria": ["formatted criterion 1", "formatted criterion 2"],
  "technicalSpecifications": ["formatted spec 1", "formatted spec 2"],
  "financialDetails": {
    "emd": "Formatted EMD amount or 'Not specified in the analysis output'",
    "estimatedValue": "Formatted value or 'Not specified in the analysis output'",
    "paymentTerms": "Formatted terms or 'Not specified in the analysis output'",
    "otherCharges": "Any other financial items or 'Not specified in the analysis output'"
  },
  "deadlinesTimeline": ["formatted deadline 1", "formatted deadline 2"],
  "riskFactors": [
    {"risk": "Risk description", "severity": "HIGH|MEDIUM|LOW"},
    {"risk": "Risk description", "severity": "HIGH|MEDIUM|LOW"}
  ],
  "recommendedActions": ["Action 1", "Action 2"],
  "opportunityScore": 75,
  "opportunityAssessment": "Formatted assessment text"
}
\`\`\`

REMEMBER: Use ONLY the provided JSON data. Do NOT invent any information.`;
  }

  /**
   * Build formatting prompt for a single section
   */
  _buildSectionFormattingPrompt(groqJson, sectionName) {
    return `FORMAT THE FOLLOWING SECTION DATA INTO UI-READY TEXT

SECTION NAME: ${sectionName}

INPUT DATA (from Groq RAG extraction - use ONLY this data):
\`\`\`json
${JSON.stringify(groqJson, null, 2)}
\`\`\`

FORMATTING TASK:
Create a clean, bidder-friendly summary for this section:

1. AI SUMMARY (2-4 sentences)
   - Concise overview of what this section contains
   - Highlight the most important information
   - Use professional tender language

2. KEY POINTS (3-5 bullet points)
   - Most critical items from this section
   - Actionable information for bidders
   - Requirements or obligations

3. IMPORTANT NUMBERS
   - Extract any dates, amounts (₹), percentages, quantities
   - Format properly for display

OUTPUT FORMAT - Return ONLY valid JSON:
\`\`\`json
{
  "aiSummary": "2-4 sentence formatted summary...",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "importantNumbers": [
    {"label": "Label text", "value": "Formatted value"},
    {"label": "Label text", "value": "Formatted value"}
  ]
}
\`\`\`

If any field has no data, use: "Not specified in the analysis output."`;
  }

  /**
   * Parse Gemini response (handles markdown JSON blocks)
   */
  _parseGeminiResponse(response) {
    try {
      let cleaned = response.trim();

      // Remove markdown code blocks
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      return JSON.parse(cleaned);
    } catch (error) {
      console.error('[PostProcessor] Failed to parse Gemini response:', error.message);

      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          // Fall through to throw
        }
      }

      throw new Error('Gemini response is not valid JSON');
    }
  }

  /**
   * Parse section formatting response
   */
  _parseSectionResponse(response, sectionName) {
    try {
      const parsed = this._parseGeminiResponse(response);
      return {
        aiSummary: parsed.aiSummary || 'Not specified in the analysis output.',
        keyPoints: parsed.keyPoints || [],
        importantNumbers: parsed.importantNumbers || [],
      };
    } catch (error) {
      return this._getEmptySectionOutput(sectionName);
    }
  }

  /**
   * Validate that Gemini didn't add new facts (hallucination check)
   */
  _validateNoHallucination(groqJson, geminiOutput) {
    const issues = [];
    const groqText = JSON.stringify(groqJson).toLowerCase();
    const geminiText = JSON.stringify(geminiOutput).toLowerCase();

    // Check for specific monetary amounts not in Groq data
    const geminiAmounts = geminiText.match(/₹[\d,\.]+(?:\s*(?:lakh|crore|lakhs|crores))?/gi) || [];
    const groqAmounts = groqText.match(/₹[\d,\.]+(?:\s*(?:lakh|crore|lakhs|crores))?/gi) || [];

    for (const amount of geminiAmounts) {
      const normalized = amount.toLowerCase().replace(/[\s,]/g, '');
      const foundInGroq = groqAmounts.some(ga =>
        ga.toLowerCase().replace(/[\s,]/g, '') === normalized
      );

      if (!foundInGroq && !amount.toLowerCase().includes('not specified')) {
        issues.push(`Potential hallucinated amount: ${amount}`);
      }
    }

    // Check for specific dates not in Groq data
    const datePatterns = [
      /\d{2}[/-]\d{2}[/-]\d{4}/g,
      /\d{4}[/-]\d{2}[/-]\d{2}/g,
      /\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/gi,
    ];

    for (const pattern of datePatterns) {
      const geminiDates = geminiText.match(pattern) || [];
      const groqDates = groqText.match(pattern) || [];

      for (const date of geminiDates) {
        if (!groqDates.some(gd => gd.toLowerCase() === date.toLowerCase())) {
          issues.push(`Potential hallucinated date: ${date}`);
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      confidence: issues.length === 0 ? 'high' : issues.length < 3 ? 'medium' : 'low',
    };
  }

  /**
   * Direct passthrough when Gemini is not available
   * Performs basic formatting without AI
   */
  _directPassthrough(groqJson) {
    return {
      success: true,
      formatted: {
        executiveSummary: groqJson.executiveSummary || 'Analysis data available. Please review sections for details.',
        criticalRequirements: this._cleanArray(groqJson.criticalRequirements),
        eligibilityCriteria: this._cleanArray(groqJson.eligibilityCriteria),
        technicalSpecifications: this._cleanArray(groqJson.technicalSpecifications),
        financialDetails: {
          emd: this._extractFinancialItem(groqJson.financialTerms, 'emd'),
          estimatedValue: this._extractFinancialItem(groqJson.financialTerms, 'value'),
          paymentTerms: this._extractFinancialItem(groqJson.financialTerms, 'payment'),
          otherCharges: 'Review tender document for complete financial details',
        },
        deadlinesTimeline: this._cleanArray(groqJson.deadlinesAndTimelines),
        riskFactors: this._formatRisks(groqJson.riskFactors),
        recommendedActions: this._cleanArray(groqJson.actionItems),
        opportunityScore: groqJson.opportunityScore || 60,
        opportunityAssessment: groqJson.opportunityAssessment || 'Review complete tender document for assessment.',
      },
      metadata: {
        formattedBy: 'passthrough',
        sourceData: 'groq-rag-extraction',
        validationPassed: true,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Direct passthrough for section formatting
   */
  _directSectionPassthrough(groqJson, sectionName) {
    return {
      success: true,
      aiSummary: groqJson.summary || `This section contains information about ${sectionName}. Please review the detailed content.`,
      keyPoints: this._cleanArray(groqJson.keyPoints) || ['Review section for detailed requirements'],
      importantNumbers: groqJson.importantNumbers || [],
      metadata: {
        formattedBy: 'passthrough',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get empty formatted output structure
   */
  _getEmptyFormattedOutput() {
    return {
      success: false,
      formatted: {
        executiveSummary: 'No analysis data available.',
        criticalRequirements: ['No requirements data available'],
        eligibilityCriteria: ['No eligibility data available'],
        technicalSpecifications: ['No technical specifications available'],
        financialDetails: {
          emd: 'Not specified in the analysis output',
          estimatedValue: 'Not specified in the analysis output',
          paymentTerms: 'Not specified in the analysis output',
          otherCharges: 'Not specified in the analysis output',
        },
        deadlinesTimeline: ['No deadline information available'],
        riskFactors: [],
        recommendedActions: ['Review tender document manually'],
        opportunityScore: 50,
        opportunityAssessment: 'Manual review required.',
      },
      metadata: {
        formattedBy: 'empty',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get empty section output structure
   */
  _getEmptySectionOutput(sectionName) {
    return {
      success: false,
      aiSummary: `No analysis data available for ${sectionName}. Please review the original document.`,
      keyPoints: ['Review original document for this section'],
      importantNumbers: [],
      metadata: {
        formattedBy: 'empty',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Helper: Clean array values
   */
  _cleanArray(arr) {
    if (!arr || !Array.isArray(arr)) return [];
    return arr.filter(item => item && typeof item === 'string' && item.trim().length > 0);
  }

  /**
   * Helper: Extract financial item from array
   */
  _extractFinancialItem(financialTerms, keyword) {
    if (!financialTerms || !Array.isArray(financialTerms)) {
      return 'Not specified in the analysis output';
    }

    const item = financialTerms.find(term =>
      term && term.toLowerCase().includes(keyword.toLowerCase())
    );

    return item || 'Not specified in the analysis output';
  }

  /**
   * Helper: Format risks with severity
   */
  _formatRisks(riskFactors) {
    if (!riskFactors || !Array.isArray(riskFactors)) return [];

    return riskFactors.map(risk => {
      if (typeof risk === 'string') {
        const severity = this._inferRiskSeverity(risk);
        return { risk, severity };
      }
      return risk;
    });
  }

  /**
   * Helper: Infer risk severity from text
   */
  _inferRiskSeverity(riskText) {
    const text = riskText.toLowerCase();

    if (text.includes('disqualif') || text.includes('reject') || text.includes('penalty') || text.includes('terminate')) {
      return 'HIGH';
    }
    if (text.includes('delay') || text.includes('additional') || text.includes('may')) {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}

export default new AIPostProcessor();
