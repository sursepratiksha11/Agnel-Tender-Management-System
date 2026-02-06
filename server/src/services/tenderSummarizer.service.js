import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { EmbeddingService } from './embedding.service.js';

const CHAT_MODEL = 'gpt-3.5-turbo';
const MAX_CONTEXT_CHUNKS = 8;

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
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 2000,
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
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJSONResponse(response) {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    return JSON.parse(cleaned.trim());
  } catch (err) {
    console.error('Failed to parse JSON response:', err.message);
    return null;
  }
}

/**
 * TenderSummarizerService - AI-powered tender summarization with bullet points
 */
export const TenderSummarizerService = {
  /**
   * Generate comprehensive AI summary with bullet points
   * @param {string} tenderId - UUID of the tender
   * @returns {Promise<Object>} - Structured summary with bullet points
   */
  async generateComprehensiveSummary(tenderId) {
    // 1. Fetch tender details
    const tenderRes = await pool.query(
      `SELECT t.tender_id, t.title, t.description, t.estimated_value,
              t.submission_deadline, t.tender_type, t.sector, t.status,
              o.organization_name as authority_name
       FROM tender t
       LEFT JOIN organization o ON t.organization_id = o.organization_id
       WHERE t.tender_id = $1`,
      [tenderId]
    );

    if (tenderRes.rows.length === 0) {
      throw new Error('Tender not found');
    }

    const tender = tenderRes.rows[0];

    if (tender.status !== 'PUBLISHED') {
      throw new Error('Tender must be published to generate summary');
    }

    // 2. Fetch all sections
    const sectionsRes = await pool.query(
      `SELECT section_id, title, description, content, is_mandatory, order_index
       FROM tender_section
       WHERE tender_id = $1
       ORDER BY order_index ASC`,
      [tenderId]
    );

    const sections = sectionsRes.rows;

    // 3. Build full content for analysis
    const fullContent = this._buildFullContent(tender, sections);

    // 4. Get proposal count
    const proposalCountRes = await pool.query(
      `SELECT COUNT(*) as count FROM proposal WHERE tender_id = $1`,
      [tenderId]
    );
    const proposalCount = parseInt(proposalCountRes.rows[0].count) || 0;

    // 5. Generate AI summary with bullet points
    let aiSummary;
    try {
      aiSummary = await this._generateAISummary(tender, sections, fullContent);
    } catch (err) {
      console.error('AI summary generation failed, using fallback:', err.message);
      aiSummary = this._generateFallbackSummary(tender, sections);
    }

    // 6. Generate section-wise summaries
    let sectionSummaries;
    try {
      sectionSummaries = await this._generateSectionSummaries(sections, tender);
    } catch (err) {
      console.error('Section summaries failed, using fallback:', err.message);
      sectionSummaries = this._generateFallbackSectionSummaries(sections);
    }

    // 7. Calculate metrics
    const metrics = this._calculateMetrics(tender, sections, proposalCount, fullContent);

    // 8. Return comprehensive response
    return {
      tenderId,
      tenderTitle: tender.title,
      authorityName: tender.authority_name,
      generatedAt: new Date().toISOString(),
      isAIGenerated: !!aiSummary.isAI,

      // Executive Summary
      executiveSummary: aiSummary.executiveSummary,

      // Bullet Point Highlights
      bulletPoints: {
        criticalRequirements: aiSummary.criticalRequirements || [],
        eligibilityCriteria: aiSummary.eligibilityCriteria || [],
        technicalSpecifications: aiSummary.technicalSpecifications || [],
        financialTerms: aiSummary.financialTerms || [],
        complianceRequirements: aiSummary.complianceRequirements || [],
        deadlinesAndTimelines: aiSummary.deadlinesAndTimelines || [],
        riskFactors: aiSummary.riskFactors || [],
      },

      // Section-wise Analysis
      sectionSummaries,

      // Metrics & Scores
      metrics,

      // Opportunity Assessment
      opportunityAssessment: {
        score: metrics.opportunityScore,
        competitionLevel: metrics.competitionLevel,
        urgencyLevel: metrics.urgencyLevel,
        recommendation: this._getRecommendation(metrics.opportunityScore),
      },

      // Action Items for Bidder
      actionItems: aiSummary.actionItems || this._generateActionItems(tender, sections),
    };
  },

  /**
   * Generate AI-powered bullet point summary
   */
  async _generateAISummary(tender, sections, fullContent) {
    const systemPrompt = `You are an expert government tender analyst. Analyze the tender document and extract key information in a structured format.

Your task is to:
1. Write a clear executive summary (3-5 sentences)
2. Extract bullet points for each category
3. Identify critical requirements and risks
4. Provide actionable insights for bidders

IMPORTANT:
- Be specific and extract actual values (amounts, dates, percentages) where mentioned
- Focus on what bidders need to know to prepare their proposal
- Identify any unusual or strict requirements
- Use clear, concise language`;

    const userPrompt = `Analyze this government tender and provide a comprehensive summary:

TENDER DETAILS:
Title: ${tender.title}
Authority: ${tender.authority_name || 'Not specified'}
Type: ${tender.tender_type || 'Not specified'}
Sector: ${tender.sector || 'Not specified'}
Estimated Value: ${tender.estimated_value ? `₹${tender.estimated_value.toLocaleString()}` : 'Not specified'}
Deadline: ${tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleDateString() : 'Not specified'}

TENDER CONTENT:
${fullContent.substring(0, 8000)}

Respond in this exact JSON format:
{
  "executiveSummary": "3-5 sentence overview of the tender scope, objectives, and key deliverables",
  "criticalRequirements": ["requirement 1", "requirement 2", "..."],
  "eligibilityCriteria": ["criteria 1", "criteria 2", "..."],
  "technicalSpecifications": ["spec 1", "spec 2", "..."],
  "financialTerms": ["term 1", "term 2", "..."],
  "complianceRequirements": ["requirement 1", "requirement 2", "..."],
  "deadlinesAndTimelines": ["deadline 1", "milestone 1", "..."],
  "riskFactors": ["risk 1", "risk 2", "..."],
  "actionItems": ["action 1", "action 2", "..."]
}`;

    const response = await callLLM(systemPrompt, userPrompt, { temperature: 0.2 });
    const parsed = parseJSONResponse(response);

    if (!parsed) {
      throw new Error('Failed to parse AI response');
    }

    return { ...parsed, isAI: true };
  },

  /**
   * Generate section-wise AI summaries
   */
  async _generateSectionSummaries(sections, tender) {
    if (!sections || sections.length === 0) {
      return [];
    }

    const summaries = [];

    for (const section of sections) {
      const sectionContent = section.content || section.description || '';

      if (sectionContent.length < 50) {
        // Skip very short sections
        summaries.push({
          sectionId: section.section_id,
          sectionTitle: section.title,
          isMandatory: section.is_mandatory,
          summary: 'Section content is minimal.',
          keyPoints: [],
          requirements: [],
          complexity: 'Low',
          wordCount: sectionContent.split(/\s+/).filter(w => w).length,
        });
        continue;
      }

      try {
        const sectionSummary = await this._summarizeSection(section, tender);
        summaries.push(sectionSummary);
      } catch (err) {
        console.error(`Failed to summarize section ${section.title}:`, err.message);
        summaries.push(this._generateFallbackSectionSummary(section));
      }
    }

    return summaries;
  },

  /**
   * Summarize individual section with AI
   */
  async _summarizeSection(section, tender) {
    const sectionContent = section.content || section.description || '';
    const wordCount = sectionContent.split(/\s+/).filter(w => w).length;

    const systemPrompt = `You are a tender section analyst. Summarize the section and extract key requirements.`;

    const userPrompt = `Analyze this tender section:

SECTION: ${section.title}
MANDATORY: ${section.is_mandatory ? 'Yes' : 'No'}
TENDER CONTEXT: ${tender.title}

CONTENT:
${sectionContent.substring(0, 3000)}

Respond in JSON format:
{
  "summary": "2-3 sentence summary of what this section covers",
  "keyPoints": ["point 1", "point 2", "..."],
  "requirements": ["what bidder must provide/demonstrate"],
  "complexity": "Low|Medium|High|Very High"
}`;

    const response = await callLLM(systemPrompt, userPrompt, {
      temperature: 0.2,
      maxTokens: 500
    });

    const parsed = parseJSONResponse(response);

    if (!parsed) {
      return this._generateFallbackSectionSummary(section);
    }

    return {
      sectionId: section.section_id,
      sectionTitle: section.title,
      isMandatory: section.is_mandatory,
      summary: parsed.summary || 'Summary not available',
      keyPoints: parsed.keyPoints || [],
      requirements: parsed.requirements || [],
      complexity: parsed.complexity || 'Medium',
      wordCount,
      isAI: true,
    };
  },

  /**
   * Build full content string from tender and sections
   */
  _buildFullContent(tender, sections) {
    let content = `${tender.title}\n\n${tender.description || ''}\n\n`;

    for (const section of sections) {
      content += `\n--- ${section.title} ${section.is_mandatory ? '(MANDATORY)' : '(OPTIONAL)'} ---\n`;
      content += (section.content || section.description || '') + '\n';
    }

    return content;
  },

  /**
   * Calculate tender metrics
   */
  _calculateMetrics(tender, sections, proposalCount, fullContent) {
    const wordCount = fullContent.split(/\s+/).filter(w => w).length;
    const mandatorySections = sections.filter(s => s.is_mandatory).length;

    // Calculate days remaining
    const deadline = tender.submission_deadline ? new Date(tender.submission_deadline) : null;
    const daysRemaining = deadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : null;

    // Opportunity score calculation
    let opportunityScore = 70;

    // Competition factor
    if (proposalCount === 0) opportunityScore += 15;
    else if (proposalCount <= 3) opportunityScore += 8;
    else if (proposalCount <= 5) opportunityScore += 3;
    else if (proposalCount >= 10) opportunityScore -= 10;

    // Deadline factor
    if (daysRemaining !== null) {
      if (daysRemaining > 30) opportunityScore += 5;
      else if (daysRemaining > 14) opportunityScore += 2;
      else if (daysRemaining <= 7) opportunityScore -= 10;
      else if (daysRemaining <= 3) opportunityScore -= 20;
    }

    // Complexity factor
    if (wordCount > 5000) opportunityScore -= 5;
    if (mandatorySections > 5) opportunityScore -= 3;

    // Value factor
    if (tender.estimated_value) {
      if (tender.estimated_value >= 10000000) opportunityScore += 5; // ≥1 Cr
    }

    opportunityScore = Math.max(0, Math.min(100, opportunityScore));

    // Competition level
    const competitionLevel = proposalCount === 0 ? 'LOW' :
      proposalCount <= 5 ? 'MEDIUM' : 'HIGH';

    // Urgency level
    const urgencyLevel = daysRemaining === null ? 'UNKNOWN' :
      daysRemaining <= 3 ? 'CRITICAL' :
      daysRemaining <= 7 ? 'HIGH' :
      daysRemaining <= 14 ? 'MEDIUM' : 'LOW';

    // Estimated read time (200 words per minute)
    const estimatedReadTime = Math.ceil(wordCount / 200);

    return {
      wordCount,
      sectionCount: sections.length,
      mandatorySections,
      optionalSections: sections.length - mandatorySections,
      proposalCount,
      daysRemaining,
      estimatedReadTime,
      estimatedValue: tender.estimated_value,
      formattedValue: this._formatValue(tender.estimated_value),
      opportunityScore,
      competitionLevel,
      urgencyLevel,
    };
  },

  /**
   * Format currency value
   */
  _formatValue(value) {
    if (!value) return 'Not specified';
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString()}`;
  },

  /**
   * Get recommendation based on score
   */
  _getRecommendation(score) {
    if (score >= 80) return 'Highly recommended to bid - strong opportunity';
    if (score >= 65) return 'Good opportunity - proceed with proposal preparation';
    if (score >= 50) return 'Moderate opportunity - evaluate your capabilities carefully';
    if (score >= 35) return 'Challenging opportunity - consider if resources permit';
    return 'Low priority - significant challenges expected';
  },

  /**
   * Generate action items for bidder
   */
  _generateActionItems(tender, sections) {
    const actions = [];

    // Deadline-based actions
    const deadline = tender.submission_deadline ? new Date(tender.submission_deadline) : null;
    const daysRemaining = deadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : null;

    if (daysRemaining !== null && daysRemaining <= 7) {
      actions.push('⚠️ URGENT: Deadline approaching - prioritize this tender immediately');
    }

    // Standard actions
    actions.push('Review all mandatory sections thoroughly');
    actions.push('Prepare required documents and certifications');
    actions.push('Calculate EMD and financial requirements');

    const mandatorySections = sections.filter(s => s.is_mandatory);
    if (mandatorySections.length > 0) {
      actions.push(`Complete responses for ${mandatorySections.length} mandatory sections`);
    }

    actions.push('Review compliance requirements and penalty clauses');
    actions.push('Verify eligibility criteria before starting proposal');

    return actions;
  },

  /**
   * Fallback summary when AI fails
   */
  _generateFallbackSummary(tender, sections) {
    const mandatoryCount = sections.filter(s => s.is_mandatory).length;

    return {
      isAI: false,
      executiveSummary: `This tender titled "${tender.title}" is issued by ${tender.authority_name || 'the authority'}. ` +
        `It contains ${sections.length} sections (${mandatoryCount} mandatory). ` +
        `The estimated value is ${this._formatValue(tender.estimated_value)}. ` +
        `Bidders should carefully review all sections and prepare their proposal accordingly.`,
      criticalRequirements: [
        'Review all mandatory sections',
        'Meet eligibility criteria',
        'Submit before deadline',
      ],
      eligibilityCriteria: this._extractKeywords(sections, ['eligibility', 'qualification', 'criteria']),
      technicalSpecifications: this._extractKeywords(sections, ['technical', 'specification', 'requirement']),
      financialTerms: this._extractKeywords(sections, ['financial', 'payment', 'emd', 'price']),
      complianceRequirements: this._extractKeywords(sections, ['compliance', 'penalty', 'warranty']),
      deadlinesAndTimelines: tender.submission_deadline ?
        [`Submission deadline: ${new Date(tender.submission_deadline).toLocaleDateString()}`] : [],
      riskFactors: [
        'Review penalty clauses carefully',
        'Ensure all mandatory documents are ready',
      ],
      actionItems: this._generateActionItems(tender, sections),
    };
  },

  /**
   * Extract keywords from sections
   */
  _extractKeywords(sections, keywords) {
    const results = [];

    for (const section of sections) {
      const content = (section.content || section.description || '').toLowerCase();
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          results.push(`${section.title}: Contains ${keyword} requirements`);
          break;
        }
      }
    }

    return results.slice(0, 5);
  },

  /**
   * Fallback section summaries
   */
  _generateFallbackSectionSummaries(sections) {
    return sections.map(section => this._generateFallbackSectionSummary(section));
  },

  /**
   * Fallback for single section
   */
  _generateFallbackSectionSummary(section) {
    const content = section.content || section.description || '';
    const wordCount = content.split(/\s+/).filter(w => w).length;

    const complexity = wordCount < 100 ? 'Low' :
      wordCount < 300 ? 'Medium' :
      wordCount < 600 ? 'High' : 'Very High';

    return {
      sectionId: section.section_id,
      sectionTitle: section.title,
      isMandatory: section.is_mandatory,
      summary: `This section covers ${section.title.toLowerCase()}. ${section.is_mandatory ? 'This is a mandatory section.' : 'This is an optional section.'}`,
      keyPoints: [`Review ${section.title} requirements`, section.is_mandatory ? 'Mandatory response required' : 'Optional but recommended'],
      requirements: section.is_mandatory ? ['Complete this section before submission'] : [],
      complexity,
      wordCount,
      isAI: false,
    };
  },

  /**
   * Quick summary for list views (lighter weight)
   */
  async generateQuickSummary(tenderId) {
    const tenderRes = await pool.query(
      `SELECT t.tender_id, t.title, t.description, t.estimated_value,
              t.submission_deadline, t.status
       FROM tender t
       WHERE t.tender_id = $1`,
      [tenderId]
    );

    if (tenderRes.rows.length === 0) {
      throw new Error('Tender not found');
    }

    const tender = tenderRes.rows[0];
    const description = tender.description || '';

    // Generate quick 2-3 line summary using AI
    try {
      const systemPrompt = 'You are a tender summarizer. Provide a brief 2-3 sentence summary.';
      const userPrompt = `Summarize this tender in 2-3 sentences for a bidder:\n\nTitle: ${tender.title}\n\nDescription: ${description.substring(0, 1500)}`;

      const summary = await callLLM(systemPrompt, userPrompt, {
        temperature: 0.2,
        maxTokens: 200
      });

      return {
        tenderId,
        title: tender.title,
        quickSummary: summary,
        estimatedValue: this._formatValue(tender.estimated_value),
        deadline: tender.submission_deadline,
        isAI: true,
      };
    } catch (err) {
      return {
        tenderId,
        title: tender.title,
        quickSummary: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
        estimatedValue: this._formatValue(tender.estimated_value),
        deadline: tender.submission_deadline,
        isAI: false,
      };
    }
  },
};
