/**
 * Compliance Check Service
 * Analyzes proposals for compliance issues including:
 * - Missing mandatory sections
 * - Keyword compliance (eligibility, financial, technical requirements)
 * - Format and content requirements
 * - Document completeness
 */

import { pool } from '../config/db.js';

// Compliance rules configuration
const COMPLIANCE_RULES = {
  // Minimum content requirements
  MIN_SECTION_LENGTH: 50,
  MIN_WORD_COUNT_MANDATORY: 100,

  // Keywords that indicate requirements in tender sections
  REQUIREMENT_KEYWORDS: {
    ELIGIBILITY: [
      'must have', 'should have', 'minimum', 'at least', 'required', 'mandatory',
      'experience', 'years', 'turnover', 'annual', 'certification', 'registered',
      'license', 'valid', 'qualification', 'eligible'
    ],
    FINANCIAL: [
      'emd', 'earnest money', 'bid security', 'bank guarantee', 'performance guarantee',
      'financial bid', 'price', 'cost', 'budget', 'payment', 'invoice', 'tax', 'gst'
    ],
    TECHNICAL: [
      'specification', 'technical', 'methodology', 'approach', 'iso', 'standard',
      'quality', 'design', 'implementation', 'deliverable', 'milestone'
    ],
    LEGAL: [
      'undertaking', 'declaration', 'affidavit', 'agreement', 'contract', 'terms',
      'condition', 'clause', 'warranty', 'liability', 'indemnity'
    ],
    DOCUMENTATION: [
      'document', 'certificate', 'proof', 'evidence', 'attach', 'submit', 'provide',
      'copy', 'original', 'notarized', 'self-attested'
    ]
  },

  // Severity levels for compliance issues
  SEVERITY: {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
    INFO: 'INFO'
  }
};

