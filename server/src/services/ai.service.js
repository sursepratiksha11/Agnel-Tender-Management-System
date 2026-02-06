import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { ChunkingService } from './chunking.service.js';
import { EmbeddingService } from './embedding.service.js';
import { RAGOrchestrator } from '../utils/ragOrchestrator.js';
import { LLMCaller } from '../utils/llmCaller.js';
import { TokenCounter } from '../utils/tokenCounter.js';
import { ContextCompressor } from '../utils/contextCompressor.js';

const CHAT_MODEL = env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// DEPRECATED: Use LLMCaller instead
async function callChatCompletion(prompt, systemPrompt = 'You are a tender assistant. Use ONLY the provided context. If the answer is not in the context, say you do not know.') {
  return LLMCaller.call({
    systemPrompt,
    userPrompt: prompt,
    model: CHAT_MODEL,
    temperature: parseFloat(env.AI_TEMPERATURE || '0'),
  });
}

/**
 * Fallback mock response for testing without API key
 */
function generateMockSuggestion(sectionType, userQuestion) {
  const mocksBySection = {
    ELIGIBILITY: [
      {
        observation: 'Missing specific qualification thresholds for bidders',
        suggestedText: 'Bidders must possess a valid registration certificate from relevant statutory authority and demonstrate minimum 3 years of experience in similar works.',
        reason: 'Government tenders require documented evidence of bidder capability and compliance history.'
      },
      {
        observation: 'Financial qualification criteria not clearly defined',
        suggestedText: 'Bidders must have an average annual turnover of minimum ₹5 crores during the last 3 financial years, supported by audited financial statements.',
        reason: 'Ensures bidder has sufficient financial capacity to execute the tender without default risk.'
      }
    ],
    TECHNICAL: [
      {
        observation: 'Technical specifications lack detail on performance standards',
        suggestedText: 'All deliverables must conform to relevant IS (Indian Standards) / ISO standards and undergo third-party quality testing before acceptance.',
        reason: 'Defines measurable quality criteria and enables transparent evaluation of technical compliance.'
      },
      {
        observation: 'Material/resource requirements not specified',
        suggestedText: 'Only materials with ISI/ISO certification are acceptable. Supplier details and certificates must be submitted with the bid for approval.',
        reason: 'Ensures consistency and quality throughout the project lifecycle.'
      }
    ],
    FINANCIAL: [
      {
        observation: 'EMD (Earnest Money Deposit) amount and release terms missing',
        suggestedText: 'EMD amount: 2% of tender value (without GST). EMD will be released within 30 days of contract completion, subject to satisfactory performance.',
        reason: 'EMD is a standard government mechanism to ensure bid seriousness and financial accountability.'
      },
      {
        observation: 'Payment milestone terms not defined',
        suggestedText: 'Payment will be released as follows: 30% on contract signing, 40% on delivery with acceptance certificate, 30% on final completion and sign-off.',
        reason: 'Links payments to deliverables, protecting government interest and ensuring project completion.'
      }
    ],
    EVALUATION: [
      {
        observation: 'Technical vs financial scoring weightage not transparent',
        suggestedText: 'Evaluation methodology: Technical bid (60%) + Financial bid (40%). Minimum 40% marks required in technical evaluation for financial bid to be opened.',
        reason: 'Transparency in evaluation criteria ensures fairness and defensibility of tender award decision.'
      },
      {
        observation: 'Selection criteria and pass/fail thresholds not defined',
        suggestedText: 'Selected bidder will be the one with highest combined score (Technical + Financial). In case of tie, the bidder with higher technical score will be preferred.',
        reason: 'Clear tiebreaker rules prevent disputes and ensure consistent application of evaluation logic.'
      }
    ],
    TERMS: [
      {
        observation: 'Performance guarantee/security period not specified',
        suggestedText: 'Contractor shall maintain defect liability for 12 months from the date of completion. A performance security of 5% of contract value will be held as guarantee.',
        reason: 'Protects government against performance failures and provides recourse for rectification.'
      },
      {
        observation: 'Dispute resolution mechanism not clearly defined',
        suggestedText: 'All disputes arising out of this contract shall first be addressed through mutual consultation. Unresolved disputes will be referred to arbitration under Arbitration and Conciliation Act, 1996.',
        reason: 'Provides clear escalation path for dispute resolution without litigation delays.'
      }
    ]
  };

  return mocksBySection[sectionType] || [
    {
      observation: 'Section content could be enhanced with more specific requirements',
      suggestedText: 'Ensure all criteria are measurable, time-bound, and include specific thresholds or standards relevant to government compliance.',
      reason: 'Clear and specific requirements reduce ambiguity and enable fair evaluation of bids.'
    }
  ];
}

