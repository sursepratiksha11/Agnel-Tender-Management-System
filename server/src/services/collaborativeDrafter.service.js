/**
 * Collaborative Drafter Service
 * AI-powered section drafting grounded in tender analysis and embeddings
 *
 * CRITICAL: All AI generation MUST be grounded in tender data
 * - Uses tender analysis JSON
 * - Uses RAG embeddings from tender_content_chunk
 * - Uses evaluation criteria
 * - NEVER generates content not supported by tender data
 */

import { pool } from '../config/db.js';
import { EmbeddingService } from './embedding.service.js';
import { RAGOrchestrator } from '../utils/ragOrchestrator.js';
import { CollaborationService } from './collaboration.service.js';
import { LLMCaller } from '../utils/llmCaller.js';

// Section type mapping for RAG queries
const SECTION_TYPE_MAPPING = {
  ELIGIBILITY: {
    analysisType: 'eligibility',
    queryTemplate: 'eligibility criteria qualification requirements certifications experience financial capacity',
    structure: [
      'Company Overview & Legal Status',
      'Years of Experience & Track Record',
      'Financial Capacity & Turnover',
      'Certifications & Registrations',
      'Key Personnel Qualifications',
      'Past Project Experience',
    ],
  },
  TECHNICAL: {
    analysisType: 'technical',
    queryTemplate: 'technical specifications methodology approach execution quality standards deliverables',
    structure: [
      'Understanding of Scope',
      'Technical Approach & Methodology',
      'Execution Plan & Phases',
      'Quality Assurance Measures',
      'Resource Deployment',
      'Risk Mitigation Strategy',
    ],
  },
  FINANCIAL: {
    analysisType: 'financial',
    queryTemplate: 'EMD earnest money payment terms pricing financial conditions tax compliance',
    structure: [
      'EMD & Security Deposit Compliance',
      'Payment Terms Acceptance',
      'Tax & Statutory Compliance',
      'Price Validity Statement',
      'Financial Assumptions',
    ],
  },
  EVALUATION: {
    analysisType: 'evaluation',
    queryTemplate: 'evaluation criteria scoring assessment selection parameters weightage',
    structure: [
      'Compliance Statement',
      'Technical Capability Highlights',
      'Experience & Track Record',
      'Value Proposition',
      'Differentiators',
    ],
  },
  TERMS: {
    analysisType: 'general',
    queryTemplate: 'terms conditions warranty guarantee compliance legal obligations',
    structure: [
      'Acceptance of Terms & Conditions',
      'Warranty & Guarantee Compliance',
      'Performance Guarantee Commitment',
      'Legal Compliance Statement',
    ],
  },
  GENERAL: {
    analysisType: 'general',
    queryTemplate: 'requirements specifications details scope',
    structure: [
      'Introduction',
      'Our Understanding',
      'Proposed Approach',
      'Conclusion',
    ],
  },
};