export const ComplianceCheckService = {
  /**
   * Run comprehensive compliance check on a proposal
   * @param {string} proposalId - The proposal ID
   * @returns {Object} Compliance check results
   */
  async checkProposalCompliance(proposalId) {
    // Fetch proposal with tender details
    const proposalRes = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.organization_id, p.status, p.created_at,
              t.title as tender_title, t.submission_deadline, t.description as tender_description
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (proposalRes.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const proposal = proposalRes.rows[0];

    // Fetch all tender sections
    const sectionsRes = await pool.query(
      `SELECT section_id, title, is_mandatory, content, description, section_key
       FROM tender_section
       WHERE tender_id = $1
       ORDER BY order_index`,
      [proposal.tender_id]
    );

    const tenderSections = sectionsRes.rows;

    // Fetch proposal responses
    const responsesRes = await pool.query(
      `SELECT section_id, content, updated_at
       FROM proposal_section_response
       WHERE proposal_id = $1`,
      [proposalId]
    );

    const responses = responsesRes.rows;
    const responseMap = new Map(responses.map(r => [r.section_id, r]));

    // Initialize compliance results
    const complianceIssues = [];
    const complianceWarnings = [];
    const compliancePassed = [];

    // ==========================================
    // CHECK 1: Mandatory Sections Completion
    // ==========================================
    const mandatorySections = tenderSections.filter(s => s.is_mandatory);

    for (const section of mandatorySections) {
      const response = responseMap.get(section.section_id);

      if (!response || !response.content || response.content.trim().length === 0) {
        complianceIssues.push({
          type: 'MISSING_MANDATORY_SECTION',
          severity: COMPLIANCE_RULES.SEVERITY.CRITICAL,
          sectionId: section.section_id,
          sectionTitle: section.title,
          message: `Mandatory section "${section.title}" has no content`,
          recommendation: 'Add content to this mandatory section before submission',
          autoFixable: false
        });
      } else if (response.content.trim().length < COMPLIANCE_RULES.MIN_SECTION_LENGTH) {
        complianceIssues.push({
          type: 'INSUFFICIENT_CONTENT',
          severity: COMPLIANCE_RULES.SEVERITY.HIGH,
          sectionId: section.section_id,
          sectionTitle: section.title,
          message: `Section "${section.title}" has insufficient content (${response.content.trim().length} chars, minimum ${COMPLIANCE_RULES.MIN_SECTION_LENGTH})`,
          recommendation: 'Expand the content to meet minimum requirements',
          currentLength: response.content.trim().length,
          requiredLength: COMPLIANCE_RULES.MIN_SECTION_LENGTH,
          autoFixable: false
        });
      } else {
        compliancePassed.push({
          type: 'MANDATORY_SECTION_COMPLETE',
          sectionId: section.section_id,
          sectionTitle: section.title,
          message: `Mandatory section "${section.title}" is complete`
        });
      }
    }

    // ==========================================
    // CHECK 2: Requirement Keywords Analysis
    // ==========================================
    for (const section of tenderSections) {
      const tenderContent = ((section.content || '') + ' ' + (section.description || '')).toLowerCase();
      const response = responseMap.get(section.section_id);
      const responseContent = (response?.content || '').toLowerCase();

      // Check each requirement category
      for (const [category, keywords] of Object.entries(COMPLIANCE_RULES.REQUIREMENT_KEYWORDS)) {
        const foundInTender = keywords.filter(kw => tenderContent.includes(kw));

        if (foundInTender.length > 0) {
          // Check if response addresses these requirements
          const addressedInResponse = foundInTender.filter(kw => responseContent.includes(kw));
          const missingKeywords = foundInTender.filter(kw => !responseContent.includes(kw));

          if (missingKeywords.length > 0 && section.is_mandatory) {
            // Critical for mandatory sections
            const severity = missingKeywords.length >= 3 ? COMPLIANCE_RULES.SEVERITY.HIGH : COMPLIANCE_RULES.SEVERITY.MEDIUM;

            complianceWarnings.push({
              type: 'REQUIREMENT_NOT_ADDRESSED',
              severity,
              sectionId: section.section_id,
              sectionTitle: section.title,
              category,
              message: `Section may not fully address ${category.toLowerCase()} requirements`,
              missingKeywords: missingKeywords.slice(0, 5),
              recommendation: `Consider addressing these requirements: ${missingKeywords.slice(0, 3).join(', ')}`,
              autoFixable: false
            });
          }
        }
      }
    }

    // ==========================================
    // CHECK 3: Content Quality Checks
    // ==========================================
    for (const section of tenderSections) {
      const response = responseMap.get(section.section_id);
      if (!response?.content) continue;

      const content = response.content;

      // Check for placeholder text
      const placeholderPatterns = [
        /\[.*?\]/g,
        /\(.*?placeholder.*?\)/gi,
        /TODO/gi,
        /TBD/gi,
        /to be (determined|provided|filled|updated)/gi,
        /insert.*here/gi,
        /lorem ipsum/gi
      ];

      for (const pattern of placeholderPatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          complianceWarnings.push({
            type: 'PLACEHOLDER_DETECTED',
            severity: COMPLIANCE_RULES.SEVERITY.HIGH,
            sectionId: section.section_id,
            sectionTitle: section.title,
            message: `Placeholder text detected: "${matches[0]}"`,
            recommendation: 'Replace all placeholder text with actual content',
            matchCount: matches.length,
            autoFixable: false
          });
          break; // One warning per section
        }
      }

      // Check for extremely short word count in mandatory sections
      if (section.is_mandatory) {
        const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount < COMPLIANCE_RULES.MIN_WORD_COUNT_MANDATORY) {
          complianceWarnings.push({
            type: 'LOW_WORD_COUNT',
            severity: COMPLIANCE_RULES.SEVERITY.MEDIUM,
            sectionId: section.section_id,
            sectionTitle: section.title,
            message: `Section has only ${wordCount} words (recommended: ${COMPLIANCE_RULES.MIN_WORD_COUNT_MANDATORY}+)`,
            recommendation: 'Consider expanding this section with more detail',
            currentWordCount: wordCount,
            recommendedWordCount: COMPLIANCE_RULES.MIN_WORD_COUNT_MANDATORY,
            autoFixable: false
          });
        }
      }
    }

    // ==========================================
    // CHECK 4: Deadline Compliance
    // ==========================================
    if (proposal.submission_deadline) {
      const deadline = new Date(proposal.submission_deadline);
      const now = new Date();
      const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) {
        complianceIssues.push({
          type: 'DEADLINE_PASSED',
          severity: COMPLIANCE_RULES.SEVERITY.CRITICAL,
          message: `Submission deadline has passed (${Math.abs(daysRemaining)} days ago)`,
          deadline: proposal.submission_deadline,
          recommendation: 'Contact the tendering authority if late submissions are accepted',
          autoFixable: false
        });
      } else if (daysRemaining <= 2 && proposal.status === 'DRAFT') {
        complianceWarnings.push({
          type: 'DEADLINE_IMMINENT',
          severity: COMPLIANCE_RULES.SEVERITY.HIGH,
          message: `Only ${daysRemaining} day(s) remaining - proposal still in draft`,
          deadline: proposal.submission_deadline,
          daysRemaining,
          recommendation: 'Submit immediately or ensure completion today',
          autoFixable: false
        });
      }
    }

    // ==========================================
    // Calculate overall compliance status
    // ==========================================
    const criticalCount = complianceIssues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = complianceIssues.filter(i => i.severity === 'HIGH').length +
                      complianceWarnings.filter(w => w.severity === 'HIGH').length;

    let overallStatus;
    let statusDescription;

    if (criticalCount > 0) {
      overallStatus = 'CRITICAL';
      statusDescription = `${criticalCount} critical issue(s) must be resolved before submission`;
    } else if (highCount > 0) {
      overallStatus = 'NEEDS_ATTENTION';
      statusDescription = `${highCount} high-priority issue(s) should be addressed`;
    } else if (complianceWarnings.length > 0) {
      overallStatus = 'REVIEW_RECOMMENDED';
      statusDescription = `${complianceWarnings.length} warning(s) - review recommended`;
    } else {
      overallStatus = 'COMPLIANT';
      statusDescription = 'All compliance checks passed';
    }

    // Calculate compliance score (0-100)
    const totalChecks = mandatorySections.length + tenderSections.length;
    const passedChecks = compliancePassed.length;
    const complianceScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

    return {
      proposalId,
      tenderId: proposal.tender_id,
      tenderTitle: proposal.tender_title,
      status: proposal.status,

      // Overall compliance status
      overallStatus,
      statusDescription,
      complianceScore,

      // Issue counts
      counts: {
        critical: criticalCount,
        high: highCount,
        medium: complianceWarnings.filter(w => w.severity === 'MEDIUM').length,
        low: complianceWarnings.filter(w => w.severity === 'LOW').length,
        passed: compliancePassed.length
      },

      // Detailed issues and warnings
      issues: complianceIssues,
      warnings: complianceWarnings,
      passed: compliancePassed,

      // Summary for quick display
      summary: {
        mandatorySectionsComplete: mandatorySections.length - complianceIssues.filter(i => i.type === 'MISSING_MANDATORY_SECTION').length,
        mandatorySectionsTotal: mandatorySections.length,
        hasPlaceholders: complianceWarnings.some(w => w.type === 'PLACEHOLDER_DETECTED'),
        hasDeadlineIssue: complianceIssues.some(i => i.type === 'DEADLINE_PASSED') ||
                          complianceWarnings.some(w => w.type === 'DEADLINE_IMMINENT')
      },

      // Metadata
      checkedAt: new Date().toISOString()
    };
  },

  /**
   * Get compliance summary for multiple proposals (dashboard)
   */
  async getComplianceSummaryForOrganization(organizationId) {
    const proposalsRes = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.status,
              t.title as tender_title, t.submission_deadline
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.organization_id = $1 AND p.status = 'DRAFT'
       ORDER BY t.submission_deadline ASC NULLS LAST
       LIMIT 20`,
      [organizationId]
    );

    const summaries = [];
    let criticalCount = 0;
    let needsAttentionCount = 0;

    for (const proposal of proposalsRes.rows) {
      try {
        const compliance = await this.checkProposalCompliance(proposal.proposal_id);

        summaries.push({
          proposalId: proposal.proposal_id,
          tenderId: proposal.tender_id,
          tenderTitle: proposal.tender_title,
          deadline: proposal.submission_deadline,
          status: compliance.overallStatus,
          score: compliance.complianceScore,
          issueCount: compliance.counts.critical + compliance.counts.high
        });

        if (compliance.overallStatus === 'CRITICAL') criticalCount++;
        else if (compliance.overallStatus === 'NEEDS_ATTENTION') needsAttentionCount++;
      } catch (err) {
        console.error(`[Compliance] Error checking proposal ${proposal.proposal_id}:`, err.message);
      }
    }

    return {
      proposals: summaries,
      statistics: {
        totalDrafts: summaries.length,
        criticalCount,
        needsAttentionCount,
        compliantCount: summaries.filter(s => s.status === 'COMPLIANT').length,
        avgComplianceScore: summaries.length > 0
          ? Math.round(summaries.reduce((sum, s) => sum + s.score, 0) / summaries.length)
          : 100
      }
    };
  },

  /**
   * Quick compliance check (faster, fewer details)
   */
  async quickComplianceCheck(proposalId) {
    const proposalRes = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.status,
              t.submission_deadline,
              COUNT(DISTINCT ts.section_id) FILTER (WHERE ts.is_mandatory) as mandatory_count,
              COUNT(DISTINCT psr.section_id) FILTER (WHERE ts.is_mandatory AND LENGTH(TRIM(psr.content)) >= 50) as completed_mandatory
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       LEFT JOIN tender_section ts ON t.tender_id = ts.tender_id
       LEFT JOIN proposal_section_response psr ON p.proposal_id = psr.proposal_id AND ts.section_id = psr.section_id
       WHERE p.proposal_id = $1
       GROUP BY p.proposal_id, p.tender_id, p.status, t.submission_deadline`,
      [proposalId]
    );

    if (proposalRes.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const data = proposalRes.rows[0];
    const mandatoryComplete = parseInt(data.completed_mandatory) || 0;
    const mandatoryTotal = parseInt(data.mandatory_count) || 0;

    // Check deadline
    const deadline = data.submission_deadline ? new Date(data.submission_deadline) : null;
    const daysRemaining = deadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : null;

    let status = 'COMPLIANT';
    const issues = [];

    if (mandatoryComplete < mandatoryTotal) {
      status = 'CRITICAL';
      issues.push(`${mandatoryTotal - mandatoryComplete} mandatory section(s) incomplete`);
    }

    if (daysRemaining !== null && daysRemaining < 0) {
      status = 'CRITICAL';
      issues.push('Deadline passed');
    } else if (daysRemaining !== null && daysRemaining <= 3 && data.status === 'DRAFT') {
      if (status !== 'CRITICAL') status = 'NEEDS_ATTENTION';
      issues.push(`Only ${daysRemaining} days remaining`);
    }

    return {
      proposalId,
      status,
      mandatoryComplete,
      mandatoryTotal,
      completionPercent: mandatoryTotal > 0 ? Math.round((mandatoryComplete / mandatoryTotal) * 100) : 100,
      daysRemaining,
      issues
    };
  }
};

export default ComplianceCheckService;