export const AIService = {
  /**
   * Ingest tender content: chunk + embed + store in tender_content_chunk.
   * Runs in a single transaction when no external client is provided.
   */
  async ingestTender(tenderId, options = {}) {
    const { client: externalClient, skipTransaction = false } = options;
    const client = externalClient || (await pool.connect());
    const manageTx = !skipTransaction;

    try {
      if (manageTx) await client.query('BEGIN');

      const tenderRes = await client.query(
        `SELECT tender_id, title, description, status
         FROM tender
         WHERE tender_id = $1`,
        [tenderId]
      );

      if (tenderRes.rows.length === 0) {
        throw new Error('Tender not found');
      }

      const tender = tenderRes.rows[0];

      if (tender.status !== 'PUBLISHED') {
        throw new Error('Tender must be published before ingestion');
      }

      const sectionsRes = await client.query(
        `SELECT section_id, title, order_index, is_mandatory
         FROM tender_section
         WHERE tender_id = $1
         ORDER BY order_index ASC`,
        [tenderId]
      );

      const sections = sectionsRes.rows.map((row) => ({
        sectionId: row.section_id,
        title: row.title,
        content: row.content || '', // content column may not exist; fallback to empty
      }));

      const chunks = ChunkingService.chunkTender({
        tenderId,
        tenderTitle: tender.title,
        tenderDescription: tender.description || '',
        sections,
      });

      if (!chunks.length) {
        throw new Error('No tender content available for ingestion');
      }

      // Remove existing embeddings for this tender
      await client.query('DELETE FROM tender_content_chunk WHERE tender_id = $1', [tenderId]);

      // Insert new chunks with embeddings
      for (const chunk of chunks) {
        const embedding = await EmbeddingService.embed(chunk.content);
        await client.query(
          `INSERT INTO tender_content_chunk (tender_id, section_id, content, embedding)
           VALUES ($1, $2, $3, $4::vector)`,
          [tenderId, chunk.sectionId, chunk.content, embedding]
        );
      }

      if (manageTx) await client.query('COMMIT');
    } catch (err) {
      if (manageTx) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (!externalClient) {
        client.release();
      }
    }
  },

  /**
   * Answer a user question using RAG over tender content.
   * UPDATED: Uses RAGOrchestrator with strict limits and compression
   */
  async queryTenderAI(tenderId, question) {
    if (!question || !question.trim()) {
      throw new Error('Question is required');
    }

    // Ensure tender exists and is published
    const tenderRes = await pool.query(
      'SELECT status FROM tender WHERE tender_id = $1',
      [tenderId]
    );

    if (tenderRes.rows.length === 0) {
      throw new Error('Tender not found');
    }

    if (tenderRes.rows[0].status !== 'PUBLISHED') {
      throw new Error('Tender must be published to query AI');
    }

    console.log(`[AI Query] Tender: ${tenderId}, Question: ${question.substring(0, 100)}...`);

    // Use RAG Orchestrator for retrieval and compression
    const ragResult = await RAGOrchestrator.retrieve({
      query: question,
      sessionId: tenderId,
      analysisType: 'general',
      modelName: CHAT_MODEL,
    });

    if (!ragResult.context || ragResult.stats.compressed.total === 0) {
      return "I don't have enough information from the tender content to answer that question.";
    }

    const systemPrompt = `You are a tender analysis assistant. Use ONLY the provided context to answer questions.

RULES:
- If the answer is not in the context, say: "Not specified in the tender document."
- Do not hallucinate or make assumptions
- Be precise and cite specific requirements when available`;

    const userPrompt = `CONTEXT:\n${ragResult.context}\n\nQUESTION:\n${question}\n\nANSWER:`;

    const answer = await LLMCaller.call({
      systemPrompt,
      userPrompt,
      model: CHAT_MODEL,
      temperature: 0,
      maxTokens: 1000,
    });

    return answer || "I don't have enough information from the tender content to answer that question.";
  },

  /**
   * Admin assistance: generate content using only tender metadata (no embeddings).
   */
  async generateTenderContent(tenderId, prompt) {
    if (!prompt || !prompt.trim()) {
      throw new Error('Prompt is required');
    }

    // Fetch tender metadata
    const tenderRes = await pool.query(
      `SELECT tender_id, title, description, status
       FROM tender
       WHERE tender_id = $1`,
      [tenderId]
    );

    if (tenderRes.rows.length === 0) {
      throw new Error('Tender not found');
    }

    const tender = tenderRes.rows[0];

    // Sections metadata
    const sectionsRes = await pool.query(
      `SELECT title, is_mandatory, order_index
       FROM tender_section
       WHERE tender_id = $1
       ORDER BY order_index ASC`,
      [tenderId]
    );

    const sectionLines = sectionsRes.rows.map((s, idx) => {
      const flag = s.is_mandatory ? 'MANDATORY' : 'OPTIONAL';
      return `${idx + 1}. ${s.title} (${flag})`;
    });

    const context = [
      `Title: ${tender.title || ''}`,
      `Description: ${tender.description || ''}`,
      `Status: ${tender.status}`,
      'Sections:',
      sectionLines.length ? sectionLines.join('\n') : 'None',
    ].join('\n');

    const fullPrompt = `TENDER METADATA:\n${context}\n\nUSER REQUEST:\n${prompt}`;

    const response = await callChatCompletion(fullPrompt);

    return response || 'I cannot generate content without sufficient tender metadata.';
  },

  /**
   * AI Drafting Assistance: Review existing content and suggest improvements (no auto-apply)
   * Uses RAG to retrieve similar sections from published tenders as reference
   * UPDATED: Token-safe with strict retrieval limits
   * @param {Object} options - Configuration
   * @param {string} options.mode - "section" or "tender"
   * @param {string} options.sectionType - Section key (for section mode)
   * @param {string} options.existingContent - Current content to review
   * @param {Object} options.tenderMetadata - Tender metadata (department, sector, etc.)
   * @param {string} options.userQuestion - User's question/request
   * @returns {Promise<Array>} - Array of suggestions with {observation, suggestedText, reason}
   */
  async assistTenderDrafting(options = {}) {
    const { mode, sectionType, existingContent, tenderMetadata = {}, userQuestion } = options;

    if (!userQuestion || !userQuestion.trim()) {
      throw new Error('User question is required');
    }

    console.log(`[Drafting Assist] Section: ${sectionType}, Question: ${userQuestion.substring(0, 100)}...`);

    // RAG: Retrieve similar published tender sections for reference
    // STRICT LIMITS: Max 3 reference chunks
    let referenceContext = '';
    try {
      const ragResult = await RAGOrchestrator.retrieve({
        query: userQuestion,
        sessionId: null, // No session, only global search
        analysisType: sectionType?.toLowerCase() || 'general',
        modelName: CHAT_MODEL,
      });

      if (ragResult.globalContext) {
        referenceContext = '\n\nREFERENCE EXAMPLES from published tenders:\n' + ragResult.globalContext;
      }

      console.log(`[Drafting Assist] Retrieved ${ragResult.stats.compressed.global} reference chunks`);
    } catch (err) {
      // If embedding fails, continue without RAG context
      console.warn('[Drafting Assist] RAG retrieval failed, proceeding without reference context:', err.message);
    }

    // Build section-specific guidance
    const getSectionGuidance = (sectionType) => {
      const guidance = {
        ELIGIBILITY: `
SECTION FOCUS: Eligibility Criteria
Key areas to review:
- Qualification thresholds (certifications, registrations, licenses)
- Experience requirements (years, similar work, proven track record)
- Financial capacity (turnover, credit rating, banking relationships)
- Organizational details (company structure, staff credentials)
- Compliance history (regulatory compliance, previous project performance)

CRITICAL RULES for this section:
- Suggest specific qualification benchmarks (not vague language)
- Include measurable criteria with numbers (years, rupees amounts, percentages)
- Reference relevant government/statutory bodies for validations
- Avoid creating new categories - only fill gaps
`,
        TECHNICAL: `
SECTION FOCUS: Technical Requirements/Specifications
Key areas to review:
- Performance specifications and standards (IS/ISO standards)
- Material and resource requirements
- Quality assurance and testing methodologies
- Delivery timelines and milestones
- Technical compliance and certifications

CRITICAL RULES for this section:
- Suggest specific technical standards (IS, ISO, BIS codes)
- Include measurable performance criteria with units
- Reference government technical guidelines where applicable
- Never rewrite existing specifications, only add missing ones
`,
        FINANCIAL: `
SECTION FOCUS: Financial Conditions
Key areas to review:
- EMD (Earnest Money Deposit) amount and terms
- Payment milestones and conditions
- Bill of Quantities (BOQ) structure
- Price adjustment clauses (if any)
- Financial penalties and liquidated damages

CRITICAL RULES for this section:
- Suggest EMD percentages aligned with government norms (typically 1-5%)
- Link payment releases to specific deliverables
- Use standard government formulations for financial clauses
- Include clear terms for GST applicability
`,
        EVALUATION: `
SECTION FOCUS: Evaluation Criteria
Key areas to review:
- Technical vs financial bid scoring weightage
- Pass/fail thresholds for technical evaluation
- Selection methodology and tiebreaker rules
- Scoring transparency and formula
- Committee composition (if applicable)

CRITICAL RULES for this section:
- Suggest transparent, objective evaluation criteria
- Include specific percentage/point allocations (e.g., 60% technical, 40% financial)
- Define minimum qualifying marks for technical bid
- Ensure consistency with government procurement guidelines
`,
        TERMS: `
SECTION FOCUS: Terms & Conditions / Legal Framework
Key areas to review:
- Defect liability period and performance guarantees
- Penalty clauses and dispute resolution mechanisms
- Force majeure and risk allocation
- Insurance and indemnity requirements
- Contract termination and exit clauses

CRITICAL RULES for this section:
- Suggest clauses aligned with Indian legal standards
- Include dispute resolution hierarchy (negotiation → arbitration)
- Reference relevant acts (Indian Contract Act, Arbitration Act)
- Ensure balanced risk allocation between parties
`
      };
      return guidance[sectionType] || '';
    };

    // Build the system prompt for government-friendly reviewing
    const systemPrompt = `You are a senior government tender drafting officer and compliance expert.

YOUR CORE RESPONSIBILITIES:
1. REVIEW existing tender section content
2. IDENTIFY gaps, missing clauses, or weak wording
3. SUGGEST INCREMENTAL improvements ONLY
4. NEVER rewrite entire sections
5. NEVER remove user-written content
6. NEVER add clauses that conflict with existing content
7. Make suggestions audit-friendly, defensible, and government-compliant

RULES:
- Use ONLY the provided context and reference examples
- Provide DELTA-ONLY suggestions (small, insertable text blocks)
- Each suggestion should address ONE specific gap
- Suggestions should be concrete and measurable
- Keep suggested text brief (1-3 sentences maximum)
- If information is not in context, say "Not specified in reference tenders"

For each suggestion, provide exactly:
- observation: What is missing or could be improved (specific, not vague)
- suggestedText: The exact text to ADD (not replace) - keep it concise
- reason: Why this is important for government compliance/clarity

OUTPUT FORMAT:
- Provide 2-3 targeted suggestions ONLY if there are gaps
- Format each suggestion exactly as: SUGGESTION [number]: Observation: ... Text: ... Reason: ...
- If content is adequate, respond with: "No improvements needed for this request."
${getSectionGuidance(sectionType)}
`;

    const userPrompt = `MODE: ${mode === 'section' ? 'Reviewing a single section' : 'Reviewing entire tender'}
${sectionType ? `SECTION TYPE: ${sectionType}` : ''}

CURRENT CONTENT TO REVIEW:
${existingContent?.substring(0, 2000) || '(empty)'}

USER QUESTION/REQUEST:
${userQuestion}
${referenceContext}

Provide 2-3 targeted suggestions ONLY if there are gaps. Format each suggestion as:
SUGGESTION [number]:
Observation: [what is missing]
Text: [exact text to add]
Reason: [why it matters]

If content is adequate, respond with: "No improvements needed for this request."`;

    console.log(`[Drafting Assist] Estimated prompt tokens: ${TokenCounter.estimate(systemPrompt + userPrompt)}`);

    try {
      const response = await LLMCaller.call({
        systemPrompt,
        userPrompt,
        model: CHAT_MODEL,
        temperature: 0.2,
        maxTokens: 1500,
      });

      // Parse AI response into structured suggestions
      const suggestions = parseAISuggestions(response);

      return suggestions;
    } catch (err) {
      // Fallback to mock suggestions if API fails
      console.warn('[Drafting Assist] AI API failed, using mock suggestions:', err.message);
      const mockSuggestions = generateMockSuggestion(sectionType, userQuestion);
      return mockSuggestions;
    }
  },

  /**
   * Analyze a proposal section response against tender requirement
   * Returns advisory guidance (no auto-write, no auto-apply)
   * UPDATED: Token-safe with RAG support
   * ALWAYS returns HTTP 200 with fallback on any error
   */
  async analyzeProposalSection(sectionType, draftContent, tenderRequirement = '', userQuestion = '') {
    try {
      console.log(`[Proposal Analysis] Section: ${sectionType}, Question: ${userQuestion.substring(0, 100)}...`);

      // If no API key, use fallback immediately
      if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY && !env.HUGGINGFACE_API_KEY && !env.OPENAI_API_KEY) {
        console.log('[Proposal Analysis] No API key - using fallback guidance');
        return generateFallbackSectionGuidance(sectionType, draftContent, tenderRequirement);
      }

      const systemPrompt = `You are a tender proposal assistant. Analyze this bidder's draft response against tender requirements.

RULES:
- Provide 1-3 specific improvement suggestions
- Focus on: Completeness, clarity, compliance, risk mitigation
- If draft is comprehensive, say "No improvements needed"
- Keep suggestions actionable and brief`;

      const userPrompt = `Section Type: ${sectionType}
Tender Requirement: ${tenderRequirement?.substring(0, 500) || '(No specific requirement provided)'}
Bidder's Draft: ${draftContent?.substring(0, 1500) || '(Empty draft)'}
User Question: ${userQuestion || 'General analysis'}

Provide 1-3 specific improvement suggestions in this EXACT format:

SUGGESTION 1:
observation: [What's missing or could be improved]
suggestedImprovement: [Specific actionable improvement - keep it brief]
reason: [Why this matters for government tender evaluation]

SUGGESTION 2:
...

If the draft is comprehensive and well-structured, say "No improvements needed."`;

      console.log(`[Proposal Analysis] Estimated prompt tokens: ${TokenCounter.estimate(systemPrompt + userPrompt)}`);

      const response = await LLMCaller.call({
        systemPrompt,
        userPrompt,
        model: CHAT_MODEL,
        temperature: 0.2,
        maxTokens: 1000,
      });

      if (!response || response.trim().length === 0) {
        console.log('[Proposal Analysis] Empty AI response - using fallback');
        return generateFallbackSectionGuidance(sectionType, draftContent, tenderRequirement);
      }

      // Parse AI response into structured format
      const parsed = parseAIResponseToSuggestions(response, sectionType);
      
      if (!parsed || parsed.suggestions.length === 0) {
        console.log('[Proposal Analysis] Failed to parse AI response - using fallback');
        return generateFallbackSectionGuidance(sectionType, draftContent, tenderRequirement);
      }

      return {
        mode: 'ai',
        suggestions: parsed.suggestions
      };

    } catch (err) {
      console.error('[Proposal Analysis] Error during analysis:', err.message);
      // Graceful fallback for any error - NEVER throw to frontend
      return generateFallbackSectionGuidance(sectionType, draftContent, tenderRequirement);
    }
  },
};

