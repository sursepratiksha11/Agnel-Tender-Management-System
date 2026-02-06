import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { EmbeddingService } from './embedding.service.js';

const CHAT_MODEL = 'gpt-3.5-turbo';

/**
 * Call OpenAI Chat Completion API
 */
async function callLLM(systemPrompt, userPrompt, options = {}) {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || CHAT_MODEL,
      temperature: options.temperature || 0.4,
      max_tokens: options.maxTokens || 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LLM API failed: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Parse JSON from LLM response
 */
function parseJSONResponse(response) {
  try {
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    return JSON.parse(cleaned.trim());
  } catch (err) {
    return null;
  }
}

/**
 * Section-specific prompts and templates
 */
const SECTION_TEMPLATES = {
  ELIGIBILITY: {
    systemPrompt: `You are an expert proposal writer for government tenders. Generate professional eligibility response content.

GUIDELINES:
- Include specific experience statements with years and project values
- Reference certifications and registrations
- Mention financial capacity with turnover figures
- Use formal, professional language
- Be specific and quantifiable where possible
- Structure with clear sub-sections`,

    structure: [
      'Company Overview & Legal Status',
      'Years of Experience & Track Record',
      'Financial Capacity & Turnover',
      'Certifications & Registrations',
      'Key Personnel Qualifications',
      'Past Project Experience (Similar Work)',
    ],
  },

  TECHNICAL: {
    systemPrompt: `You are an expert technical proposal writer. Generate comprehensive technical methodology content.

GUIDELINES:
- Describe technical approach step by step
- Include methodology and execution plan
- Reference relevant standards (ISO, IS, BIS)
- Mention quality control measures
- Include resource deployment plan
- Be specific about tools, technologies, materials`,

    structure: [
      'Understanding of Scope',
      'Technical Approach & Methodology',
      'Execution Plan & Phases',
      'Quality Assurance Measures',
      'Resource Deployment',
      'Risk Mitigation Strategy',
      'Compliance with Technical Standards',
    ],
  },

  FINANCIAL: {
    systemPrompt: `You are an expert financial proposal writer for government tenders. Generate clear financial terms response.

GUIDELINES:
- Acknowledge EMD and security deposit requirements
- Reference payment terms and milestones
- Mention tax compliance (GST)
- Include pricing assumptions if applicable
- Use precise financial language`,

    structure: [
      'EMD & Security Deposit Compliance',
      'Payment Terms Acceptance',
      'Tax & Statutory Compliance',
      'Price Validity Statement',
      'Financial Assumptions',
    ],
  },

  EVALUATION: {
    systemPrompt: `You are an expert proposal writer. Generate content that addresses evaluation criteria effectively.

GUIDELINES:
- Map response to each evaluation parameter
- Highlight strengths and differentiators
- Provide evidence for claims
- Use clear, factual language`,

    structure: [
      'Compliance Statement',
      'Technical Capability Highlights',
      'Experience & Track Record',
      'Value Proposition',
      'Differentiators',
    ],
  },

  TERMS: {
    systemPrompt: `You are an expert contract terms response writer. Generate professional acceptance of terms.

GUIDELINES:
- Explicitly accept key terms and conditions
- Acknowledge warranties and guarantees
- Reference dispute resolution terms
- Mention compliance commitments`,

    structure: [
      'Acceptance of Terms & Conditions',
      'Warranty & Guarantee Compliance',
      'Performance Guarantee Commitment',
      'Dispute Resolution Acknowledgment',
      'Legal Compliance Statement',
    ],
  },
};

/**
 * ProposalDrafterService - AI-powered proposal content generation
 */
export const ProposalDrafterService = {
  /**
   * Generate draft content for a proposal section
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated draft with metadata
   */
  async generateSectionDraft(options) {
    const {
      tenderId,
      sectionId,
      sectionType,
      tenderRequirement,
      organizationContext,
      customInstructions,
    } = options;

    // 1. Get tender context
    const tenderContext = await this._getTenderContext(tenderId);

    // 2. Get similar proposals from RAG (if available)
    let ragContext = '';
    try {
      ragContext = await this._getRAGContext(tenderRequirement, sectionType);
    } catch (err) {
      console.warn('RAG context retrieval failed:', err.message);
    }

    // 3. Get section template
    const template = SECTION_TEMPLATES[sectionType] || SECTION_TEMPLATES.TECHNICAL;

    // 4. Build the generation prompt
    const systemPrompt = template.systemPrompt + `

OUTPUT FORMAT:
- Write in formal proposal language
- Use clear paragraphs with logical flow
- Include specific details and evidence
- Length: 300-600 words
- Structure content with clear sections
- Do NOT use markdown headers, use plain text with line breaks`;

    const userPrompt = `Generate a professional proposal response for this government tender section:

TENDER: ${tenderContext.title}
AUTHORITY: ${tenderContext.authorityName || 'Government Authority'}
SECTOR: ${tenderContext.sector || 'General'}
VALUE: ${tenderContext.formattedValue || 'As specified'}

SECTION TYPE: ${sectionType}
SECTION REQUIREMENT:
${tenderRequirement || 'Respond to section requirements as per tender document'}

${organizationContext ? `BIDDER CONTEXT:\n${organizationContext}\n` : ''}
${customInstructions ? `SPECIFIC INSTRUCTIONS:\n${customInstructions}\n` : ''}
${ragContext ? `REFERENCE (similar successful proposals):\n${ragContext}\n` : ''}

SUGGESTED STRUCTURE:
${template.structure.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Generate a comprehensive, professional proposal response:`;

    // 5. Generate with AI
    try {
      const draft = await callLLM(systemPrompt, userPrompt, {
        temperature: 0.4,
        maxTokens: 1500,
      });

      // 6. Post-process the draft
      const processedDraft = this._postProcessDraft(draft, sectionType);

      return {
        success: true,
        sectionId,
        sectionType,
        draft: processedDraft,
        wordCount: processedDraft.split(/\s+/).filter(w => w).length,
        suggestedStructure: template.structure,
        isAIGenerated: true,
        generatedAt: new Date().toISOString(),
        disclaimer: 'AI-generated draft. Please review and customize before submission.',
      };
    } catch (err) {
      console.error('Draft generation failed:', err.message);

      // Return fallback template
      return {
        success: true,
        sectionId,
        sectionType,
        draft: this._generateFallbackDraft(sectionType, tenderRequirement, template),
        wordCount: 0,
        suggestedStructure: template.structure,
        isAIGenerated: false,
        generatedAt: new Date().toISOString(),
        disclaimer: 'Template-based draft. AI generation unavailable.',
      };
    }
  },

  /**
   * Generate draft for all sections of a proposal
   */
  async generateFullProposalDraft(tenderId, organizationContext) {
    // 1. Get tender sections
    const sectionsRes = await pool.query(
      `SELECT section_id, title, description, content, is_mandatory, order_index
       FROM tender_section
       WHERE tender_id = $1
       ORDER BY order_index ASC`,
      [tenderId]
    );

    const sections = sectionsRes.rows;
    const drafts = [];

    // 2. Generate draft for each section
    for (const section of sections) {
      const sectionType = this._inferSectionType(section.title);
      const requirement = section.content || section.description || '';

      try {
        const draft = await this.generateSectionDraft({
          tenderId,
          sectionId: section.section_id,
          sectionType,
          tenderRequirement: requirement,
          organizationContext,
        });

        drafts.push({
          ...draft,
          sectionTitle: section.title,
          isMandatory: section.is_mandatory,
          orderIndex: section.order_index,
        });
      } catch (err) {
        console.error(`Failed to generate draft for section ${section.title}:`, err.message);
        drafts.push({
          success: false,
          sectionId: section.section_id,
          sectionTitle: section.title,
          error: 'Failed to generate draft',
        });
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      tenderId,
      totalSections: sections.length,
      generatedDrafts: drafts.filter(d => d.success).length,
      drafts,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Improve existing draft content
   */
  async improveDraft(options) {
    const {
      existingDraft,
      sectionType,
      tenderRequirement,
      improvementFocus, // 'clarity' | 'detail' | 'compliance' | 'professional'
    } = options;

    const focusInstructions = {
      clarity: 'Make the content clearer and easier to understand. Simplify complex sentences.',
      detail: 'Add more specific details, examples, and evidence to strengthen the response.',
      compliance: 'Ensure all tender requirements are explicitly addressed. Add compliance statements.',
      professional: 'Enhance professional tone. Use formal language and industry terminology.',
    };

    const systemPrompt = `You are a professional proposal editor. Improve the draft content while maintaining its core message.

IMPROVEMENT FOCUS: ${focusInstructions[improvementFocus] || focusInstructions.professional}

RULES:
- Preserve key information from original
- Enhance without completely rewriting
- Maintain formal proposal language
- Keep similar length (±20%)`;

    const userPrompt = `Improve this proposal section draft:

SECTION TYPE: ${sectionType}
TENDER REQUIREMENT: ${tenderRequirement || 'As per tender document'}

CURRENT DRAFT:
${existingDraft}

Provide improved version:`;

    try {
      const improved = await callLLM(systemPrompt, userPrompt, {
        temperature: 0.3,
        maxTokens: 1500,
      });

      return {
        success: true,
        improvedDraft: improved,
        originalWordCount: existingDraft.split(/\s+/).filter(w => w).length,
        improvedWordCount: improved.split(/\s+/).filter(w => w).length,
        improvementFocus,
        isAIGenerated: true,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        improvedDraft: existingDraft,
      };
    }
  },

  /**
   * Generate specific content snippet (for inline assistance)
   */
  async generateSnippet(options) {
    const {
      snippetType, // 'experience' | 'certification' | 'methodology' | 'compliance' | 'financial'
      context,
      length, // 'short' | 'medium' | 'long'
    } = options;

    const snippetPrompts = {
      experience: 'Generate a professional experience statement for a government tender proposal.',
      certification: 'Generate a certification and compliance statement for a tender proposal.',
      methodology: 'Generate a technical methodology description for a tender proposal.',
      compliance: 'Generate a compliance acceptance statement for tender terms.',
      financial: 'Generate a financial terms acceptance statement for a tender proposal.',
    };

    const lengthTokens = {
      short: 150,
      medium: 300,
      long: 500,
    };

    const systemPrompt = snippetPrompts[snippetType] || snippetPrompts.experience;

    const userPrompt = `Context: ${context || 'Government tender response'}

Generate a ${length || 'medium'} length professional snippet:`;

    try {
      const snippet = await callLLM(systemPrompt, userPrompt, {
        temperature: 0.4,
        maxTokens: lengthTokens[length] || 300,
      });

      return {
        success: true,
        snippet,
        snippetType,
        isAIGenerated: true,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        snippet: this._getFallbackSnippet(snippetType),
      };
    }
  },

  /**
   * Get tender context for generation
   */
  async _getTenderContext(tenderId) {
    const res = await pool.query(
      `SELECT t.title, t.description, t.estimated_value, t.sector, t.tender_type,
              o.organization_name as authority_name
       FROM tender t
       LEFT JOIN organization o ON t.organization_id = o.organization_id
       WHERE t.tender_id = $1`,
      [tenderId]
    );

    if (res.rows.length === 0) {
      return { title: 'Tender', authorityName: 'Authority' };
    }

    const tender = res.rows[0];
    return {
      title: tender.title,
      description: tender.description,
      authorityName: tender.authority_name,
      sector: tender.sector,
      tenderType: tender.tender_type,
      estimatedValue: tender.estimated_value,
      formattedValue: this._formatValue(tender.estimated_value),
    };
  },

  /**
   * Get RAG context from similar proposals
   */
  async _getRAGContext(requirement, sectionType) {
    if (!requirement || requirement.length < 50) {
      return '';
    }

    try {
      const embedding = await EmbeddingService.embed(requirement.substring(0, 500));

      // Search for similar content in published tenders
      const res = await pool.query(
        `SELECT tcc.content
         FROM tender_content_chunk tcc
         JOIN tender t ON tcc.tender_id = t.tender_id
         WHERE t.status = 'PUBLISHED'
         ORDER BY tcc.embedding <-> $1::vector
         LIMIT 3`,
        [embedding]
      );

      if (res.rows.length > 0) {
        return res.rows.map(r => r.content.substring(0, 300)).join('\n\n');
      }
    } catch (err) {
      console.warn('RAG retrieval failed:', err.message);
    }

    return '';
  },

  /**
   * Post-process generated draft
   */
  _postProcessDraft(draft, sectionType) {
    // Remove any markdown that might have been generated
    let processed = draft
      .replace(/^#+\s*/gm, '') // Remove markdown headers
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '') // Remove italic markers
      .replace(/`/g, '') // Remove code markers
      .trim();

    // Ensure proper paragraph breaks
    processed = processed.replace(/\n{3,}/g, '\n\n');

    return processed;
  },

  /**
   * Infer section type from title
   */
  _inferSectionType(title) {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('eligib') || titleLower.includes('qualif')) return 'ELIGIBILITY';
    if (titleLower.includes('technic') || titleLower.includes('method') || titleLower.includes('scope')) return 'TECHNICAL';
    if (titleLower.includes('financ') || titleLower.includes('price') || titleLower.includes('cost')) return 'FINANCIAL';
    if (titleLower.includes('evalua') || titleLower.includes('criteria') || titleLower.includes('score')) return 'EVALUATION';
    if (titleLower.includes('term') || titleLower.includes('condition') || titleLower.includes('legal')) return 'TERMS';

    return 'TECHNICAL'; // Default
  },

  /**
   * Format currency value
   */
  _formatValue(value) {
    if (!value) return 'As specified';
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString()}`;
  },

  /**
   * Generate fallback draft template
   */
  _generateFallbackDraft(sectionType, requirement, template) {
    const intro = {
      ELIGIBILITY: 'We hereby submit our eligibility credentials for this tender.\n\n',
      TECHNICAL: 'We present our technical approach and methodology for this project.\n\n',
      FINANCIAL: 'We acknowledge and accept the financial terms as specified in the tender.\n\n',
      EVALUATION: 'We submit the following information in response to the evaluation criteria.\n\n',
      TERMS: 'We have reviewed and accept the terms and conditions of this tender.\n\n',
    };

    let draft = intro[sectionType] || 'We submit the following response to this section.\n\n';

    draft += template.structure.map(item =>
      `${item}:\n[Please provide details for ${item.toLowerCase()}]\n`
    ).join('\n');

    draft += '\n\nWe confirm our commitment to comply with all requirements as specified in the tender document.';

    return draft;
  },

  /**
   * Get fallback snippet
   */
  _getFallbackSnippet(snippetType) {
    const fallbacks = {
      experience: 'We have extensive experience in executing similar projects over the past several years, with a proven track record of successful delivery.',
      certification: 'We hold all necessary certifications and registrations as required for this tender, including ISO certifications and statutory registrations.',
      methodology: 'Our methodology follows industry best practices, ensuring quality delivery through systematic planning, execution, and monitoring.',
      compliance: 'We confirm our acceptance of all terms and conditions as specified in the tender document without any deviations.',
      financial: 'We acknowledge and accept the financial terms including EMD requirements, payment milestones, and performance guarantee conditions.',
    };

    return fallbacks[snippetType] || fallbacks.experience;
  },
};
