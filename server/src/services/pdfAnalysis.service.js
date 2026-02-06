/**
 * PDF Analysis Service
 * Comprehensive AI-powered analysis of uploaded tender PDFs
 * Provides: Summary, Proposal Draft, and Evaluation
 *
 * TWO-STAGE AI PIPELINE:
 * - STAGE 1 (Groq): RAG-based fact extraction → Strict JSON output (internal)
 * - STAGE 2 (Gemini): Format JSON → Clean, UI-ready text
 *
 * UPDATED: Section-wise RAG with token limits and context compression
 * UPDATED: Section normalization for bidder-friendly UI
 */
import { env } from '../config/env.js';
import { PDFParserService } from './pdfParser.service.js';
import { ChunkingService } from './chunking.service.js';
import { LLMCaller } from '../utils/llmCaller.js';
import { RAGOrchestrator } from '../utils/ragOrchestrator.js';
import { TokenCounter } from '../utils/tokenCounter.js';
import { SectionNormalizationService } from './sectionNormalization.service.js';
import AIPostProcessor from './ai/postProcessor.js';

const GROQ_MODEL = env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Call LLM with provider-agnostic wrapper (DEPRECATED - use LLMCaller)
 */
async function callGroq(systemPrompt, userPrompt, options = {}) {
  // Delegate to new LLMCaller
  return LLMCaller.call({
    systemPrompt,
    userPrompt,
    provider: 'groq',
    model: options.model || GROQ_MODEL,
    temperature: options.temperature || 0.3,
    maxTokens: options.maxTokens || 4000,
  });
}

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJSON(response) {
  try {
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
    console.error('Failed to parse JSON:', err.message);
    return null;
  }
}