/**
 * Parse AI response into structured suggestions
 * @param {string} response - Raw AI response
 * @returns {Array} - Structured suggestions
 */
function parseAISuggestions(response) {
  const suggestions = [];

  // Check if AI says no improvements needed
  if (response.toLowerCase().includes('no improvements needed')) {
    return [{
      observation: 'Content review complete',
      suggestedText: '',
      reason: 'Your content is well-structured and comprehensive.'
    }];
  }

  // Parse "SUGGESTION [n]:" blocks
  const suggestionBlocks = response.split(/SUGGESTION\s+\d+:/i).filter(Boolean);

  suggestionBlocks.forEach(block => {
    try {
      // Extract observation
      const obsMatch = block.match(/Observation:\s*(.+?)(?=Text:|Reason:|$)/is);
      const observation = obsMatch?.[1]?.trim() || '';

      // Extract suggested text
      const textMatch = block.match(/Text:\s*(.+?)(?=Reason:|$)/is);
      const suggestedText = textMatch?.[1]?.trim() || '';

      // Extract reason
      const reasonMatch = block.match(/Reason:\s*(.+?)$/is);
      const reason = reasonMatch?.[1]?.trim() || '';

      if (observation && suggestedText) {
        suggestions.push({
          observation,
          suggestedText,
          reason
        });
      }
    } catch (err) {
      console.warn('Failed to parse suggestion block:', err.message);
    }
  });

  return suggestions.length > 0 ? suggestions : [{
    observation: 'Analysis complete',
    suggestedText: '',
    reason: 'Consider reviewing the content for completeness.'
  }];
}
/**
 * Analyze a proposal section response against tender requirement
 * Returns advisory guidance (no auto-write, no auto-apply)
 */
