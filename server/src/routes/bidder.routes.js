import { Router } from 'express';
import { TenderService } from '../services/tender.service.js';
import { ProposalService } from '../services/proposal.service.js';
import { ProposalExportService } from '../services/proposal-export.service.js';
import { ProposalPublishService } from '../services/proposal-publish.service.js';
import { AIService } from '../services/ai.service.js';
import { TenderSummarizerService } from '../services/tenderSummarizer.service.js';
import { ProposalDrafterService } from '../services/proposalDrafter.service.js';
import { UploadedTenderService } from '../services/uploadedTender.service.js';
import { SavedTenderService } from '../services/savedTender.service.js';
import { UploadedProposalDraftService } from '../services/uploadedProposalDraft.service.js';
import { RiskAssessmentService } from '../services/riskAssessment.service.js';
import { ComplianceCheckService } from '../services/complianceCheck.service.js';
import { AuditLogService } from '../services/auditLog.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { aiRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { pool } from '../config/db.js';

const router = Router();

// ==========================================
// BIDDER TENDER ENDPOINTS
// ==========================================

/**
 * GET /api/bidder/tenders
 * List published tenders for bidder with real statistics
 * Now includes uploaded tenders mixed with platform tenders
 */
router.get('/tenders', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { search = '', sector = '' } = req.query;

    // Get platform tenders
    const tenders = await TenderService.listTenders(req.user, { status: 'PUBLISHED' });

    // Get proposal counts for all tenders in one query
    const tenderIds = tenders.map(t => t.tender_id);
    let proposalCounts = {};

    if (tenderIds.length > 0) {
      const countsResult = await pool.query(
        `SELECT tender_id, COUNT(*) as count
         FROM proposal
         WHERE tender_id = ANY($1)
         GROUP BY tender_id`,
        [tenderIds]
      );
      countsResult.rows.forEach(row => {
        proposalCounts[row.tender_id] = parseInt(row.count) || 0;
      });
    }

    // Transform platform tenders with real statistics
    const transformedTenders = tenders.map(t => {
      const daysRemaining = t.submission_deadline
        ? Math.max(0, Math.ceil((new Date(t.submission_deadline) - new Date()) / (1000 * 60 * 60 * 24)))
        : 30;

      return {
        _id: t.tender_id,
        title: t.title,
        description: t.description,
        status: t.status,
        deadline: t.submission_deadline,
        daysRemaining,
        value: t.estimated_value,
        estimatedValue: t.estimated_value,
        currency: 'INR',
        category: t.sector,
        organizationId: {
          organizationName: t.organization_name,
          industryDomain: t.sector || 'General'
        },
        createdAt: t.created_at,
        proposalCount: proposalCounts[t.tender_id] || 0,
        // Mark as platform tender
        isUploaded: false,
        source: 'PLATFORM'
      };
    });

    // Get uploaded tenders and merge with platform tenders
    let uploadedTenders = [];
    try {
      uploadedTenders = await UploadedTenderService.listForDiscovery({
        search,
        sector,
        limit: 100
      });
    } catch (uploadErr) {
      console.error('[Bidder Tenders] Failed to fetch uploaded tenders:', uploadErr.message);
      // Continue without uploaded tenders if query fails
    }

    // Merge platform and uploaded tenders
    const allTenders = [...transformedTenders, ...uploadedTenders];

    // Sort by creation date (newest first)
    allTenders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate aggregate statistics including uploaded tenders
    const platformValue = tenders.reduce((sum, t) => sum + (parseFloat(t.estimated_value) || 0), 0);
    const uploadedValue = uploadedTenders.reduce((sum, t) => sum + (t.estimatedValue || 0), 0);
    const totalValue = platformValue + uploadedValue;

    const avgCompetition = transformedTenders.length > 0
      ? Math.round(transformedTenders.reduce((sum, t) => sum + t.proposalCount, 0) / transformedTenders.length)
      : 0;

    const closingSoon = allTenders.filter(t => t.daysRemaining <= 14).length;

    res.json({
      tenders: allTenders,
      statistics: {
        totalTenders: allTenders.length,
        platformTenders: transformedTenders.length,
        uploadedTenders: uploadedTenders.length,
        totalValue,
        avgCompetition,
        closingSoon
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bidder/tenders/:id
 * Get tender details with sections (read-only for bidder)
 * Includes real statistics: proposal count, section complexity, word counts
 */
router.get('/tenders/:id', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenderData = await TenderService.getTenderById(id, req.user);

    // Ensure tender is published
    if (tenderData.status !== 'PUBLISHED') {
      return res.status(403).json({ error: 'This tender is not available' });
    }

    // Get real proposal count for this tender
    const proposalCountQuery = await pool.query(
      `SELECT COUNT(*) as count FROM proposal WHERE tender_id = $1`,
      [id]
    );
    const proposalCount = parseInt(proposalCountQuery.rows[0].count) || 0;

    // Calculate tender statistics
    const totalContent = (tenderData.description || '') +
      (tenderData.sections || []).map(s => s.content || s.description || '').join(' ');
    const wordCount = totalContent.trim().split(/\s+/).filter(w => w.length > 0).length;
    const sectionCount = (tenderData.sections || []).length;

    // Calculate complexity for each section based on content analysis
    const calculateComplexity = (content) => {
      if (!content) return { level: 'Low', score: 1 };
      const text = content.toLowerCase();
      const words = text.split(/\s+/).length;

      // Complexity factors
      let score = 0;

      // Word count factor
      if (words > 500) score += 3;
      else if (words > 200) score += 2;
      else if (words > 100) score += 1;

      // Technical terms
      const technicalTerms = ['compliance', 'specification', 'requirement', 'mandatory', 'certification',
        'iso', 'standard', 'audit', 'verification', 'validation', 'qualification', 'technical'];
      const techCount = technicalTerms.filter(term => text.includes(term)).length;
      score += Math.min(techCount, 3);

      // Legal/financial terms
      const legalTerms = ['penalty', 'liquidated', 'indemnity', 'liability', 'warranty', 'guarantee',
        'arbitration', 'jurisdiction', 'force majeure', 'termination'];
      const legalCount = legalTerms.filter(term => text.includes(term)).length;
      score += Math.min(legalCount, 2);

      // Numeric requirements (specific numbers usually indicate complexity)
      const numericMatches = text.match(/\d+(\.\d+)?%|\₹\s*\d+|rs\.?\s*\d+|\d+\s*(years?|days?|months?)/gi);
      if (numericMatches && numericMatches.length > 3) score += 2;
      else if (numericMatches && numericMatches.length > 1) score += 1;

      // Determine level
      if (score >= 7) return { level: 'Very High', score };
      if (score >= 5) return { level: 'High', score };
      if (score >= 3) return { level: 'Medium', score };
      return { level: 'Low', score };
    };

    // Transform to expected format with real statistics
    const tender = {
      _id: tenderData.tender_id,
      title: tenderData.title,
      description: tenderData.description,
      status: tenderData.status,
      deadline: tenderData.submission_deadline,
      value: tenderData.estimated_value,
      currency: 'INR',
      category: tenderData.sector,
      organizationId: {
        organizationName: tenderData.organization_name,
        industryDomain: tenderData.sector || 'General'
      },
      createdAt: tenderData.created_at,
      // Real statistics
      statistics: {
        proposalCount,
        wordCount,
        sectionCount,
        estimatedReadTime: Math.ceil(wordCount / 200), // ~200 words per minute
        mandatorySections: (tenderData.sections || []).filter(s => s.is_mandatory).length
      }
    };

    // Transform sections with calculated complexity
    const sections = (tenderData.sections || []).map((s, index) => {
      const content = s.content || s.description || '';
      const complexity = calculateComplexity(content);
      const sectionWords = content.trim().split(/\s+/).filter(w => w.length > 0).length;

      return {
        _id: s.section_id,
        sectionOrder: s.order_index || (index + 1),
        title: s.title,
        sectionTitle: s.title,
        content: content,
        description: s.description || s.content || '',
        keyPoints: [],
        complexity: complexity.level,
        complexityScore: complexity.score,
        wordCount: sectionWords,
        isMandatory: s.is_mandatory || false,
        tenderId: id
      };
    });

    // Check if bidder already has a proposal for this tender
    const existingProposalQuery = await pool.query(
      `SELECT proposal_id FROM proposal WHERE tender_id = $1 AND organization_id = $2 LIMIT 1`,
      [id, req.user.organizationId]
    );

    const existingProposal = existingProposalQuery.rows.length > 0
      ? { proposalId: existingProposalQuery.rows[0].proposal_id }
      : null;

    res.json({
      data: {
        tender,
        sections,
        existingProposal
      }
    });
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/bidder/tenders/:id/analyze
 * AI analysis of tender (advisory only)
 * Body: { question?: string }
 */
router.post('/tenders/:id/analyze', requireAuth, requireRole('BIDDER'), aiRateLimiter, async (req, res, next) => {
  try {
    const { id: tenderId } = req.params;
    const { question } = req.body;

    // Verify tender exists and is published
    const tender = await TenderService.getTenderById(tenderId, req.user);
    if (tender.status !== 'PUBLISHED') {
      return res.status(403).json({ error: 'This tender is not available' });
    }

    // Use AI to analyze tender
    const analysis = await AIService.queryTenderAI(
      tenderId,
      question || 'Analyze this tender for risks, eligibility requirements, and key considerations.'
    );

    res.json({
      tenderId,
      analysis,
      advisory: true,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message?.includes('rate limit')) {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }
    next(err);
  }
});

/**
 * GET /api/bidder/tenders/:id/summary
 * AI-powered Tender Summarizer - comprehensive analysis for bidders
 * Returns: executive summary, key requirements, risks, opportunity score
 */
router.get('/tenders/:id/summary', requireAuth, requireRole('BIDDER'), aiRateLimiter, async (req, res, next) => {
  try {
    const { id: tenderId } = req.params;

    // Fetch tender with sections
    const tenderData = await TenderService.getTenderById(tenderId, req.user);
    if (tenderData.status !== 'PUBLISHED') {
      return res.status(403).json({ error: 'This tender is not available' });
    }

    // Get proposal count
    const proposalCountQuery = await pool.query(
      `SELECT COUNT(*) as count FROM proposal WHERE tender_id = $1`,
      [tenderId]
    );
    const proposalCount = parseInt(proposalCountQuery.rows[0].count) || 0;

    // Calculate tender metrics
    const sections = tenderData.sections || [];
    const allContent = (tenderData.description || '') + ' ' +
      sections.map(s => (s.content || s.description || '')).join(' ');

    const wordCount = allContent.trim().split(/\s+/).filter(w => w.length > 0).length;
    const mandatorySections = sections.filter(s => s.is_mandatory).length;

    // Extract key terms from content
    const extractKeyTerms = (text) => {
      const terms = {
        eligibility: [],
        technical: [],
        financial: [],
        timeline: [],
        compliance: []
      };

      const textLower = text.toLowerCase();

      // Eligibility keywords
      if (textLower.includes('experience')) terms.eligibility.push('Prior experience required');
      if (textLower.includes('certification') || textLower.includes('iso')) terms.eligibility.push('Certifications needed');
      if (textLower.includes('turnover')) terms.eligibility.push('Financial turnover criteria');
      if (textLower.includes('registration')) terms.eligibility.push('Registration requirements');

      // Technical keywords
      if (textLower.includes('specification')) terms.technical.push('Technical specifications defined');
      if (textLower.includes('quality')) terms.technical.push('Quality standards mentioned');
      if (textLower.includes('methodology')) terms.technical.push('Methodology required');

      // Financial keywords
      if (textLower.includes('emd') || textLower.includes('earnest money')) terms.financial.push('EMD required');
      if (textLower.includes('performance guarantee')) terms.financial.push('Performance guarantee needed');
      if (textLower.includes('payment')) terms.financial.push('Payment terms specified');

      // Timeline keywords
      const deadlineMatch = textLower.match(/(\d+)\s*(days?|weeks?|months?)/);
      if (deadlineMatch) terms.timeline.push(`${deadlineMatch[0]} timeline mentioned`);

      // Compliance keywords
      if (textLower.includes('penalty') || textLower.includes('liquidated damages')) terms.compliance.push('Penalty clauses present');
      if (textLower.includes('warranty')) terms.compliance.push('Warranty requirements');

      return terms;
    };

    const keyTerms = extractKeyTerms(allContent);

    // Calculate opportunity score based on multiple factors
    const calculateOpportunityScore = () => {
      let score = 70; // Base score

      // Competition factor (-5 to +10)
      if (proposalCount === 0) score += 10;
      else if (proposalCount <= 3) score += 5;
      else if (proposalCount >= 10) score -= 5;

      // Deadline factor
      const deadline = tenderData.submission_deadline ? new Date(tenderData.submission_deadline) : null;
      const daysRemaining = deadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : 30;
      if (daysRemaining > 30) score += 5;
      else if (daysRemaining <= 7) score -= 10;

      // Complexity factor
      const avgComplexity = wordCount / Math.max(sections.length, 1);
      if (avgComplexity < 200) score += 5; // Simple tender
      else if (avgComplexity > 500) score -= 5; // Complex tender

      // Value factor
      const value = parseFloat(tenderData.estimated_value) || 0;
      if (value >= 10000000) score += 5; // High value opportunity

      return Math.min(100, Math.max(0, score));
    };

    const opportunityScore = calculateOpportunityScore();

    // Determine urgency level
    const deadline = tenderData.submission_deadline ? new Date(tenderData.submission_deadline) : null;
    const daysRemaining = deadline ? Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))) : null;
    let urgency = 'LOW';
    if (daysRemaining !== null) {
      if (daysRemaining <= 7) urgency = 'CRITICAL';
      else if (daysRemaining <= 14) urgency = 'HIGH';
      else if (daysRemaining <= 30) urgency = 'MEDIUM';
    }

    // Generate executive summary (rule-based for speed, fallback if AI unavailable)
    const generateExecutiveSummary = () => {
      const value = parseFloat(tenderData.estimated_value) || 0;
      const valueStr = value >= 10000000 ? `₹${(value / 10000000).toFixed(1)} Crore` :
                       value >= 100000 ? `₹${(value / 100000).toFixed(1)} Lakh` :
                       value > 0 ? `₹${value.toLocaleString()}` : 'Not specified';

      return `This tender from ${tenderData.organization_name || 'the issuing authority'} is for "${tenderData.title}". ` +
        `The estimated value is ${valueStr} with ${sections.length} sections (${mandatorySections} mandatory). ` +
        `Currently ${proposalCount} bidder(s) have shown interest. ` +
        (daysRemaining !== null ? `Submission deadline is in ${daysRemaining} days.` : '');
    };

    // Build key requirements list
    const keyRequirements = [];
    if (mandatorySections > 0) keyRequirements.push(`Complete all ${mandatorySections} mandatory sections`);
    keyTerms.eligibility.forEach(t => keyRequirements.push(t));
    keyTerms.technical.forEach(t => keyRequirements.push(t));
    keyTerms.financial.forEach(t => keyRequirements.push(t));

    // Build risk factors
    const riskFactors = [];
    if (proposalCount >= 10) riskFactors.push('High competition - 10+ bidders');
    else if (proposalCount >= 5) riskFactors.push('Moderate competition');
    if (daysRemaining !== null && daysRemaining <= 14) riskFactors.push('Tight deadline - less than 2 weeks');
    if (wordCount > 2000) riskFactors.push('Complex tender document - thorough review needed');
    keyTerms.compliance.forEach(t => riskFactors.push(t));

    // Build recommended actions
    const recommendedActions = [];
    if (daysRemaining !== null && daysRemaining <= 7) {
      recommendedActions.push('URGENT: Start proposal immediately');
    }
    if (mandatorySections > 3) {
      recommendedActions.push('Allocate time for all mandatory sections');
    }
    if (keyTerms.eligibility.length > 0) {
      recommendedActions.push('Verify you meet all eligibility criteria first');
    }
    if (keyTerms.financial.length > 0) {
      recommendedActions.push('Prepare financial documents (EMD, bank guarantees)');
    }
    recommendedActions.push('Use AI assistant to understand requirements');

    // Try to get AI-generated insights (non-blocking)
    let aiSummary = null;
    try {
      const aiResponse = await AIService.queryTenderAI(
        tenderId,
        'In 2 sentences, what is this tender about and who should bid for it?'
      );
      if (aiResponse && aiResponse.length > 20) {
        aiSummary = aiResponse;
      }
    } catch (aiErr) {
      console.log('[Tender Summary] AI summary unavailable, using rule-based');
    }

    res.json({
      success: true,
      data: {
        tenderId,
        tenderTitle: tenderData.title,
        organization: tenderData.organization_name,

        // Executive Summary
        executiveSummary: aiSummary || generateExecutiveSummary(),

        // Key Metrics
        metrics: {
          estimatedValue: parseFloat(tenderData.estimated_value) || 0,
          formattedValue: parseFloat(tenderData.estimated_value) >= 10000000
            ? `₹${(parseFloat(tenderData.estimated_value) / 10000000).toFixed(1)}Cr`
            : parseFloat(tenderData.estimated_value) >= 100000
            ? `₹${(parseFloat(tenderData.estimated_value) / 100000).toFixed(1)}L`
            : `₹${(parseFloat(tenderData.estimated_value) || 0).toLocaleString()}`,
          wordCount,
          sectionCount: sections.length,
          mandatorySections,
          proposalCount,
          daysRemaining,
          deadline: tenderData.submission_deadline
        },

        // Scoring
        opportunityScore,
        urgency,
        competitionLevel: proposalCount >= 10 ? 'HIGH' : proposalCount >= 5 ? 'MEDIUM' : 'LOW',

        // Extracted Requirements
        keyRequirements: keyRequirements.slice(0, 8),
        keyTerms,

        // Risk Assessment
        riskFactors: riskFactors.slice(0, 5),

        // Recommendations
        recommendedActions: recommendedActions.slice(0, 5),

        // Metadata
        generatedAt: new Date().toISOString(),
        isAIEnhanced: !!aiSummary
      }
    });
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/bidder/tenders/:id/ai-summary
 * AI-powered comprehensive tender summary with bullet points
 * Returns: executive summary, bullet points by category, section summaries, action items
 */
router.get('/tenders/:id/ai-summary', requireAuth, requireRole('BIDDER'), aiRateLimiter, async (req, res, next) => {
  try {
    const { id: tenderId } = req.params;

    const summary = await TenderSummarizerService.generateComprehensiveSummary(tenderId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message?.includes('must be published')) {
      return res.status(403).json({ error: err.message });
    }
    console.error('[AI Summary] Error:', err.message);
    next(err);
  }
});

/**
 * GET /api/bidder/tenders/:id/quick-summary
 * Quick AI summary for list views (lighter weight)
 */
router.get('/tenders/:id/quick-summary', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id: tenderId } = req.params;

    const summary = await TenderSummarizerService.generateQuickSummary(tenderId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/bidder/tenders/:id/generate-section-draft
 * Generate AI draft for a specific tender section
 * Body: { sectionId, sectionType, tenderRequirement, organizationContext?, customInstructions? }
 */
router.post('/tenders/:id/generate-section-draft', requireAuth, requireRole('BIDDER'), aiRateLimiter, async (req, res, next) => {
  try {
    const { id: tenderId } = req.params;
    const { sectionId, sectionType, tenderRequirement, organizationContext, customInstructions } = req.body;

    if (!sectionType) {
      return res.status(400).json({ error: 'sectionType is required' });
    }

    const draft = await ProposalDrafterService.generateSectionDraft({
      tenderId,
      sectionId,
      sectionType: sectionType.toUpperCase(),
      tenderRequirement,
      organizationContext,
      customInstructions,
    });

    res.json({
      success: true,
      data: draft,
    });
  } catch (err) {
    console.error('[Generate Draft] Error:', err.message);
    next(err);
  }
});

/**
 * POST /api/bidder/tenders/:id/generate-full-draft
 * Generate AI draft for all sections of a tender
 * Body: { organizationContext? }
 */
router.post('/tenders/:id/generate-full-draft', requireAuth, requireRole('BIDDER'), aiRateLimiter, async (req, res, next) => {
  try {
    const { id: tenderId } = req.params;
    const { organizationContext } = req.body;

    const drafts = await ProposalDrafterService.generateFullProposalDraft(tenderId, organizationContext);

    res.json({
      success: true,
      data: drafts,
    });
  } catch (err) {
    console.error('[Generate Full Draft] Error:', err.message);
    next(err);
  }
});

/**
 * POST /api/bidder/proposals/:id/improve-draft
 * Improve existing draft content with AI
 * Body: { existingDraft, sectionType, tenderRequirement, improvementFocus }
 */
router.post('/proposals/:id/improve-draft', requireAuth, requireRole('BIDDER'), aiRateLimiter, async (req, res, next) => {
  try {
    const { existingDraft, sectionType, tenderRequirement, improvementFocus } = req.body;

    if (!existingDraft) {
      return res.status(400).json({ error: 'existingDraft is required' });
    }

    const improved = await ProposalDrafterService.improveDraft({
      existingDraft,
      sectionType: sectionType?.toUpperCase() || 'TECHNICAL',
      tenderRequirement,
      improvementFocus: improvementFocus || 'professional',
    });

    res.json({
      success: true,
      data: improved,
    });
  } catch (err) {
    console.error('[Improve Draft] Error:', err.message);
    next(err);
  }
});

/**
 * POST /api/bidder/proposals/generate-snippet
 * Generate a content snippet for inline assistance
 * Body: { snippetType, context, length }
 */
router.post('/proposals/generate-snippet', requireAuth, requireRole('BIDDER'), aiRateLimiter, async (req, res, next) => {
  try {
    const { snippetType, context, length } = req.body;

    if (!snippetType) {
      return res.status(400).json({ error: 'snippetType is required' });
    }

    const snippet = await ProposalDrafterService.generateSnippet({
      snippetType,
      context,
      length: length || 'medium',
    });

    res.json({
      success: true,
      data: snippet,
    });
  } catch (err) {
    console.error('[Generate Snippet] Error:', err.message);
    next(err);
  }
});

// ==========================================
// BIDDER PROPOSAL ENDPOINTS
// ==========================================

/**
 * POST /api/bidder/proposals
 * Create a new proposal draft for a tender
 * Body: { tenderId }
 */
router.post('/proposals', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { tenderId } = req.body;
    console.log('[POST /api/bidder/proposals] Request body:', req.body);
    console.log('[POST /api/bidder/proposals] User:', req.user.userId, 'OrgId:', req.user.organizationId);
    console.log('[POST /api/bidder/proposals] tenderId:', tenderId);
    
    if (!tenderId) {
      console.log('[POST /api/bidder/proposals] ERROR: tenderId is missing');
      return res.status(400).json({ error: 'tenderId is required', received: req.body });
    }
    
    if (!req.user.userId || !req.user.organizationId) {
      console.log('[POST /api/bidder/proposals] ERROR: user data incomplete');
      return res.status(401).json({ error: 'User authentication incomplete' });
    }

    const proposalData = await ProposalService.createProposalDraft(tenderId, req.user);

    // Log audit action (non-blocking)
    AuditLogService.logProposalCreate(proposalData.proposal_id, req.user.userId, tenderId, req).catch(() => {});

    // Transform to Omkar's expected format
    const proposal = {
      _id: proposalData.proposal_id,
      tenderId: proposalData.tender_id,
      status: proposalData.status,
      createdAt: proposalData.created_at
    };

    console.log('[POST /api/bidder/proposals] SUCCESS: Created proposal', proposal._id);
    res.status(201).json({ data: { proposal } });
  } catch (err) {
    console.log('[POST /api/bidder/proposals] ERROR:', err.message);
    if (err.message === 'Tender not found') return res.status(404).json({ error: err.message });
    if (err.message.includes('non-published')) return res.status(403).json({ error: err.message });
    if (err.message.includes('already exists')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

/**
 * GET /api/bidder/proposals/my-proposals
 * List bidder's own proposals (alias for /proposals)
 */
router.get('/proposals/my-proposals', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const proposalsData = await ProposalService.listForBidder(req.user);
    
    // Transform to Omkar's expected format with tender details
    const proposals = proposalsData.map(p => ({
      _id: p.proposal_id,
      tenderId: p.tender_id,
      tenderTitle: p.tender_title || 'Tender',
      status: p.status,
      completedSections: parseInt(p.completed_sections) || 0,
      totalSections: parseInt(p.total_sections) || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
    
    res.json({ data: { proposals } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bidder/proposals/tender/:tenderId
 * Get proposal by tender ID (creates if doesn't exist)
 */
router.get('/proposals/tender/:tenderId', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { tenderId } = req.params;
    
    // Try to find existing proposal for this tender
    const existingProposalQuery = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.status, p.created_at, p.updated_at,
              t.title as tender_name,
              COUNT(DISTINCT ts.section_id) as total_sections,
              COUNT(DISTINCT CASE WHEN psr.content IS NOT NULL AND LENGTH(TRIM(psr.content)) >= 50 THEN psr.section_id END) as completed_sections
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       LEFT JOIN tender_section ts ON t.tender_id = ts.tender_id
       LEFT JOIN proposal_section_response psr ON p.proposal_id = psr.proposal_id AND ts.section_id = psr.section_id
       WHERE p.tender_id = $1 AND p.organization_id = $2
       GROUP BY p.proposal_id, p.tender_id, p.status, p.created_at, p.updated_at, t.title
       LIMIT 1`,
      [tenderId, req.user.organizationId]
    );
    
    if (existingProposalQuery.rows.length > 0) {
      const p = existingProposalQuery.rows[0];
      
      // Fetch section responses
      const responsesQuery = await pool.query(
        `SELECT psr.section_id, psr.content, ts.title as section_name
         FROM proposal_section_response psr
         JOIN tender_section ts ON psr.section_id = ts.section_id
         WHERE psr.proposal_id = $1
         ORDER BY ts.order_index`,
        [p.proposal_id]
      );
      
      // Quick compliance check (non-blocking)
      let complianceWarnings = null;
      try {
        const quickCompliance = await ComplianceCheckService.quickComplianceCheck(p.proposal_id);
        if (quickCompliance.status !== 'COMPLIANT') {
          complianceWarnings = {
            status: quickCompliance.status,
            mandatoryComplete: quickCompliance.mandatoryComplete,
            mandatoryTotal: quickCompliance.mandatoryTotal,
            completionPercent: quickCompliance.completionPercent,
            daysRemaining: quickCompliance.daysRemaining,
            issues: quickCompliance.issues
          };
        }
      } catch (compErr) {
        console.error('[Bidder] Quick compliance check failed:', compErr.message);
      }

      const proposal = {
        _id: p.proposal_id,
        tenderId: p.tender_id,
        tenderTitle: p.tender_name,
        status: p.status,
        completedSections: parseInt(p.completed_sections) || 0,
        totalSections: parseInt(p.total_sections) || 0,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        complianceWarnings, // Include compliance warnings if any
        sections: responsesQuery.rows.map(r => ({
          sectionId: r.section_id,
          sectionName: r.section_name,
          content: r.content || ''
        }))
      };

      return res.json({ data: { proposal } });
    }
    
    // If no proposal exists, return 404 (frontend will create one)
    return res.status(404).json({ error: 'Proposal not found' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bidder/proposals/:id
 * Get proposal details (bidder can only see their own)
 */
router.get('/proposals/:id', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const proposalData = await ProposalService.getProposal(id, req.user);
    
    // Ensure bidder only sees their own proposals
    if (proposalData.organization_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Transform to Omkar's expected format
    const proposal = {
      _id: proposalData.proposal_id,
      tenderId: {
        title: proposalData.tender_name || 'Tender'
      },
      status: proposalData.status,
      createdAt: proposalData.created_at
    };
    
    // Transform section responses to Omkar's format
    const sections = (proposalData.responses || []).map((resp, index) => ({
      _id: resp.section_id,
      sectionOrder: index + 1,
      sectionName: resp.section_name || '',
      content: resp.content || ''
    }));
    
    res.json({ 
      data: {
        proposal,
        sections
      }
    });
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    next(err);
  }
});

/**
 * PUT /api/bidder/proposals/:id/sections/:sectionId
 * Update proposal section response (draft only - HARD LOCK after submission)
 * Body: { content }
 */
router.put('/proposals/:id/sections/:sectionId', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id, sectionId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    // HARD LOCK: Check proposal status BEFORE any update
    const statusCheck = await pool.query(
      'SELECT status FROM proposal WHERE proposal_id = $1',
      [id]
    );
    
    if (statusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (statusCheck.rows[0].status !== 'DRAFT') {
      return res.status(403).json({
        error: 'Proposal locked',
        message: 'Submitted proposals cannot be edited. The proposal is now read-only.'
      });
    }

    const response = await ProposalService.upsertSectionResponse(id, sectionId, content, req.user);

    // Log audit action (non-blocking)
    AuditLogService.logSectionEdit(id, req.user.userId, sectionId, null, req).catch(() => {});

    res.json(response);
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Section does not belong to this tender') return res.status(400).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message === 'Cannot edit a non-draft proposal') return res.status(403).json({ error: err.message, message: 'Submitted proposals cannot be edited.' });
    next(err);
  }
});

/**
 * POST /api/bidder/proposals/:id/submit
 * Submit a draft proposal (DRAFT → SUBMITTED) with full validation
 */
router.post('/proposals/:id/submit', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const proposalData = await ProposalService.submitProposal(id, req.user);

    // Log audit action (non-blocking)
    AuditLogService.logProposalSubmit(id, req.user.userId, req).catch(() => {});

    // Transform to Omkar's expected format
    const proposal = {
      _id: proposalData.proposal_id,
      tenderId: proposalData.tender_id,
      status: proposalData.status,
      createdAt: proposalData.created_at,
      submittedAt: proposalData.submitted_at
    };

    res.json({ data: { proposal } });
  } catch (err) {
    // Validation errors with detailed feedback
    if (err.message === 'Proposal incomplete') {
      return res.status(400).json({
        error: err.message,
        details: err.details,
        incompleteSections: err.incompleteSections || [],
        incompleteIds: err.incompleteIds || []
      });
    }
    
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message === 'Proposal already submitted') return res.status(400).json({ error: err.message, details: err.details });
    
    next(err);
  }
});

/**
 * POST /api/bidder/proposals/:id/sections/:sectionId/analyze
 * AI-powered analysis of proposal section draft (DRAFT only - HARD LOCK after submission)
 * ALWAYS returns HTTP 200 - uses fallback if AI fails
 */
router.post('/proposals/:id/sections/:sectionId/analyze', requireAuth, requireRole('BIDDER'), aiRateLimiter, async (req, res, next) => {
  try {
    const { id: proposalId, sectionId } = req.params;
    const { draftContent, tenderRequirement, userQuestion, sectionType } = req.body;
    
    console.log('[Analyze Section] ProposalId:', proposalId, 'SectionId:', sectionId);
    console.log('[Analyze Section] Body keys:', Object.keys(req.body));

    if (draftContent === undefined || !sectionType) {
      return res.status(400).json({ 
        error: 'draftContent and sectionType are required',
        received: { hasDraftContent: draftContent !== undefined, sectionType }
      });
    }

    // Verify proposal ownership
    const proposalCheck = await pool.query(
      'SELECT organization_id, status FROM proposal WHERE proposal_id = $1',
      [proposalId]
    );
    
    if (proposalCheck.rows.length === 0 || proposalCheck.rows[0].organization_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // HARD LOCK: Prevent AI analysis on submitted proposals
    if (proposalCheck.rows[0].status !== 'DRAFT') {
      return res.status(403).json({
        error: 'Proposal locked',
        message: 'Cannot analyze submitted proposals. The proposal is now read-only.'
      });
    }

    // Get AI analysis with guaranteed fallback (never throws)
    const analysis = await AIService.analyzeProposalSection(
      sectionType,
      draftContent,
      tenderRequirement || '',
      userQuestion || ''
    );

    // ALWAYS return HTTP 200 with structured analysis
    // analysis.mode will be 'ai' or 'fallback'
    res.json({ 
      success: true,
      data: { analysis } 
    });

  } catch (err) {
    // This should rarely execute since AIService has internal error handling
    console.error('[Bidder Routes] Unexpected error in analyze endpoint:', err.message);
    
    // Emergency fallback response
    res.json({ 
      success: true,
      data: { 
        analysis: {
          mode: 'fallback',
          suggestions: [{
            observation: 'Analysis temporarily unavailable',
            suggestedImprovement: 'Review your draft against tender requirements manually',
            reason: 'System is experiencing temporary issues. Please try again or proceed with manual review.'
          }]
        }
      }
    });
  }
});

// ==========================================
// PROPOSAL EXPORT ENDPOINTS
// ==========================================

/**
 * GET /api/bidder/proposals/:id/export
 * Export proposal as PDF or DOCX
 * Query params: format (pdf|docx), template (formal|modern|minimal)
 */
router.get('/proposals/:id/export', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'pdf', template = 'formal' } = req.query;

    // Validate format
    if (!['pdf', 'docx'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use pdf or docx.' });
    }

    // Validate template
    if (!['formal', 'modern', 'minimal'].includes(template)) {
      return res.status(400).json({ error: 'Invalid template. Use formal, modern, or minimal.' });
    }

    let buffer;
    let contentType;
    let filename;

    if (format === 'pdf') {
      buffer = await ProposalExportService.generatePDF(id, template, req.user);
      contentType = 'application/pdf';
      filename = `proposal_${id}_${template}.pdf`;
    } else {
      buffer = await ProposalExportService.generateDOCX(id, template, req.user);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `proposal_${id}_${template}.docx`;
    }

    // Log audit action (non-blocking)
    AuditLogService.logProposalExport(id, req.user.userId, format, template, req).catch(() => {});

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    next(err);
  }
});

/**
 * GET /api/bidder/proposals/:id/export/preview
 * Get export preview data
 * Query params: template (formal|modern|minimal)
 */
router.get('/proposals/:id/export/preview', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { template = 'formal' } = req.query;

    const preview = await ProposalExportService.getExportPreview(id, template, req.user);
    res.json({ success: true, data: preview });
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    next(err);
  }
});

// ==========================================
// PROPOSAL PUBLISH WORKFLOW ENDPOINTS
// ==========================================

/**
 * POST /api/bidder/proposals/:id/finalize
 * Finalize a proposal (DRAFT -> FINAL)
 */
router.post('/proposals/:id/finalize', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const proposal = await ProposalPublishService.finalizeProposal(id, req.user);

    res.json({
      success: true,
      data: {
        proposal: {
          _id: proposal.proposal_id,
          tenderId: proposal.tender_id,
          status: proposal.status,
          version: proposal.version,
          finalizedAt: proposal.finalized_at
        }
      },
      message: 'Proposal finalized successfully'
    });
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message.includes('Cannot finalize')) return res.status(400).json({ error: err.message });
    if (err.message.includes('incomplete mandatory')) {
      return res.status(400).json({
        error: err.message,
        incompleteSections: err.incompleteSections || []
      });
    }
    next(err);
  }
});

/**
 * POST /api/bidder/proposals/:id/publish
 * Publish a proposal (FINAL -> PUBLISHED)
 */
router.post('/proposals/:id/publish', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const proposal = await ProposalPublishService.publishProposal(id, req.user);

    res.json({
      success: true,
      data: {
        proposal: {
          _id: proposal.proposal_id,
          tenderId: proposal.tender_id,
          status: proposal.status,
          version: proposal.version,
          publishedAt: proposal.published_at
        }
      },
      message: 'Proposal published successfully'
    });
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message.includes('Cannot publish')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

/**
 * POST /api/bidder/proposals/:id/revert
 * Revert a finalized proposal back to draft (FINAL -> DRAFT)
 */
router.post('/proposals/:id/revert', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const proposal = await ProposalPublishService.revertToDraft(id, req.user);

    res.json({
      success: true,
      data: {
        proposal: {
          _id: proposal.proposal_id,
          tenderId: proposal.tender_id,
          status: proposal.status,
          version: proposal.version
        }
      },
      message: 'Proposal reverted to draft'
    });
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message.includes('Cannot revert')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

// ==========================================
// PROPOSAL VERSIONING ENDPOINTS
// ==========================================

/**
 * POST /api/bidder/proposals/:id/new-version
 * Create a new version of a published proposal
 */
router.post('/proposals/:id/new-version', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const newProposal = await ProposalPublishService.createNewVersion(id, req.user);

    res.status(201).json({
      success: true,
      data: {
        proposal: {
          _id: newProposal.proposal_id,
          tenderId: newProposal.tender_id,
          parentProposalId: newProposal.parent_proposal_id,
          version: newProposal.version,
          status: newProposal.status,
          createdAt: newProposal.created_at
        }
      },
      message: 'New version created successfully'
    });
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message.includes('Cannot create new version')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

/**
 * GET /api/bidder/proposals/:id/versions
 * Get version history for a proposal
 */
router.get('/proposals/:id/versions', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await ProposalPublishService.getVersionHistory(id, req.user);

    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    next(err);
  }
});

/**
 * GET /api/bidder/proposals/:id/versions/:versionNumber
 * Get a specific version snapshot
 */
router.get('/proposals/:id/versions/:versionNumber', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id, versionNumber } = req.params;
    const snapshot = await ProposalPublishService.getVersionSnapshot(id, parseInt(versionNumber), req.user);

    res.json({
      success: true,
      data: snapshot
    });
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Version not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    next(err);
  }
});

// ==========================================
// UPLOADED TENDER ENDPOINTS
// ==========================================

/**
 * GET /api/bidder/uploaded-tenders/:id
 * Get uploaded tender details with full analysis data
 */
router.get('/uploaded-tenders/:id', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tender = await UploadedTenderService.getById(id, req.user.userId);

    if (!tender) {
      return res.status(404).json({ error: 'Uploaded tender not found' });
    }

    res.json({
      success: true,
      data: tender
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bidder/uploaded-tenders
 * List uploaded tenders for the current user's organization
 */
router.get('/uploaded-tenders', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const tenders = await UploadedTenderService.listByOrganization(
      req.user.organizationId,
      { limit: parseInt(limit), offset: parseInt(offset) }
    );

    const count = await UploadedTenderService.getCount({
      organizationId: req.user.organizationId
    });

    res.json({
      success: true,
      data: tenders,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bidder/uploaded-tenders
 * Create uploaded tender record from client analysis data
 * Body: { title, description, originalFilename?, fileSize?, parsedData?, analysisData?, metadata? }
 */
router.post('/uploaded-tenders', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const {
      title,
      description,
      originalFilename = null,
      fileSize = null,
      parsedData = {},
      analysisData = {},
      metadata = {},
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Validate user authentication data
    if (!req.user || !req.user.userId || !req.user.organizationId) {
      console.error('[Bidder] Missing auth data:', req.user);
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[Bidder] Creating uploaded tender:', { 
      title, 
      userId: req.user.userId, 
      organizationId: req.user.organizationId 
    });

    const created = await UploadedTenderService.create(
      {
        title,
        description,
        source: 'PDF_UPLOAD',
        originalFilename,
        fileSize,
        parsedData,
        analysisData,
        metadata,
      },
      req.user.userId,
      req.user.organizationId
    );
    // If proposalDraft sections exist, persist an initial draft for the owner
    try {
      const sections = analysisData?.proposalDraft?.sections || [];
      if (Array.isArray(sections) && sections.length > 0) {
        await UploadedProposalDraftService.upsert(
          {
            uploadedTenderId: created.id,
            sections,
            title: title,
          },
          req.user.userId,
          req.user.organizationId
        );
      }
    } catch (draftErr) {
      console.error('[Bidder] Failed to upsert initial uploaded proposal draft:', draftErr.message);
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/bidder/uploaded-tenders/:id
 * Delete an uploaded tender
 */
router.delete('/uploaded-tenders/:id', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await UploadedTenderService.delete(id, req.user.userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Uploaded tender not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Uploaded tender deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// SAVED TENDER ENDPOINTS
// ==========================================

/**
 * GET /api/bidder/saved-tenders
 * Get all saved tenders for the current user
 */
router.get('/saved-tenders', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const tenders = await SavedTenderService.getSavedTenders(
      req.user.userId,
      { limit: parseInt(limit), offset: parseInt(offset) }
    );

    const count = await SavedTenderService.getCount(req.user.userId);

    res.json({
      success: true,
      data: tenders,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bidder/saved-tenders/ids
 * Get IDs of all saved tenders (for quick lookup in tender lists)
 */
router.get('/saved-tenders/ids', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const savedIds = await SavedTenderService.getSavedIds(req.user.userId);

    res.json({
      success: true,
      data: savedIds
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bidder/saved-tenders
 * Save a tender (platform or uploaded)
 * Body: { tenderId?: string, uploadedTenderId?: string }
 */
router.post('/saved-tenders', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { tenderId, uploadedTenderId } = req.body;

    const saved = await SavedTenderService.saveTender(
      { tenderId, uploadedTenderId },
      req.user.userId,
      req.user.organizationId
    );

    res.status(201).json({
      success: true,
      data: saved,
      message: 'Tender saved successfully'
    });
  } catch (err) {
    if (err.message === 'Tender is already saved') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/bidder/saved-tenders/toggle
 * Toggle save status of a tender
 * Body: { tenderId?: string, uploadedTenderId?: string }
 */
router.post('/saved-tenders/toggle', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { tenderId, uploadedTenderId } = req.body;
    
    console.log('[Toggle Save] User:', req.user.userId, 'OrgId:', req.user.organizationId);
    console.log('[Toggle Save] Body:', { tenderId, uploadedTenderId });

    if (!req.user.userId || !req.user.organizationId) {
      console.error('[Toggle Save] Missing user data');
      return res.status(400).json({ error: 'User authentication incomplete' });
    }

    if (!tenderId && !uploadedTenderId) {
      return res.status(400).json({ error: 'Either tenderId or uploadedTenderId is required' });
    }

    const result = await SavedTenderService.toggleSave(
      { tenderId, uploadedTenderId },
      req.user.userId,
      req.user.organizationId
    );

    res.json({
      success: true,
      data: result,
      message: result.saved ? 'Tender saved' : 'Tender unsaved'
    });
  } catch (err) {
    console.error('[Toggle Save] Error:', err.message);
    next(err);
  }
});

/**
 * DELETE /api/bidder/saved-tenders
 * Unsave a tender
 * Body: { tenderId?: string, uploadedTenderId?: string }
 */
router.delete('/saved-tenders', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { tenderId, uploadedTenderId } = req.body;

    const deleted = await SavedTenderService.unsaveTender(
      { tenderId, uploadedTenderId },
      req.user.userId
    );

    if (!deleted) {
      return res.status(404).json({ error: 'Saved tender not found' });
    }

    res.json({
      success: true,
      message: 'Tender unsaved successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// UPLOADED PROPOSAL DRAFT ENDPOINTS
// ==========================================

/**
 * GET /api/bidder/uploaded-proposal-drafts
 * List all proposal drafts for uploaded tenders
 */
router.get('/uploaded-proposal-drafts', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    const drafts = await UploadedProposalDraftService.listByUser(
      req.user.userId,
      { limit: parseInt(limit), offset: parseInt(offset), status }
    );

    const count = await UploadedProposalDraftService.getCount(req.user.userId, { status });

    res.json({
      success: true,
      data: drafts,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bidder/uploaded-proposal-drafts/:id
 * Get a specific proposal draft by ID
 */
router.get('/uploaded-proposal-drafts/:id', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const draft = await UploadedProposalDraftService.getById(id, req.user.userId);

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({
      success: true,
      data: draft
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bidder/uploaded-proposal-drafts/tender/:uploadedTenderId
 * Get proposal draft by uploaded tender ID
 */
router.get('/uploaded-proposal-drafts/tender/:uploadedTenderId', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { uploadedTenderId } = req.params;
    const draft = await UploadedProposalDraftService.getByUploadedTenderId(
      uploadedTenderId,
      req.user.userId
    );

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({
      success: true,
      data: draft
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bidder/uploaded-proposal-drafts
 * Create or update a proposal draft
 * Body: { uploadedTenderId, sections, title? }
 */
router.post('/uploaded-proposal-drafts', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { uploadedTenderId, sections, title } = req.body;

    if (!uploadedTenderId) {
      return res.status(400).json({ error: 'uploadedTenderId is required' });
    }

    const draft = await UploadedProposalDraftService.upsert(
      { uploadedTenderId, sections, title },
      req.user.userId,
      req.user.organizationId
    );

    res.status(201).json({
      success: true,
      data: draft,
      message: 'Draft saved successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/bidder/uploaded-proposal-drafts/:id/status
 * Update draft status
 * Body: { status }
 */
router.put('/uploaded-proposal-drafts/:id/status', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['DRAFT', 'FINAL', 'EXPORTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const draft = await UploadedProposalDraftService.updateStatus(id, status, req.user.userId);

    res.json({
      success: true,
      data: draft,
      message: 'Status updated successfully'
    });
  } catch (err) {
    if (err.message === 'Draft not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/bidder/uploaded-proposal-drafts/:id/export
 * Record an export of the draft
 */
router.post('/uploaded-proposal-drafts/:id/export', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const draft = await UploadedProposalDraftService.recordExport(id, req.user.userId);

    res.json({
      success: true,
      data: draft,
      message: 'Export recorded'
    });
  } catch (err) {
    if (err.message === 'Draft not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/bidder/uploaded-proposal-drafts/:id
 * Delete a proposal draft
 */
router.delete('/uploaded-proposal-drafts/:id', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await UploadedProposalDraftService.delete(id, req.user.userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Draft not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Draft deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// RISK ASSESSMENT & COMPLIANCE ENDPOINTS
// ==========================================

/**
 * GET /api/bidder/proposals/:id/risk
 * Get AI risk assessment for a proposal
 */
router.get('/proposals/:id/risk', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT organization_id FROM proposal WHERE proposal_id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (ownerCheck.rows[0].organization_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const assessment = await RiskAssessmentService.calculateRiskScore(id);

    res.json({
      success: true,
      data: assessment
    });
  } catch (err) {
    if (err.message === 'Proposal not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/bidder/proposals/:id/compliance
 * Get compliance check results for a proposal
 */
router.get('/proposals/:id/compliance', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT organization_id FROM proposal WHERE proposal_id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (ownerCheck.rows[0].organization_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const compliance = await ComplianceCheckService.checkProposalCompliance(id);

    res.json({
      success: true,
      data: compliance
    });
  } catch (err) {
    if (err.message === 'Proposal not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/bidder/proposals/:id/audit
 * Get audit trail for a proposal
 */
router.get('/proposals/:id/audit', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT organization_id FROM proposal WHERE proposal_id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (ownerCheck.rows[0].organization_id !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const logs = await AuditLogService.getLogsForProposal(id, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalCount = await AuditLogService.getLogCount(id);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