export const CollaborativeDrafterService = {
  // ==========================================
  // SECTION DRAFT GENERATION
  // ==========================================

  /**
   * Generate AI draft for a proposal section
   * Grounded in tender analysis and embeddings
   */
  async generateSectionDraft({
    proposalId,
    sectionId,
    userId,
    customInstructions = '',
    tenderType = 'platform', // 'platform' or 'uploaded'
    uploadedTenderId = null,
  }) {
    console.log(`[CollaborativeDrafter] Generating draft for section ${sectionId}`);

    // Get tender context based on type
    let tenderContext;
    let sectionInfo;
    let ragContext;

    if (tenderType === 'platform') {
      // Platform tender - use proposal -> tender -> tender_section
      const result = await pool.query(
        `SELECT t.tender_id, t.title, t.description, t.sector, t.estimated_value,
                ts.title as section_title, ts.content as section_content, ts.description as section_description,
                o.name as organization_name
         FROM proposal p
         JOIN tender t ON p.tender_id = t.tender_id
         JOIN organization o ON t.organization_id = o.organization_id
         JOIN tender_section ts ON ts.tender_id = t.tender_id AND ts.section_id = $2
         WHERE p.proposal_id = $1`,
        [proposalId, sectionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Proposal or section not found');
      }

      const data = result.rows[0];
      tenderContext = {
        tenderId: data.tender_id,
        title: data.title,
        description: data.description,
        sector: data.sector,
        estimatedValue: data.estimated_value,
        organization: data.organization_name,
      };

      sectionInfo = {
        title: data.section_title,
        content: data.section_content || data.section_description || '',
        type: this._inferSectionType(data.section_title),
      };

      // Get RAG context from embeddings
      ragContext = await this._getRAGContext(
        data.tender_id,
        sectionInfo.type,
        sectionInfo.content
      );

    } else {
      // Uploaded tender - use uploaded_tender analysis
      const result = await pool.query(
        `SELECT ut.id, ut.title, ut.filename, ut.analysis_json, ut.sector, ut.estimated_value
         FROM uploaded_tender ut
         WHERE ut.id = $1`,
        [uploadedTenderId]
      );

      if (result.rows.length === 0) {
        throw new Error('Uploaded tender not found');
      }

      const data = result.rows[0];
      const analysisJson = data.analysis_json || {};

      tenderContext = {
        tenderId: data.id,
        title: data.title || analysisJson.parsed?.title || data.filename,
        description: analysisJson.summary?.executiveSummary || '',
        sector: data.sector || analysisJson.parsed?.metadata?.sector,
        estimatedValue: data.estimated_value || analysisJson.parsed?.metadata?.estimatedValue,
        organization: analysisJson.parsed?.metadata?.authority || '',
      };

      // For uploaded tenders, sectionId is actually sectionKey (string like 'technicalApproach')
      sectionInfo = {
        title: this._sectionKeyToTitle(sectionId),
        content: this._extractSectionRequirements(analysisJson, sectionId),
        type: this._inferSectionType(sectionId),
      };

      // Get RAG context from uploaded tender's embeddings
      ragContext = await this._getRAGContext(
        uploadedTenderId,
        sectionInfo.type,
        sectionInfo.content
      );
    }

    // Build grounded system prompt
    const systemPrompt = this._buildGroundedSystemPrompt(sectionInfo.type, tenderContext);

    // Build user prompt with RAG context
    const userPrompt = this._buildUserPrompt({
      sectionTitle: sectionInfo.title,
      sectionRequirements: sectionInfo.content,
      ragContext,
      customInstructions,
      structure: SECTION_TYPE_MAPPING[sectionInfo.type]?.structure || SECTION_TYPE_MAPPING.GENERAL.structure,
    });

    console.log(`[CollaborativeDrafter] Calling LLM for ${sectionInfo.type} section...`);

    // Call LLM
    const draft = await LLMCaller.call({
      systemPrompt,
      userPrompt,
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      maxTokens: 2000,
    });

    // Log activity
    if (tenderType === 'platform') {
      await CollaborationService.logActivity(proposalId, sectionId, userId, 'AI_DRAFT', {
        sectionType: sectionInfo.type,
        wordCount: draft.split(/\s+/).length,
      });
    }

    return {
      draft: this._cleanDraft(draft),
      wordCount: draft.split(/\s+/).filter(w => w).length,
      sectionType: sectionInfo.type,
      sources: ['tender_analysis', 'embeddings'],
      suggestedStructure: SECTION_TYPE_MAPPING[sectionInfo.type]?.structure || [],
      disclaimer: 'AI-generated content based on tender requirements. Review and customize before submission.',
    };
  },

  /**
   * Build grounded system prompt
   * Enforces that AI only uses provided context
   */
  _buildGroundedSystemPrompt(sectionType, tenderContext) {
    const typeConfig = SECTION_TYPE_MAPPING[sectionType] || SECTION_TYPE_MAPPING.GENERAL;

    return `You are an expert proposal writer for government and corporate tenders.

TENDER CONTEXT:
- Title: ${tenderContext.title}
- Sector: ${tenderContext.sector || 'Not specified'}
- Issuing Authority: ${tenderContext.organization || 'Not specified'}
- Estimated Value: ${tenderContext.estimatedValue ? `₹${Number(tenderContext.estimatedValue).toLocaleString()}` : 'Not specified'}

CRITICAL RULES - YOU MUST FOLLOW:
1. Use ONLY information from the provided context and requirements
2. NEVER invent facts, figures, company names, or specific numbers
3. If specific information is not available, use placeholder phrases like "[Company Name]", "[X years]", "[Specify amount]"
4. Reference tender requirements explicitly where applicable
5. Structure content using the provided section structure
6. Use formal, professional language appropriate for tender submissions
7. Be specific and actionable where the tender provides details
8. When tender mentions specific criteria, address each one

SECTION TYPE: ${sectionType}

Write a professional proposal section that:
- Directly addresses the tender requirements
- Uses clear, formal language
- Follows the suggested structure
- Includes placeholders for bidder-specific information
- Maintains compliance focus`;
  },

  /**
   * Build user prompt with RAG context
   */
  _buildUserPrompt({ sectionTitle, sectionRequirements, ragContext, customInstructions, structure }) {
    let prompt = `Generate a professional proposal response for the following section:

SECTION: ${sectionTitle}

TENDER REQUIREMENTS FOR THIS SECTION:
${sectionRequirements || 'General requirements - address comprehensively'}

RELEVANT CONTEXT FROM TENDER DOCUMENT:
${ragContext || 'No additional context available'}

SUGGESTED STRUCTURE:
${structure.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`;

    if (customInstructions) {
      prompt += `
ADDITIONAL INSTRUCTIONS:
${customInstructions}
`;
    }

    prompt += `
Generate a complete, professional response that:
1. Addresses each requirement point by point
2. Uses the suggested structure
3. Includes placeholders like [Company Name], [X years experience], [Specify value] for bidder-specific details
4. Maintains formal tender proposal language
5. Is ready for the bidder to customize and submit

Response:`;

    return prompt;
  },

  /**
   * Get RAG context from embeddings
   */
  async _getRAGContext(tenderId, sectionType, sectionContent) {
    try {
      const typeConfig = SECTION_TYPE_MAPPING[sectionType] || SECTION_TYPE_MAPPING.GENERAL;
      const query = `${typeConfig.queryTemplate} ${sectionContent}`.substring(0, 500);

      const ragResult = await RAGOrchestrator.retrieve({
        query,
        sessionId: tenderId,
        analysisType: typeConfig.analysisType,
        modelName: 'groq',
      });

      return ragResult?.context || '';
    } catch (err) {
      console.error('[CollaborativeDrafter] RAG retrieval error:', err.message);
      return '';
    }
  },

  /**
   * Infer section type from title
   */
  _inferSectionType(title) {
    const titleLower = (title || '').toLowerCase();

    if (titleLower.includes('eligib') || titleLower.includes('qualif') || titleLower.includes('experience')) {
      return 'ELIGIBILITY';
    }
    if (titleLower.includes('technic') || titleLower.includes('method') || titleLower.includes('approach') || titleLower.includes('scope')) {
      return 'TECHNICAL';
    }
    if (titleLower.includes('financ') || titleLower.includes('commerc') || titleLower.includes('price') || titleLower.includes('cost') || titleLower.includes('emd')) {
      return 'FINANCIAL';
    }
    if (titleLower.includes('evaluat') || titleLower.includes('score') || titleLower.includes('criteria')) {
      return 'EVALUATION';
    }
    if (titleLower.includes('term') || titleLower.includes('condition') || titleLower.includes('legal') || titleLower.includes('complian')) {
      return 'TERMS';
    }

    return 'GENERAL';
  },

  /**
   * Convert section key to display title
   */
  _sectionKeyToTitle(sectionKey) {
    const mapping = {
      coverLetter: 'Cover Letter',
      executiveSummary: 'Executive Summary',
      companyProfile: 'Company Profile',
      technicalApproach: 'Technical Approach',
      experienceCredentials: 'Experience & Credentials',
      projectTeam: 'Project Team',
      commercialTerms: 'Commercial Terms',
      compliance: 'Compliance Statement',
    };

    return mapping[sectionKey] || sectionKey.replace(/([A-Z])/g, ' $1').trim();
  },

  /**
   * Extract section requirements from analysis JSON
   */
  _extractSectionRequirements(analysisJson, sectionKey) {
    const summary = analysisJson?.summary || {};
    const bulletPoints = summary.bulletPoints || {};

    const sectionType = this._inferSectionType(sectionKey);

    switch (sectionType) {
      case 'ELIGIBILITY':
        return (bulletPoints.eligibilityCriteria || []).join('\n');
      case 'TECHNICAL':
        return (bulletPoints.technicalSpecifications || []).join('\n');
      case 'FINANCIAL':
        return (bulletPoints.financialTerms || []).join('\n');
      case 'EVALUATION':
        return summary.opportunityAssessment || '';
      case 'TERMS':
        return (bulletPoints.complianceRequirements || []).join('\n');
      default:
        return summary.executiveSummary || '';
    }
  },

  /**
   * Clean draft output
   */
  _cleanDraft(draft) {
    if (!draft) return '';

    return draft
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\*\*/g, '')           // Remove bold markers
      .replace(/##\s*/g, '')          // Remove markdown headers
      .replace(/\n{3,}/g, '\n\n')     // Normalize newlines
      .trim();
  },

  // ==========================================
  // PROPOSAL VALIDATION
  // ==========================================

  /**
   * Validate proposal against tender requirements
   * Returns gaps and suggestions for each section
   */
  async validateProposal(proposalId, userId, tenderType = 'platform', uploadedTenderId = null) {
    console.log(`[CollaborativeDrafter] Validating proposal ${proposalId}`);

    let tenderContext;
    let sections;
    let sectionResponses;

    if (tenderType === 'platform') {
      // Get tender and proposal data
      const tenderResult = await pool.query(
        `SELECT t.tender_id, t.title, t.description,
                ts.section_id, ts.title as section_title, ts.content as section_requirements, ts.is_mandatory
         FROM proposal p
         JOIN tender t ON p.tender_id = t.tender_id
         JOIN tender_section ts ON ts.tender_id = t.tender_id
         WHERE p.proposal_id = $1
         ORDER BY ts.order_index`,
        [proposalId]
      );

      if (tenderResult.rows.length === 0) {
        throw new Error('Proposal not found');
      }

      tenderContext = {
        title: tenderResult.rows[0].title,
        description: tenderResult.rows[0].description,
      };

      sections = tenderResult.rows.map(r => ({
        sectionId: r.section_id,
        title: r.section_title,
        requirements: r.section_requirements,
        isMandatory: r.is_mandatory,
      }));

      // Get proposal responses
      const responsesResult = await pool.query(
        `SELECT section_id, content
         FROM proposal_section_response
         WHERE proposal_id = $1`,
        [proposalId]
      );

      sectionResponses = {};
      responsesResult.rows.forEach(r => {
        sectionResponses[r.section_id] = r.content;
      });

    } else {
      // Uploaded tender validation
      const tenderResult = await pool.query(
        `SELECT ut.*, upd.sections_json
         FROM uploaded_tender ut
         LEFT JOIN uploaded_proposal_draft upd ON upd.uploaded_tender_id = ut.id
         WHERE ut.id = $1`,
        [uploadedTenderId]
      );

      if (tenderResult.rows.length === 0) {
        throw new Error('Uploaded tender not found');
      }

      const data = tenderResult.rows[0];
      const analysisJson = data.analysis_json || {};

      tenderContext = {
        title: data.title || analysisJson.parsed?.title,
        description: analysisJson.summary?.executiveSummary || '',
      };

      // Extract sections from analysis
      const proposalDraft = analysisJson.proposalDraft || {};
      sections = (proposalDraft.sections || []).map(s => ({
        sectionId: s.id,
        title: s.title,
        requirements: this._extractSectionRequirements(analysisJson, s.id),
        isMandatory: true,
      }));

      // Get saved draft responses
      const draftSections = data.sections_json || [];
      sectionResponses = {};
      draftSections.forEach(s => {
        sectionResponses[s.id] = s.content;
      });
    }

    // Validate each section
    const validationResults = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const section of sections) {
      const response = sectionResponses[section.sectionId] || '';
      const result = await this._validateSection(section, response, tenderContext);

      validationResults.push({
        sectionId: section.sectionId,
        title: section.title,
        isMandatory: section.isMandatory,
        ...result,
      });

      maxScore += section.isMandatory ? 100 : 50;
      totalScore += result.score * (section.isMandatory ? 1 : 0.5);
    }

    // Calculate overall validity
    const normalizedScore = Math.round((totalScore / maxScore) * 100);
    const isValid = normalizedScore >= 70 && validationResults.every(r => !r.isMandatory || r.status !== 'MISSING');

    // Extract unaddressed requirements
    const unaddressedRequirements = validationResults
      .filter(r => r.gaps && r.gaps.length > 0)
      .flatMap(r => r.gaps);

    return {
      isValid,
      score: normalizedScore,
      sections: validationResults,
      unaddressedRequirements: unaddressedRequirements.slice(0, 10),
      summary: isValid
        ? 'Proposal addresses key tender requirements'
        : 'Proposal has gaps that need attention before submission',
    };
  },

  /**
   * Validate a single section
   */
  async _validateSection(section, response, tenderContext) {
    // Check if response exists and has content
    if (!response || response.trim().length < 50) {
      return {
        status: 'MISSING',
        score: 0,
        gaps: [`${section.title} section is empty or too brief`],
        suggestions: [`Add comprehensive content to ${section.title} section`],
      };
    }

    const wordCount = response.split(/\s+/).filter(w => w).length;

    // Basic completeness check
    if (wordCount < 100) {
      return {
        status: 'INCOMPLETE',
        score: 30,
        gaps: [`${section.title} appears too brief (${wordCount} words)`],
        suggestions: ['Expand with more detail and specifics'],
      };
    }

    // Use AI to validate content against requirements
    try {
      const validationPrompt = `Analyze this proposal section response against the tender requirements.

TENDER: ${tenderContext.title}

SECTION: ${section.title}

TENDER REQUIREMENTS:
${section.requirements || 'General response required'}

PROPOSAL RESPONSE:
${response.substring(0, 2000)}

Analyze and return a JSON object with:
{
  "score": 0-100,
  "status": "COMPLETE" | "INCOMPLETE" | "NEEDS_IMPROVEMENT",
  "gaps": ["list of missing or inadequate points"],
  "suggestions": ["specific improvement suggestions"]
}

Be strict about addressing all requirements. Return ONLY valid JSON.`;

      const result = await LLMCaller.call({
        systemPrompt: 'You are a tender compliance auditor. Analyze proposal sections for completeness and compliance. Return only valid JSON.',
        userPrompt: validationPrompt,
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        maxTokens: 500,
      });

      // Parse JSON response
      const parsed = this._parseJSONResponse(result);
      if (parsed) {
        return {
          status: parsed.status || 'NEEDS_IMPROVEMENT',
          score: Math.min(100, Math.max(0, parsed.score || 50)),
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 5) : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
        };
      }
    } catch (err) {
      console.error('[CollaborativeDrafter] Validation error:', err.message);
    }

    // Fallback to basic heuristic
    return {
      status: wordCount >= 200 ? 'COMPLETE' : 'NEEDS_IMPROVEMENT',
      score: Math.min(100, wordCount / 3),
      gaps: [],
      suggestions: wordCount < 200 ? ['Consider adding more detail'] : [],
    };
  },

  /**
   * Parse JSON from LLM response
   */
  _parseJSONResponse(response) {
    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      return JSON.parse(cleaned.trim());
    } catch {
      return null;
    }
  },
};

export default CollaborativeDrafterService;