export async function analyzeProposalSection(sectionType, draftContent, tenderRequirement = '', userQuestion = '') {
  return AIService.analyzeProposalSection(sectionType, draftContent, tenderRequirement, userQuestion);
}

/**
 * Parse AI response into structured suggestions
 * Handles both "SUGGESTION N:" format and plain text
 */
function parseAIResponseToSuggestions(response, sectionType) {
  try {
    const suggestions = [];

    // Check if AI says no improvements needed
    if (response.toLowerCase().includes('no improvements needed') || 
        response.toLowerCase().includes('no improvement needed') ||
        response.toLowerCase().includes('well-structured and comprehensive')) {
      return {
        mode: 'ai',
        suggestions: [{
          observation: 'Content review complete',
          suggestedImprovement: '',
          reason: 'Your draft appears well-structured and addresses key requirements.'
        }]
      };
    }

    // Try to parse "SUGGESTION N:" blocks
    const suggestionBlocks = response.split(/SUGGESTION\s+\d+:/i).filter(Boolean);

    suggestionBlocks.forEach(block => {
      try {
        // Extract observation
        const obsMatch = block.match(/observation:\s*(.+?)(?=suggestedImprovement:|reason:|SUGGESTION|$)/is);
        const observation = obsMatch?.[1]?.trim() || '';

        // Extract suggested improvement
        const improvementMatch = block.match(/suggestedImprovement:\s*(.+?)(?=reason:|SUGGESTION|$)/is);
        const suggestedImprovement = improvementMatch?.[1]?.trim() || '';

        // Extract reason
        const reasonMatch = block.match(/reason:\s*(.+?)(?=SUGGESTION|$)/is);
        const reason = reasonMatch?.[1]?.trim() || '';

        if (observation && reason) {
          suggestions.push({
            observation: observation.substring(0, 200), // Limit length
            suggestedImprovement: suggestedImprovement.substring(0, 300),
            reason: reason.substring(0, 200)
          });
        }
      } catch (err) {
        console.warn('[AI Service] Failed to parse suggestion block:', err.message);
      }
    });

    // If parsing succeeded, return suggestions
    if (suggestions.length > 0) {
      return {
        mode: 'ai',
        suggestions: suggestions.slice(0, 3) // Max 3 suggestions
      };
    }

    // If structured parsing failed, return null to trigger fallback
    return null;

  } catch (err) {
    console.error('[AI Service] Error parsing AI response:', err.message);
    return null;
  }
}