export const PDFAnalysisService = {
  /**
   * Analyze uploaded PDF and generate comprehensive analysis
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Complete analysis with summary, proposal draft, evaluation
   */
  async analyzeUploadedPDF(pdfBuffer, filename) {
    // Step 1: Parse PDF
    const parsed = await PDFParserService.parsePDF(pdfBuffer, filename);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error,
        stage: 'parsing',
      };
    }

    const sessionId = `session-${Date.now()}`;

    // Step 2: Normalize sections into bidder-friendly high-level sections
    let normalizedSections;
    try {
      console.log('[PDF Analysis] Starting section normalization...');
      normalizedSections = await SectionNormalizationService.normalizeSections(
        parsed.sections,
        sessionId
      );
      console.log(`[PDF Analysis] normalizedSections result: ${normalizedSections?.length || 0} sections`);
      console.log('[PDF Analysis] normalizedSections sample:', JSON.stringify(normalizedSections?.[0] || 'empty', null, 2));
    } catch (err) {
      console.error('Section normalization failed:', err.message);
      normalizedSections = this._getFallbackNormalizedSections(parsed.sections);
      console.log(`[PDF Analysis] Using fallback normalizedSections: ${normalizedSections?.length || 0} sections`);
    }

    // Step 3: Generate Summary
    let summary;
    try {
      summary = await this.generateSummary(parsed);
    } catch (err) {
      console.error('Summary generation failed:', err.message);
      summary = this._generateFallbackSummary(parsed);
    }

    // Step 4: Generate Proposal Draft
    let proposalDraft;
    try {
      proposalDraft = await this.generateProposalDraft(parsed, summary);
    } catch (err) {
      console.error('Proposal draft failed:', err.message);
      proposalDraft = this._generateFallbackProposalDraft(parsed);
    }

    console.log('[PDF Analysis] Building final response object...');
    console.log(`[PDF Analysis] Final normalizedSections count: ${normalizedSections?.length || 0}`);

    const response = {
      success: true,
      analysisId: sessionId,
      analyzedAt: new Date().toISOString(),

      // Original parsed data (for backend use only)
      parsed: {
        filename: parsed.filename,
        title: parsed.title,
        metadata: parsed.metadata,
        stats: parsed.stats,
        sections: parsed.sections,
        pdfInfo: parsed.pdfInfo,
      },

      // Normalized sections for UI (bidder-friendly)
      normalizedSections,

      // AI-generated summary
      summary,

      // AI-generated proposal draft
      proposalDraft,
    };

    console.log('[PDF Analysis] Response keys:', Object.keys(response));
    console.log('[PDF Analysis] Response has normalizedSections:', !!response.normalizedSections);

    return response;
  },

  /**
   * Generate comprehensive summary with bullet points
   *
   * TWO-STAGE PIPELINE:
   * Stage 1: Groq extracts facts into strict JSON (internal)
   * Stage 2: Gemini formats JSON into UI-ready text
   */
  async generateSummary(parsed) {
    // ============================================
    // STAGE 1: GROQ RAG FACT EXTRACTION
    // Output: Strict JSON only (internal use)
    // ============================================
    const groqSystemPrompt = `You are a comprehensive fact extraction engine for government tender documents.

  YOUR TASK: Extract detailed factual information from the provided tender content and output STRICT JSON.

  CRITICAL RULES:
  - Output ONLY valid JSON - no prose, no explanations, no formatting
  - Extract comprehensive, detailed facts present in the provided content
  - Use EXACT values from the document (amounts, dates, percentages)
  - For executive summary: Create a comprehensive 5-7 paragraph summary covering all key aspects
  - For each category: Extract ALL relevant points, not just 2-3 items
  - If information is NOT in the document, use null or empty array
  - Do NOT infer, assume, or hallucinate any information
  - Be thorough and comprehensive in extraction`;

    // Prepare content with token limit in mind
    const contentForAnalysis = this._prepareContentForAnalysis(parsed);

    // Check token budget
    const budget = TokenCounter.getBudget(GROQ_MODEL, 4000);
    console.log(`[PDF Summary] Stage 1 (Groq) - Token budget: ${budget.prompt}`);

    const groqUserPrompt = `EXTRACT COMPREHENSIVE FACTS FROM THIS TENDER DOCUMENT:

TENDER METADATA:
- Title: ${parsed.title || null}
- Authority: ${parsed.metadata?.authority || null}
- Sector: ${parsed.metadata?.sector || null}
- Estimated Value: ${parsed.metadata?.estimatedValue || null}
- EMD Amount: ${parsed.metadata?.emdAmount || null}
- Deadline: ${parsed.metadata?.deadline || null}
- Reference Number: ${parsed.metadata?.referenceNumber || null}

TENDER CONTENT:
${contentForAnalysis}

OUTPUT STRICT JSON (no other text):
{
  "executiveSummary": "A comprehensive 5-7 paragraph summary that covers: (1) Project overview and objectives, (2) Scope of work and deliverables, (3) Key technical requirements, (4) Financial terms and conditions, (5) Eligibility criteria, (6) Timeline and milestones, (7) Critical submission requirements. Make it detailed and informative for proposal drafting.",
  "criticalRequirements": ["Extract ALL critical requirements with complete details", "Include specific technical specs", "Add compliance mandates", "List quality standards"],
  "eligibilityCriteria": ["Extract ALL eligibility criteria with exact details", "Include experience requirements", "Financial turnover requirements", "Technical capability requirements", "Past performance requirements"],
  "technicalSpecifications": ["Extract ALL technical specifications in detail", "Include performance standards", "Quality requirements", "Testing criteria", "Compliance standards"],
  "financialTerms": ["Complete EMD details with amounts and format", "Payment milestone breakdown", "Retention money details", "Bank guarantee requirements", "Price variation clauses", "Tax implications"],
  "complianceRequirements": ["All statutory compliance requirements", "Certifications needed", "Registration requirements", "Standards to follow", "Documentation mandates"],
  "deadlinesAndTimelines": ["Submission deadline with date and time", "Pre-bid meeting details", "Query submission deadline", "Project execution timeline", "Milestone deadlines", "Penalty clauses for delays"],
  "documentsRequired": ["Complete list of ALL documents needed", "Formats and specifications", "Attestation requirements", "Number of copies", "Submission format"],
  "riskFactors": ["Identify all potential risks", "Penalty clauses", "Liquidated damages", "Performance bonds", "Warranty requirements", "Arbitration clauses"],
  "opportunityScore": 70,
  "opportunityAssessment": "Detailed assessment of this opportunity: viability, competition level, complexity, profit potential, and strategic fit. Be comprehensive (3-4 paragraphs).",
  "actionItems": ["List ALL recommended actions for proposal preparation", "Documentation to prepare", "Calculations needed", "Approvals to obtain", "Partner/subcontractor coordination"]
}`;

    const groqResponse = await callGroq(groqSystemPrompt, groqUserPrompt, {
      temperature: 0.1, // Low temperature for comprehensive extraction
      maxTokens: 4000, // Increased for detailed output
    });

    const groqJson = parseJSON(groqResponse);

    if (!groqJson) {
      console.error('[PDF Summary] Stage 1 failed - Groq JSON parse error');
      throw new Error('Failed to extract facts from tender (Stage 1)');
    }

    console.log('[PDF Summary] Stage 1 complete - Groq JSON extracted');

    // ============================================
    // STAGE 2: GEMINI FORMATTING
    // Input: Groq JSON
    // Output: UI-ready formatted text
    // ============================================
    console.log('[PDF Summary] Stage 2 (Gemini) - Formatting for UI');

    const formattingResult = await AIPostProcessor.formatAnalysisWithGemini(groqJson);

    if (!formattingResult.success) {
      console.warn('[PDF Summary] Stage 2 warning - Using fallback formatting');
    }

    const formatted = formattingResult.formatted;

    // Build final summary object for UI consumption
    return {
      isAI: true,
      // Use Gemini-formatted executive summary
      executiveSummary: formatted.executiveSummary || groqJson.executiveSummary || '',

      // Use Gemini-formatted bullet points
      bulletPoints: {
        criticalRequirements: formatted.criticalRequirements || groqJson.criticalRequirements || [],
        eligibilityCriteria: formatted.eligibilityCriteria || groqJson.eligibilityCriteria || [],
        technicalSpecifications: formatted.technicalSpecifications || groqJson.technicalSpecifications || [],
        financialTerms: this._extractFinancialTermsArray(formatted.financialDetails, groqJson.financialTerms),
        complianceRequirements: groqJson.complianceRequirements || [],
        deadlinesAndTimelines: formatted.deadlinesTimeline || groqJson.deadlinesAndTimelines || [],
        documentsRequired: groqJson.documentsRequired || [],
        riskFactors: this._extractRiskFactorsArray(formatted.riskFactors, groqJson.riskFactors),
      },

      // Opportunity metrics
      opportunityScore: formatted.opportunityScore || groqJson.opportunityScore || 70,
      opportunityAssessment: formatted.opportunityAssessment || groqJson.opportunityAssessment || '',

      // Action items
      actionItems: formatted.recommendedActions || groqJson.actionItems || [],

      // Section summaries (from parsed data)
      sectionSummaries: this._generateSectionSummaries(parsed.sections),

      // Metadata for debugging/audit
      _pipelineMetadata: {
        stage1: 'groq-rag-extraction',
        stage2: formattingResult.metadata?.formattedBy || 'fallback',
        validationPassed: formattingResult.metadata?.validationPassed ?? true,
        timestamp: new Date().toISOString(),
      },
    };
  },

  /**
   * Helper: Extract financial terms as array from formatted object
   */
  _extractFinancialTermsArray(financialDetails, fallbackArray) {
    if (!financialDetails) return fallbackArray || [];

    const terms = [];
    if (financialDetails.emd && !financialDetails.emd.includes('Not specified')) {
      terms.push(`EMD: ${financialDetails.emd}`);
    }
    if (financialDetails.estimatedValue && !financialDetails.estimatedValue.includes('Not specified')) {
      terms.push(`Estimated Value: ${financialDetails.estimatedValue}`);
    }
    if (financialDetails.paymentTerms && !financialDetails.paymentTerms.includes('Not specified')) {
      terms.push(`Payment Terms: ${financialDetails.paymentTerms}`);
    }
    if (financialDetails.otherCharges && !financialDetails.otherCharges.includes('Not specified')) {
      terms.push(financialDetails.otherCharges);
    }

    return terms.length > 0 ? terms : (fallbackArray || []);
  },

  /**
   * Helper: Extract risk factors as array from formatted object
   */
  _extractRiskFactorsArray(riskFactors, fallbackArray) {
    if (!riskFactors || !Array.isArray(riskFactors)) return fallbackArray || [];

    return riskFactors.map(rf => {
      if (typeof rf === 'string') return rf;
      if (rf.risk && rf.severity) {
        return `[${rf.severity}] ${rf.risk}`;
      }
      return rf.risk || String(rf);
    });
  },

  /**
   * Generate proposal draft sections
   */
  async generateProposalDraft(parsed, summary) {
    const systemPrompt = `You are an expert proposal writer for government tenders. Generate a comprehensive proposal draft based on the tender requirements.

Your task is to:
1. Create draft content for each standard proposal section
2. Include placeholders where bidder-specific information is needed (use [BIDDER_NAME], [COMPANY_INFO], etc.)
3. Make the content professional, compliant, and aligned with government tender expectations
4. Include specific references to tender requirements where appropriate

IMPORTANT:
- Use formal, professional language suitable for government proposals
- Include compliance statements where applicable
- Be specific and detailed
- Mark areas needing bidder input with clear placeholders`;

    const contentForAnalysis = this._prepareContentForAnalysis(parsed);

    const userPrompt = `Generate a proposal draft for this tender:

TENDER TITLE: ${parsed.title}
TENDER SUMMARY: ${summary.executiveSummary}

KEY REQUIREMENTS:
${summary.bulletPoints.criticalRequirements.slice(0, 5).map(r => `- ${r}`).join('\n')}

ELIGIBILITY CRITERIA:
${summary.bulletPoints.eligibilityCriteria.slice(0, 5).map(e => `- ${e}`).join('\n')}

TENDER SECTIONS:
${parsed.sections.map(s => `- ${s.title} (${s.type})`).join('\n')}

Generate a proposal draft with the following sections in JSON format:
{
  "coverLetter": {
    "title": "Cover Letter",
    "content": "Professional cover letter text with [BIDDER_NAME] placeholder",
    "isEditable": true
  },
  "companyProfile": {
    "title": "Company Profile & Experience",
    "content": "Company profile section with placeholders for company details",
    "isEditable": true
  },
  "eligibilityCompliance": {
    "title": "Eligibility Compliance Statement",
    "content": "Statement addressing each eligibility criterion",
    "isEditable": true
  },
  "technicalApproach": {
    "title": "Technical Approach & Methodology",
    "content": "Detailed technical approach addressing tender requirements",
    "isEditable": true
  },
  "projectPlan": {
    "title": "Project Plan & Timeline",
    "content": "Implementation timeline and milestones",
    "isEditable": true
  },
  "teamComposition": {
    "title": "Team Composition & Resources",
    "content": "Key personnel and resource allocation",
    "isEditable": true
  },
  "financialProposal": {
    "title": "Financial Proposal",
    "content": "Pricing structure and payment terms compliance",
    "isEditable": true
  },
  "complianceMatrix": {
    "title": "Compliance Matrix",
    "content": "Point-by-point compliance with tender requirements",
    "isEditable": true
  }
}`;

    const response = await callGroq(systemPrompt, userPrompt, { temperature: 0.4, maxTokens: 4000 });
    const proposalData = parseJSON(response);

    if (!proposalData) {
      throw new Error('Failed to parse proposal draft response');
    }

    // Convert to array format for easier rendering
    const sections = Object.entries(proposalData).map(([key, value], index) => ({
      id: key,
      order: index + 1,
      title: value.title,
      content: value.content,
      isEditable: true,
      wordCount: value.content.split(/\s+/).filter(w => w).length,
    }));

    return {
      isAI: true,
      generatedAt: new Date().toISOString(),
      sections,
      totalSections: sections.length,
      totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0),
      status: 'DRAFT',
    };
  },

  /**
   * Evaluate a proposal against tender requirements
   * @param {Object} proposal - The user's edited proposal
   * @param {Object} tenderAnalysis - Original tender analysis
   * @returns {Promise<Object>} Evaluation results
   */
  async evaluateProposal(proposal, tenderAnalysis) {
    const systemPrompt = `You are a government tender evaluation expert. Evaluate the proposal against tender requirements.

Score each aspect from 0-100 and provide specific feedback:
- Compliance: Does the proposal meet all mandatory requirements?
- Technical: Is the technical approach sound and well-detailed?
- Financial: Is the pricing competitive and clearly structured?
- Presentation: Is the proposal well-organized and professional?
- Completeness: Are all required sections and documents addressed?

Be constructive but honest. Identify specific gaps and provide actionable improvements.`;

    const proposalContent = proposal.sections.map(s => `## ${s.title}\n${s.content}`).join('\n\n');

    const userPrompt = `Evaluate this proposal against the tender requirements:

TENDER: ${tenderAnalysis.parsed.title}

KEY TENDER REQUIREMENTS:
${tenderAnalysis.summary.bulletPoints.criticalRequirements.slice(0, 8).map(r => `- ${r}`).join('\n')}

ELIGIBILITY CRITERIA:
${tenderAnalysis.summary.bulletPoints.eligibilityCriteria.slice(0, 5).map(e => `- ${e}`).join('\n')}

PROPOSAL CONTENT:
${proposalContent.substring(0, 6000)}

Provide evaluation in this JSON format:
{
  "overallScore": 75,
  "overallAssessment": "Summary assessment of the proposal",
  "scores": {
    "compliance": {"score": 80, "feedback": "Specific feedback on compliance"},
    "technical": {"score": 75, "feedback": "Specific feedback on technical content"},
    "financial": {"score": 70, "feedback": "Specific feedback on financial proposal"},
    "presentation": {"score": 85, "feedback": "Specific feedback on presentation quality"},
    "completeness": {"score": 75, "feedback": "Specific feedback on completeness"}
  },
  "strengths": ["strength 1", "strength 2", "..."],
  "weaknesses": ["weakness 1", "weakness 2", "..."],
  "missingElements": ["missing 1", "missing 2", "..."],
  "improvements": [
    {"section": "Section Name", "suggestion": "Specific improvement suggestion"},
    {"section": "Section Name", "suggestion": "Specific improvement suggestion"}
  ],
  "winProbability": "Medium",
  "winProbabilityReason": "Explanation of win probability assessment",
  "recommendedActions": ["action 1", "action 2", "..."]
}`;

    const response = await callGroq(systemPrompt, userPrompt, { temperature: 0.2, maxTokens: 3000 });
    const evaluation = parseJSON(response);

    if (!evaluation) {
      return this._generateFallbackEvaluation(proposal);
    }

    return {
      isAI: true,
      evaluatedAt: new Date().toISOString(),
      ...evaluation,
    };
  },

  /**
   * Prepare content for AI analysis (truncate if needed)
   */
  _prepareContentForAnalysis(parsed) {
    let content = '';

    // Add sections with priority to important ones
    const prioritySections = parsed.sections.filter(s =>
      ['ELIGIBILITY', 'TECHNICAL', 'FINANCIAL', 'EVALUATION'].includes(s.type)
    );
    const otherSections = parsed.sections.filter(s =>
      !['ELIGIBILITY', 'TECHNICAL', 'FINANCIAL', 'EVALUATION'].includes(s.type)
    );

    // Add priority sections first
    for (const section of prioritySections) {
      content += `\n--- ${section.title} (${section.type}) ---\n`;
      content += section.content.substring(0, 2000) + '\n';
    }

    // Add other sections with remaining space
    for (const section of otherSections) {
      if (content.length > 10000) break;
      content += `\n--- ${section.title} ---\n`;
      content += section.content.substring(0, 1000) + '\n';
    }

    return content.substring(0, 12000);
  },

  /**
   * Generate section-wise summaries
   */
  _generateSectionSummaries(sections) {
    return sections.map(section => ({
      id: section.id,
      title: section.title,
      type: section.type,
      wordCount: section.wordCount,
      isMandatory: section.isMandatory,
      summary: section.content.substring(0, 200) + (section.content.length > 200 ? '...' : ''),
    }));
  },

  /**
   * Fallback summary when AI fails
   */
  _generateFallbackSummary(parsed) {
    return {
      isAI: false,
      executiveSummary: `This tender document titled "${parsed.title}" contains ${parsed.sections.length} sections with approximately ${parsed.stats.totalWords} words. Review all sections carefully to understand the complete requirements.`,
      bulletPoints: {
        criticalRequirements: ['Review all tender sections', 'Meet eligibility criteria', 'Submit before deadline'],
        eligibilityCriteria: parsed.sections.filter(s => s.type === 'ELIGIBILITY').map(s => `Review: ${s.title}`),
        technicalSpecifications: parsed.sections.filter(s => s.type === 'TECHNICAL').map(s => `Review: ${s.title}`),
        financialTerms: parsed.metadata.emdAmount ? [`EMD: ₹${parsed.metadata.emdAmount.toLocaleString()}`] : ['Review financial requirements'],
        complianceRequirements: ['Follow all tender guidelines', 'Submit required documents'],
        deadlinesAndTimelines: parsed.metadata.deadline ? [`Deadline: ${parsed.metadata.deadline}`] : ['Check submission deadline'],
        documentsRequired: ['Technical documents', 'Financial documents', 'Compliance certificates'],
        riskFactors: ['Verify all requirements before submission'],
      },
      opportunityScore: 60,
      opportunityAssessment: 'Manual review recommended',
      actionItems: ['Review all sections', 'Prepare required documents', 'Calculate EMD', 'Verify eligibility'],
      sectionSummaries: this._generateSectionSummaries(parsed.sections),
    };
  },

  /**
   * Fallback proposal draft when AI fails
   */
  _generateFallbackProposalDraft(parsed) {
    const sections = [
      {
        id: 'coverLetter',
        order: 1,
        title: 'Cover Letter',
        content: `[Date]\n\nTo,\nThe [Authority Name]\n[Address]\n\nSubject: Submission of Proposal for ${parsed.title}\n\nRef: ${parsed.metadata?.referenceNumber || '[Tender Reference Number]'}\n\nDear Sir/Madam,\n\nWe, [BIDDER_NAME], are pleased to submit our proposal for the above-referenced tender. We have carefully reviewed all tender documents and confirm our understanding of the requirements.\n\nWe hereby confirm that:\n1. We meet all the eligibility criteria specified in the tender\n2. We have read and understood all terms and conditions\n3. We commit to delivering as per the specifications mentioned\n\nPlease find enclosed all required documents as per the tender requirements.\n\nYours faithfully,\n\n[Authorized Signatory]\n[BIDDER_NAME]\n[Contact Details]`,
        isEditable: true,
        wordCount: 120,
      },
      {
        id: 'companyProfile',
        order: 2,
        title: 'Company Profile & Experience',
        content: `# Company Profile\n\n## About [BIDDER_NAME]\n[Provide company overview, history, and core competencies]\n\n## Relevant Experience\n[List similar projects completed with values and timelines]\n\n## Certifications & Registrations\n- [Certification 1]\n- [Certification 2]\n- [Registration details]\n\n## Financial Capacity\n[Brief financial capability statement]`,
        isEditable: true,
        wordCount: 60,
      },
      {
        id: 'eligibilityCompliance',
        order: 3,
        title: 'Eligibility Compliance Statement',
        content: `# Eligibility Compliance\n\nWe hereby declare that [BIDDER_NAME] meets all eligibility criteria as specified in the tender:\n\n| Criteria | Requirement | Our Status | Supporting Document |\n|----------|-------------|------------|---------------------|\n| [Criteria 1] | [Requirement] | Compliant | [Document Reference] |\n| [Criteria 2] | [Requirement] | Compliant | [Document Reference] |\n\n[Add rows for each eligibility criterion]`,
        isEditable: true,
        wordCount: 50,
      },
      {
        id: 'technicalApproach',
        order: 4,
        title: 'Technical Approach & Methodology',
        content: `# Technical Approach\n\n## Understanding of Requirements\n[Demonstrate understanding of the tender scope and objectives]\n\n## Proposed Methodology\n[Detailed approach to execute the project]\n\n## Quality Assurance\n[Quality control measures and standards]\n\n## Risk Management\n[Identified risks and mitigation strategies]`,
        isEditable: true,
        wordCount: 50,
      },
      {
        id: 'projectPlan',
        order: 5,
        title: 'Project Plan & Timeline',
        content: `# Project Implementation Plan\n\n## Project Phases\n\n| Phase | Activities | Duration | Deliverables |\n|-------|------------|----------|-------------|\n| Phase 1 | [Activities] | [Duration] | [Deliverables] |\n| Phase 2 | [Activities] | [Duration] | [Deliverables] |\n\n## Milestones\n[Key milestones with dates]\n\n## Resource Allocation\n[Resource deployment plan]`,
        isEditable: true,
        wordCount: 50,
      },
      {
        id: 'financialProposal',
        order: 6,
        title: 'Financial Proposal',
        content: `# Financial Proposal\n\n## Pricing Summary\n[Total bid amount and breakdown]\n\n## Payment Terms\n[Accepted payment terms as per tender]\n\n## EMD Details\n- EMD Amount: [Amount]\n- Mode: [Bank Guarantee/DD]\n- Validity: [Period]\n\n## Price Validity\n[Price validity period]`,
        isEditable: true,
        wordCount: 50,
      },
    ];

    return {
      isAI: false,
      generatedAt: new Date().toISOString(),
      sections,
      totalSections: sections.length,
      totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0),
      status: 'DRAFT',
    };
  },

  /**
   * Fallback evaluation when AI fails
   */
  _generateFallbackEvaluation(proposal) {
    const totalWords = proposal.sections.reduce((sum, s) => sum + (s.wordCount || 0), 0);
    const sectionCount = proposal.sections.length;

    return {
      isAI: false,
      evaluatedAt: new Date().toISOString(),
      overallScore: 60,
      overallAssessment: 'Manual evaluation recommended. Please review your proposal against tender requirements.',
      scores: {
        compliance: { score: 60, feedback: 'Verify compliance with all tender requirements' },
        technical: { score: 60, feedback: 'Ensure technical approach addresses all specifications' },
        financial: { score: 60, feedback: 'Verify pricing is competitive and complete' },
        presentation: { score: 70, feedback: 'Proposal structure appears reasonable' },
        completeness: { score: sectionCount >= 5 ? 70 : 50, feedback: `Proposal has ${sectionCount} sections` },
      },
      strengths: ['Proposal structure created', `Contains ${sectionCount} sections`],
      weaknesses: ['AI evaluation unavailable', 'Manual review recommended'],
      missingElements: ['Verify all required documents are included'],
      improvements: [
        { section: 'All Sections', suggestion: 'Review each section against tender requirements' },
      ],
      winProbability: 'Unknown',
      winProbabilityReason: 'Manual evaluation required for accurate assessment',
      recommendedActions: ['Review tender requirements', 'Complete all placeholders', 'Verify document checklist'],
    };
  },

  /**
   * Fallback normalized sections when AI normalization fails
   */
  _getFallbackNormalizedSections(rawSections) {
    const sectionMap = {
      overview: { name: 'Tender Overview', sections: [] },
      scope: { name: 'Scope of Work', sections: [] },
      eligibility: { name: 'Eligibility Criteria', sections: [] },
      commercial: { name: 'Commercial Terms', sections: [] },
      evaluation: { name: 'Evaluation Criteria', sections: [] },
      timeline: { name: 'Timeline & Milestones', sections: [] },
      penalties: { name: 'Penalties & Liquidated Damages', sections: [] },
      legal: { name: 'Legal & Contractual Terms', sections: [] },
      annexures: { name: 'Forms & Annexures', sections: [] },
    };

    // Basic categorization by keywords
    rawSections.forEach((section) => {
      const heading = section.heading.toLowerCase();
      if (heading.includes('scope') || heading.includes('work')) {
        sectionMap.scope.sections.push(section);
      } else if (heading.includes('eligib') || heading.includes('qualif')) {
        sectionMap.eligibility.sections.push(section);
      } else if (heading.includes('commercial') || heading.includes('payment') || heading.includes('price')) {
        sectionMap.commercial.sections.push(section);
      } else if (heading.includes('evaluation') || heading.includes('criteria')) {
        sectionMap.evaluation.sections.push(section);
      } else if (heading.includes('timeline') || heading.includes('schedule') || heading.includes('deadline')) {
        sectionMap.timeline.sections.push(section);
      } else if (heading.includes('penalty') || heading.includes('liquidated') || heading.includes('damages')) {
        sectionMap.penalties.sections.push(section);
      } else if (heading.includes('legal') || heading.includes('contract') || heading.includes('terms')) {
        sectionMap.legal.sections.push(section);
      } else if (heading.includes('form') || heading.includes('annex') || heading.includes('format')) {
        sectionMap.annexures.sections.push(section);
      } else {
        sectionMap.overview.sections.push(section);
      }
    });

    return Object.entries(sectionMap)
      .filter(([_, data]) => data.sections.length > 0)
      .map(([category, data]) => ({
        category,
        name: data.name,
        aiSummary: `This section contains information about ${data.name.toLowerCase()}. Please review the detailed content for complete information.`,
        keyPoints: data.sections.slice(0, 3).map(s => s.heading),
        importantNumbers: [],
        rawSectionCount: data.sections.length,
      }));
  },
};

export default PDFAnalysisService;
