/**
 * Risk Assessment Service
 * Calculates risk scores for proposals based on:
 * - Missing mandatory sections
 * - Compliance issues
 * - Deadline proximity
 * - Incomplete data
 * - Content quality metrics
 */

import { pool } from '../config/db.js';

export const RiskAssessmentService = {
  /**
   * Calculate comprehensive risk score for a proposal
   * @param {string} proposalId - The proposal ID
   * @returns {Object} Risk assessment with score, level, factors, and recommendations
   */
  async calculateRiskScore(proposalId) {
    // Fetch proposal with tender details
    const proposalRes = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.organization_id, p.status, p.created_at,
              t.title as tender_title, t.submission_deadline, t.estimated_value,
              o.name as organization_name
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       JOIN organization o ON p.organization_id = o.organization_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (proposalRes.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const proposal = proposalRes.rows[0];

    // Fetch all tender sections (mandatory and optional)
    const sectionsRes = await pool.query(
      `SELECT section_id, title, is_mandatory, content, description
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

    // Initialize risk factors
    const riskFactors = [];
    let totalRiskScore = 0;

    // ==========================================
    // FACTOR 1: Missing Mandatory Sections (Weight: 30%)
    // ==========================================
    const mandatorySections = tenderSections.filter(s => s.is_mandatory);
    const missingSections = [];
    const incompleteSections = [];

    for (const section of mandatorySections) {
      const response = responseMap.get(section.section_id);
      if (!response || !response.content) {
        missingSections.push(section.title);
      } else if (response.content.trim().length < 50) {
        incompleteSections.push({
          title: section.title,
          currentLength: response.content.trim().length,
          requiredLength: 50
        });
      }
    }

    const mandatoryCompletionRate = mandatorySections.length > 0
      ? ((mandatorySections.length - missingSections.length - incompleteSections.length) / mandatorySections.length) * 100
      : 100;

    if (missingSections.length > 0) {
      const sectionRisk = Math.min(30, missingSections.length * 10);
      totalRiskScore += sectionRisk;
      riskFactors.push({
        category: 'MISSING_MANDATORY_SECTIONS',
        severity: missingSections.length >= 3 ? 'CRITICAL' : missingSections.length >= 1 ? 'HIGH' : 'MEDIUM',
        score: sectionRisk,
        maxScore: 30,
        description: `${missingSections.length} mandatory section(s) have no content`,
        details: missingSections,
        recommendation: `Complete the following mandatory sections immediately: ${missingSections.slice(0, 3).join(', ')}${missingSections.length > 3 ? '...' : ''}`
      });
    }

    if (incompleteSections.length > 0) {
      const incompleteRisk = Math.min(15, incompleteSections.length * 5);
      totalRiskScore += incompleteRisk;
      riskFactors.push({
        category: 'INCOMPLETE_SECTIONS',
        severity: incompleteSections.length >= 3 ? 'HIGH' : 'MEDIUM',
        score: incompleteRisk,
        maxScore: 15,
        description: `${incompleteSections.length} section(s) have insufficient content (less than 50 characters)`,
        details: incompleteSections.map(s => s.title),
        recommendation: 'Expand content in these sections to meet minimum requirements'
      });
    }

    // ==========================================
    // FACTOR 2: Deadline Proximity (Weight: 25%)
    // ==========================================
    if (proposal.submission_deadline) {
      const deadline = new Date(proposal.submission_deadline);
      const now = new Date();
      const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

      let deadlineRisk = 0;
      let deadlineSeverity = 'LOW';

      if (daysRemaining < 0) {
        deadlineRisk = 25;
        deadlineSeverity = 'CRITICAL';
        riskFactors.push({
          category: 'DEADLINE_PASSED',
          severity: deadlineSeverity,
          score: deadlineRisk,
          maxScore: 25,
          description: `Submission deadline has passed (${Math.abs(daysRemaining)} days ago)`,
          details: { deadline: proposal.submission_deadline, daysOverdue: Math.abs(daysRemaining) },
          recommendation: 'Contact the tendering authority immediately if late submissions are accepted'
        });
      } else if (daysRemaining <= 3) {
        deadlineRisk = 20;
        deadlineSeverity = 'CRITICAL';
        riskFactors.push({
          category: 'DEADLINE_CRITICAL',
          severity: deadlineSeverity,
          score: deadlineRisk,
          maxScore: 25,
          description: `Only ${daysRemaining} day(s) remaining until deadline`,
          details: { deadline: proposal.submission_deadline, daysRemaining },
          recommendation: 'Prioritize completion immediately. Consider using AI assistance to speed up drafting.'
        });
      } else if (daysRemaining <= 7) {
        deadlineRisk = 15;
        deadlineSeverity = 'HIGH';
        riskFactors.push({
          category: 'DEADLINE_APPROACHING',
          severity: deadlineSeverity,
          score: deadlineRisk,
          maxScore: 25,
          description: `${daysRemaining} days remaining until deadline`,
          details: { deadline: proposal.submission_deadline, daysRemaining },
          recommendation: 'Focus on completing all mandatory sections this week'
        });
      } else if (daysRemaining <= 14) {
        deadlineRisk = 8;
        deadlineSeverity = 'MEDIUM';
        riskFactors.push({
          category: 'DEADLINE_NEAR',
          severity: deadlineSeverity,
          score: deadlineRisk,
          maxScore: 25,
          description: `${daysRemaining} days remaining until deadline`,
          details: { deadline: proposal.submission_deadline, daysRemaining },
          recommendation: 'Plan your work schedule to ensure timely completion'
        });
      }

      totalRiskScore += deadlineRisk;
    }

    // ==========================================
    // FACTOR 3: Content Quality Analysis (Weight: 20%)
    // ==========================================
    let totalWordCount = 0;
    let sectionsWithMinimalContent = 0;
    const contentIssues = [];

    for (const section of tenderSections) {
      const response = responseMap.get(section.section_id);
      if (response && response.content) {
        const wordCount = response.content.trim().split(/\s+/).filter(w => w.length > 0).length;
        totalWordCount += wordCount;

        // Check for minimal content (less than 100 words for any section)
        if (wordCount < 100 && section.is_mandatory) {
          sectionsWithMinimalContent++;
          contentIssues.push({
            section: section.title,
            wordCount,
            issue: 'Minimal content - may lack sufficient detail'
          });
        }

        // Check for placeholder text
        const lowerContent = response.content.toLowerCase();
        if (lowerContent.includes('[placeholder]') ||
            lowerContent.includes('todo') ||
            lowerContent.includes('tbd') ||
            lowerContent.includes('to be determined') ||
            lowerContent.includes('will be provided')) {
          contentIssues.push({
            section: section.title,
            issue: 'Contains placeholder text that needs to be replaced'
          });
        }
      }
    }

    if (contentIssues.length > 0) {
      const contentRisk = Math.min(20, contentIssues.length * 4);
      totalRiskScore += contentRisk;
      riskFactors.push({
        category: 'CONTENT_QUALITY',
        severity: contentIssues.length >= 4 ? 'HIGH' : 'MEDIUM',
        score: contentRisk,
        maxScore: 20,
        description: `${contentIssues.length} content quality issue(s) detected`,
        details: contentIssues,
        recommendation: 'Review and expand content in flagged sections. Remove any placeholder text.'
      });
    }

    // ==========================================
    // FACTOR 4: Compliance Checks (Weight: 15%)
    // ==========================================
    const complianceIssues = await this.checkComplianceIssues(proposal, tenderSections, responseMap);

    if (complianceIssues.length > 0) {
      const complianceRisk = Math.min(15, complianceIssues.length * 5);
      totalRiskScore += complianceRisk;
      riskFactors.push({
        category: 'COMPLIANCE',
        severity: complianceIssues.some(i => i.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
        score: complianceRisk,
        maxScore: 15,
        description: `${complianceIssues.length} compliance issue(s) detected`,
        details: complianceIssues,
        recommendation: 'Address compliance issues before submission to avoid disqualification'
      });
    }

    // ==========================================
    // FACTOR 5: Proposal Status (Weight: 10%)
    // ==========================================
    if (proposal.status === 'DRAFT') {
      // Check how long it's been in draft
      const createdAt = new Date(proposal.created_at);
      const daysSinceCreation = Math.ceil((new Date() - createdAt) / (1000 * 60 * 60 * 24));

      if (daysSinceCreation > 30) {
        totalRiskScore += 5;
        riskFactors.push({
          category: 'STALE_DRAFT',
          severity: 'LOW',
          score: 5,
          maxScore: 10,
          description: `Proposal has been in draft status for ${daysSinceCreation} days`,
          details: { createdAt: proposal.created_at, daysSinceCreation },
          recommendation: 'Consider whether this proposal is still relevant and prioritize completion or archival'
        });
      }
    }

    // ==========================================
    // Calculate final risk level
    // ==========================================
    const maxPossibleScore = 100;
    const riskPercentage = Math.min(100, Math.round((totalRiskScore / maxPossibleScore) * 100));

    let riskLevel;
    if (riskPercentage >= 70) {
      riskLevel = 'CRITICAL';
    } else if (riskPercentage >= 50) {
      riskLevel = 'HIGH';
    } else if (riskPercentage >= 30) {
      riskLevel = 'MEDIUM';
    } else if (riskPercentage >= 10) {
      riskLevel = 'LOW';
    } else {
      riskLevel = 'MINIMAL';
    }

    // Generate summary and recommendations
    const summary = this.generateRiskSummary(riskLevel, riskFactors, proposal);
    const prioritizedRecommendations = this.getPrioritizedRecommendations(riskFactors);

    return {
      proposalId,
      tenderId: proposal.tender_id,
      tenderTitle: proposal.tender_title,
      organizationName: proposal.organization_name,
      status: proposal.status,

      // Risk scores
      riskScore: totalRiskScore,
      riskPercentage,
      riskLevel,

      // Completion metrics
      completionMetrics: {
        mandatoryCompletionRate: Math.round(mandatoryCompletionRate),
        totalSections: tenderSections.length,
        mandatorySections: mandatorySections.length,
        completedMandatory: mandatorySections.length - missingSections.length - incompleteSections.length,
        totalWordCount,
        responsesCount: responses.length
      },

      // Detailed factors
      riskFactors: riskFactors.sort((a, b) => b.score - a.score),

      // Summary and recommendations
      summary,
      prioritizedRecommendations,

      // Metadata
      assessedAt: new Date().toISOString()
    };
  },

  /**
   * Check for compliance issues in the proposal
   */
  async checkComplianceIssues(proposal, tenderSections, responseMap) {
    const issues = [];

    // Check for sections that mention specific compliance requirements
    const complianceKeywords = {
      eligibility: ['experience', 'years', 'turnover', 'certification', 'registration', 'license'],
      financial: ['emd', 'earnest money', 'bank guarantee', 'bid security', 'performance guarantee'],
      technical: ['iso', 'quality', 'standard', 'specification', 'methodology'],
      legal: ['undertaking', 'declaration', 'affidavit', 'power of attorney']
    };

    for (const section of tenderSections) {
      const sectionContent = (section.content || section.description || '').toLowerCase();
      const response = responseMap.get(section.section_id);
      const responseContent = (response?.content || '').toLowerCase();

      // Check if tender section mentions compliance requirements
      for (const [category, keywords] of Object.entries(complianceKeywords)) {
        for (const keyword of keywords) {
          if (sectionContent.includes(keyword)) {
            // Check if response addresses this requirement
            if (!responseContent.includes(keyword) && section.is_mandatory) {
              issues.push({
                category: category.toUpperCase(),
                section: section.title,
                severity: 'MEDIUM',
                issue: `Tender mentions "${keyword}" but response may not address this requirement`,
                keyword
              });
              break; // Only flag once per section per category
            }
          }
        }
      }
    }

    // Limit to most important issues
    return issues.slice(0, 5);
  },

  /**
   * Generate a human-readable risk summary
   */
  generateRiskSummary(riskLevel, riskFactors, proposal) {
    const criticalFactors = riskFactors.filter(f => f.severity === 'CRITICAL');
    const highFactors = riskFactors.filter(f => f.severity === 'HIGH');

    let summary = '';

    switch (riskLevel) {
      case 'CRITICAL':
        summary = `This proposal has CRITICAL risk issues that require immediate attention. `;
        if (criticalFactors.length > 0) {
          summary += `Primary concerns: ${criticalFactors.map(f => f.category.replace(/_/g, ' ').toLowerCase()).join(', ')}. `;
        }
        summary += `Submission without addressing these issues may result in disqualification.`;
        break;

      case 'HIGH':
        summary = `This proposal has HIGH risk factors that should be addressed before submission. `;
        if (highFactors.length > 0) {
          summary += `Key issues include: ${highFactors.map(f => f.category.replace(/_/g, ' ').toLowerCase()).join(', ')}. `;
        }
        summary += `Review and complete missing sections to improve chances of success.`;
        break;

      case 'MEDIUM':
        summary = `This proposal has MODERATE risk with some areas needing improvement. `;
        summary += `Address the flagged issues to strengthen your submission and increase competitiveness.`;
        break;

      case 'LOW':
        summary = `This proposal is in good shape with LOW risk. `;
        summary += `Minor improvements can be made to further strengthen the submission.`;
        break;

      default:
        summary = `This proposal has MINIMAL risk and appears well-prepared for submission. `;
        summary += `Perform a final review before submitting.`;
    }

    return summary;
  },

  /**
   * Get prioritized list of recommendations
   */
  getPrioritizedRecommendations(riskFactors) {
    return riskFactors
      .filter(f => f.recommendation)
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
      })
      .map(f => ({
        priority: f.severity,
        category: f.category,
        action: f.recommendation
      }))
      .slice(0, 5);
  },

  /**
   * Get risk assessment for multiple proposals (for dashboard)
   */
  async getProposalsRiskSummary(organizationId) {
    const proposalsRes = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.status, p.created_at,
              t.title as tender_title, t.submission_deadline
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       WHERE p.organization_id = $1 AND p.status = 'DRAFT'
       ORDER BY t.submission_deadline ASC NULLS LAST`,
      [organizationId]
    );

    const summaries = [];

    for (const proposal of proposalsRes.rows) {
      try {
        const assessment = await this.calculateRiskScore(proposal.proposal_id);
        summaries.push({
          proposalId: proposal.proposal_id,
          tenderId: proposal.tender_id,
          tenderTitle: proposal.tender_title,
          deadline: proposal.submission_deadline,
          riskScore: assessment.riskScore,
          riskLevel: assessment.riskLevel,
          riskPercentage: assessment.riskPercentage,
          topIssue: assessment.riskFactors[0]?.category || null,
          mandatoryCompletion: assessment.completionMetrics.mandatoryCompletionRate
        });
      } catch (err) {
        console.error(`[RiskAssessment] Error assessing proposal ${proposal.proposal_id}:`, err.message);
      }
    }

    // Calculate aggregate statistics
    const highRiskCount = summaries.filter(s => ['CRITICAL', 'HIGH'].includes(s.riskLevel)).length;
    const avgRiskScore = summaries.length > 0
      ? Math.round(summaries.reduce((sum, s) => sum + s.riskScore, 0) / summaries.length)
      : 0;

    return {
      proposals: summaries,
      statistics: {
        totalDraftProposals: summaries.length,
        highRiskCount,
        avgRiskScore,
        proposalsNeedingAttention: summaries.filter(s => s.mandatoryCompletion < 100).length
      }
    };
  }
};

export default RiskAssessmentService;