/**
 * Parse structured section guidance from AI response
 */
function parseSectionGuidance(response, sectionType) {
  try {
    // Extract observation
    const obsMatch = response.match(/observation:\s*(.+?)(?=suggested|reason|$)/i);
    const observation = obsMatch?.[1]?.trim() || '';

    // Extract suggested text
    const textMatch = response.match(/suggested[^:]*:\s*(.+?)(?=reason|$)/i);
    const suggestedText = textMatch?.[1]?.trim() || '';

    // Extract reason
    const reasonMatch = response.match(/reason:\s*(.+?)$/i);
    const reason = reasonMatch?.[1]?.trim() || '';

    if (observation && reason) {
      return {
        observation,
        suggestedText: suggestedText || 'Review your draft against the tender requirements',
        reason,
        isAI: true
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Generate rule-based fallback guidance when AI is unavailable
 * Uses deterministic content analysis based on section type
 */
function generateFallbackSectionGuidance(sectionType, draftContent = '', tenderRequirement = '') {
  const content = (draftContent || '').toLowerCase();
  const requirement = (tenderRequirement || '').toLowerCase();
  const contentLength = content.trim().length;

  // Build suggestions array based on section-specific analysis
  const suggestions = [];

  switch (sectionType) {
    case 'ELIGIBILITY':
      suggestions.push(...analyzeEligibilitySection(content, requirement, contentLength));
      break;
    case 'TECHNICAL':
      suggestions.push(...analyzeTechnicalSection(content, requirement, contentLength));
      break;
    case 'FINANCIAL':
      suggestions.push(...analyzeFinancialSection(content, requirement, contentLength));
      break;
    case 'EVALUATION':
      suggestions.push(...analyzeEvaluationSection(content, requirement, contentLength));
      break;
    case 'TERMS':
      suggestions.push(...analyzeTermsSection(content, requirement, contentLength));
      break;
    default:
      suggestions.push(getGenericGuidance(contentLength));
  }

  // If no specific issues found, provide positive feedback
  if (suggestions.length === 0) {
    suggestions.push({
      observation: 'Your content appears well-structured',
      suggestedImprovement: 'Review alignment with tender requirements before submission',
      reason: 'Regular review ensures completeness and accuracy'
    });
  }

  return {
    mode: 'fallback',
    suggestions: suggestions.slice(0, 3) // Limit to 3 suggestions max
  };
}

/**
 * Analyze ELIGIBILITY section content
 */
function analyzeEligibilitySection(content, requirement, contentLength) {
  const suggestions = [];

  // Check for years of experience
  if (!content.match(/\d+\s*(year|yr)/)) {
    suggestions.push({
      observation: 'Missing specific experience duration',
      suggestedImprovement: 'Explicitly state years of experience (e.g., "minimum 5 years of experience in similar projects")',
      reason: 'Tender evaluators require clear, quantifiable experience metrics for assessment'
    });
  }

  // Check for turnover/financial capacity
  if (!content.match(/(turnover|revenue|financial|₹|rs\.?|inr)/)) {
    suggestions.push({
      observation: 'Financial qualification criteria not mentioned',
      suggestedImprovement: 'Include average annual turnover or financial capacity with supporting documentation reference',
      reason: 'Demonstrates financial stability and capacity to execute the project'
    });
  }

  // Check for certifications/registrations
  if (!content.match(/(certificate|certification|registration|license|iso|permit)/)) {
    suggestions.push({
      observation: 'Required certifications or registrations not specified',
      suggestedImprovement: 'List all relevant certifications, licenses, and statutory registrations (e.g., GST, ISO certifications)',
      reason: 'Regulatory compliance is mandatory for government tenders'
    });
  }

  // Check for similar project experience
  if (!content.match(/(similar|comparable|previous|past|completed|experience)/)) {
    suggestions.push({
      observation: 'Similar project experience not highlighted',
      suggestedImprovement: 'Provide examples of similar projects completed, with project values and completion dates',
      reason: 'Demonstrates proven capability and reduces perceived execution risk'
    });
  }

  // Content length check
  if (contentLength < 100) {
    suggestions.push({
      observation: 'Content is too brief for eligibility criteria',
      suggestedImprovement: 'Expand with detailed qualification information, backed by specific evidence',
      reason: 'Comprehensive eligibility responses inspire confidence in evaluators'
    });
  }

  return suggestions;
}

/**
 * Analyze TECHNICAL section content
 */
function analyzeTechnicalSection(content, requirement, contentLength) {
  const suggestions = [];

  // Check for technical approach/methodology
  if (!content.match(/(approach|methodology|method|process|procedure|strategy)/)) {
    suggestions.push({
      observation: 'Technical approach or methodology not clearly defined',
      suggestedImprovement: 'Describe your technical approach in structured steps (e.g., Phase 1: Assessment, Phase 2: Implementation)',
      reason: 'Clear methodology demonstrates planning and reduces execution uncertainty'
    });
  }

  // Check for standards/specifications
  if (!content.match(/(standard|specification|iso|isi|compliance|conform|guideline)/)) {
    suggestions.push({
      observation: 'Compliance with technical standards not mentioned',
      suggestedImprovement: 'Explicitly reference applicable standards (ISO, ISI, BIS) and how your solution complies',
      reason: 'Standards compliance ensures quality and facilitates acceptance testing'
    });
  }

  // Check for tools/technologies/materials
  if (!content.match(/(tool|technology|material|equipment|resource|system)/)) {
    suggestions.push({
      observation: 'Tools, technologies, or materials not specified',
      suggestedImprovement: 'List key tools, technologies, and materials to be used with technical justification',
      reason: 'Transparent resource planning enables better evaluation of technical feasibility'
    });
  }

  // Check for quality assurance/testing
  if (!content.match(/(quality|testing|test|qa|qc|inspection|verification|validation)/)) {
    suggestions.push({
      observation: 'Quality assurance or testing procedures not addressed',
      suggestedImprovement: 'Define quality control measures and testing protocols (e.g., "third-party testing at key milestones")',
      reason: 'Quality assurance processes are critical for government project acceptance'
    });
  }

  // Content length check
  if (contentLength < 150) {
    suggestions.push({
      observation: 'Technical content lacks detail',
      suggestedImprovement: 'Expand with specific technical details, mapped directly to tender specifications',
      reason: 'Detailed technical responses demonstrate competence and preparation'
    });
  }

  return suggestions;
}

/**
 * Analyze FINANCIAL section content
 */
function analyzeFinancialSection(content, requirement, contentLength) {
  const suggestions = [];

  // Check for cost structure/pricing
  if (!content.match(/(cost|price|pricing|rate|amount|₹|rs\.?|inr)/)) {
    suggestions.push({
      observation: 'Cost structure or pricing assumptions not detailed',
      suggestedImprovement: 'Provide itemized cost breakdown with clear assumptions and basis of estimates',
      reason: 'Transparent pricing enables accurate evaluation and prevents post-award disputes'
    });
  }

  // Check for payment milestones
  if (!content.match(/(payment|milestone|installment|schedule|advance|final)/)) {
    suggestions.push({
      observation: 'Payment milestones or schedule not defined',
      suggestedImprovement: 'Specify payment terms linked to deliverable milestones (e.g., "30% advance, 40% on delivery, 30% after acceptance")',
      reason: 'Milestone-based payments align with government financial procedures'
    });
  }

  // Check for taxes/duties/EMD
  if (!content.match(/(tax|gst|duty|emd|earnest|deposit|security)/)) {
    suggestions.push({
      observation: 'Tax, duties, or EMD references missing',
      suggestedImprovement: 'Clarify GST applicability, EMD amount, and other financial obligations as per tender terms',
      reason: 'Financial compliance with tender conditions prevents disqualification'
    });
  }

  // Check for financial compliance language
  if (!content.match(/(comply|accept|agree|acknowledge|confirm)/)) {
    suggestions.push({
      observation: 'Acceptance of financial terms not explicitly confirmed',
      suggestedImprovement: 'Add explicit acceptance statement (e.g., "We accept all payment and financial terms as specified in the tender")',
      reason: 'Explicit confirmation demonstrates commitment and reduces negotiation risks'
    });
  }

  // Content length check
  if (contentLength < 100) {
    suggestions.push({
      observation: 'Financial proposal lacks sufficient detail',
      suggestedImprovement: 'Expand with comprehensive financial terms, aligned with tender requirements',
      reason: 'Detailed financial proposals facilitate faster evaluation and approval'
    });
  }

  return suggestions;
}

/**
 * Analyze EVALUATION section content
 */
function analyzeEvaluationSection(content, requirement, contentLength) {
  const suggestions = [];

  // Check if evaluation criteria addressed
  if (!content.match(/(criteria|parameter|score|weight|evaluation|assessment)/)) {
    suggestions.push({
      observation: 'Evaluation criteria or parameters not explicitly addressed',
      suggestedImprovement: 'Map your response directly to each evaluation criterion mentioned in the tender',
      reason: 'Direct alignment with evaluation criteria maximizes scoring potential'
    });
  }

  // Check if strengths are highlighted
  if (!content.match(/(strength|advantage|experience|capability|proven|successful)/)) {
    suggestions.push({
      observation: 'Key strengths or differentiators not highlighted',
      suggestedImprovement: 'Emphasize relevant strengths that align with scoring parameters (e.g., past performance, certifications)',
      reason: 'Highlighting strengths helps evaluators identify your competitive advantages'
    });
  }

  // Check for factual, clear language
  if (content.match(/(maybe|perhaps|might|possibly|could be)/)) {
    suggestions.push({
      observation: 'Content contains tentative or uncertain language',
      suggestedImprovement: 'Use clear, factual, and confident language supported by evidence',
      reason: 'Confident, evidence-based responses inspire trust in your capability'
    });
  }

  // Content length check
  if (contentLength < 100) {
    suggestions.push({
      observation: 'Evaluation response too brief',
      suggestedImprovement: 'Expand by addressing each evaluation parameter systematically with supporting facts',
      reason: 'Comprehensive responses demonstrate thoroughness and attention to detail'
    });
  }

  return suggestions;
}

/**
 * Analyze TERMS section content
 */
function analyzeTermsSection(content, requirement, contentLength) {
  const suggestions = [];

  // Check for acknowledgment of key terms
  if (!content.match(/(accept|agree|acknowledge|comply|confirm)/)) {
    suggestions.push({
      observation: 'Explicit acceptance of terms not stated',
      suggestedImprovement: 'Include clear acceptance statement (e.g., "We accept all terms and conditions without deviation")',
      reason: 'Explicit acceptance prevents ambiguity and potential disqualification'
    });
  }

  // Check for confirmation of conditions
  if (!content.match(/(condition|clause|provision|requirement|obligation)/)) {
    suggestions.push({
      observation: 'Key conditions or obligations not referenced',
      suggestedImprovement: 'Acknowledge critical conditions like delivery timelines, warranties, and performance guarantees',
      reason: 'Demonstrating understanding of obligations builds evaluator confidence'
    });
  }

  // Check for dispute resolution/penalties/timelines
  if (!content.match(/(dispute|penalty|liquidated damage|timeline|deadline|duration|warranty|guarantee)/)) {
    suggestions.push({
      observation: 'Risk-related terms (penalties, disputes, warranties) not addressed',
      suggestedImprovement: 'Confirm understanding of penalty clauses, dispute resolution mechanisms, and warranty periods',
      reason: 'Acknowledging risk provisions shows preparedness and professionalism'
    });
  }

  // Content length check
  if (contentLength < 80) {
    suggestions.push({
      observation: 'Terms acceptance too brief',
      suggestedImprovement: 'Provide detailed confirmation of each major term or condition group',
      reason: 'Thorough acknowledgment reduces post-award conflicts'
    });
  }

  return suggestions;
}

/**
 * Generic guidance for unknown section types
 */
function getGenericGuidance(contentLength) {
  if (contentLength < 50) {
    return {
      observation: 'Content is very brief',
      suggestedImprovement: 'Expand with specific details, examples, and supporting documentation references',
      reason: 'Comprehensive responses demonstrate preparation and seriousness'
    };
  }
  
  return {
    observation: 'Review for completeness and clarity',
    suggestedImprovement: 'Ensure all tender requirements are addressed with factual, evidence-based content',
    reason: 'Complete and clear proposals reduce evaluation friction and improve success rates'
  };
}

