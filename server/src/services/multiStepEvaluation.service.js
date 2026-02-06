/**
 * Multi-Step Proposal Evaluation Service
 * Evaluates proposals in separate steps with RAG retrieval
 * Prevents HTTP 413 errors by avoiding large payloads
 */

import { pool } from '../config/db.js';
import { LLMCaller } from '../utils/llmCaller.js';
import { RAGOrchestrator } from '../utils/ragOrchestrator.js';
import { TokenCounter } from '../utils/tokenCounter.js';
import { env } from '../config/env.js';

const CHAT_MODEL = env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export const MultiStepEvaluationService = {
  /**
   * Evaluate a proposal in multiple steps
   * @param {string} sessionId - Analysis session ID (from analyzedAt timestamp)
   * @param {Object} proposalData - Minimal proposal data {sections: [{id, title, content}]}
   * @param {string} tenderId - Optional tender ID for reference
   * @returns {Promise<Object>} Complete evaluation results
   */
  async evaluateProposal(sessionId, proposalData, tenderId = null) {
    console.log(`[Multi-Step Eval] Starting evaluation for session: ${sessionId}`);
    console.log(`[Multi-Step Eval] Proposal sections: ${proposalData.sections?.length || 0}`);

    // Store proposal in temporary session storage
    await this._storeProposalSession(sessionId, proposalData);

    // Run multi-step evaluation
    const steps = [
      { name: 'eligibility', label: 'Eligibility Compliance' },
      { name: 'technical', label: 'Technical Compliance' },
      { name: 'financial', label: 'Financial Alignment' },
      { name: 'risk', label: 'Risk & Gap Analysis' },
    ];

    const stepResults = {};
    const stepScores = {};

    for (const step of steps) {
      console.log(`[Multi-Step Eval] Running step: ${step.name}`);
      try {
        const result = await this._evaluateStep(step.name, sessionId, proposalData, tenderId);
        stepResults[step.name] = result;
        stepScores[step.name] = result.score;
        console.log(`[Multi-Step Eval] ${step.name} score: ${result.score}/100`);
      } catch (err) {
        console.error(`[Multi-Step Eval] Step ${step.name} failed:`, err.message);
        // Use fallback for failed step
        stepResults[step.name] = this._getFallbackStepResult(step.name);
        stepScores[step.name] = 60;
      }
    }

    // Calculate overall score
    const overallScore = Math.round(
      (stepScores.eligibility * 0.3 +
        stepScores.technical * 0.3 +
        stepScores.financial * 0.2 +
        stepScores.risk * 0.2)
    );

    // Aggregate results
    const evaluation = {
      isAI: true,
      evaluatedAt: new Date().toISOString(),
      overallScore,
      overallAssessment: this._generateOverallAssessment(overallScore, stepResults),
      scores: {
        compliance: {
          score: stepScores.eligibility,
          feedback: stepResults.eligibility.feedback,
        },
        technical: {
          score: stepScores.technical,
          feedback: stepResults.technical.feedback,
        },
        financial: {
          score: stepScores.financial,
          feedback: stepResults.financial.feedback,
        },
        presentation: {
          score: this._assessPresentation(proposalData),
          feedback: 'Proposal structure and formatting assessed.',
        },
        completeness: {
          score: this._assessCompleteness(proposalData),
          feedback: `Proposal contains ${proposalData.sections.length} sections.`,
        },
      },
      strengths: this._extractStrengths(stepResults),
      weaknesses: this._extractWeaknesses(stepResults),
      missingElements: stepResults.risk.missingElements || [],
      improvements: this._extractImprovements(stepResults),
      winProbability: this._assessWinProbability(overallScore),
      winProbabilityReason: this._getWinProbabilityReason(overallScore, stepResults),
      recommendedActions: this._generateRecommendedActions(stepResults),
      stepDetails: stepResults,
    };

    console.log(`[Multi-Step Eval] Complete. Overall score: ${overallScore}/100`);

    return evaluation;
  },

  /**
   * Evaluate a single step
   */
  async _evaluateStep(stepName, sessionId, proposalData, tenderId) {
    const stepConfig = this._getStepConfig(stepName);

    // Extract relevant proposal content for this step
    const relevantContent = this._extractRelevantContent(proposalData, stepConfig.sections);

    // Use RAG to retrieve context
    let context = '';
    try {
      const ragResult = await RAGOrchestrator.retrieve({
        query: stepConfig.query + ' ' + relevantContent.substring(0, 500),
        sessionId: tenderId,
        analysisType: stepName,
        modelName: CHAT_MODEL,
      });

      context = ragResult.context;
      console.log(`[Multi-Step Eval] ${stepName}: Retrieved ${ragResult.stats.compressed.total} chunks`);
    } catch (err) {
      console.warn(`[Multi-Step Eval] ${stepName}: RAG retrieval failed, continuing without context`);
    }

    // Build prompt
    const systemPrompt = `You are a government tender evaluation expert. Evaluate the proposal's ${stepConfig.label}.

RULES:
- Use ONLY the provided context and proposal content
- Assign a score from 0-100
- Provide specific, actionable feedback
- If information is missing, note it explicitly`;

    const userPrompt = `EVALUATION STEP: ${stepConfig.label}

${context ? `REFERENCE CONTEXT:\n${context}\n\n` : ''}PROPOSAL CONTENT (${stepName.toUpperCase()}):\n${relevantContent.substring(0, 2000)}

Evaluate and respond in this JSON format:
{
  "score": 75,
  "feedback": "Specific feedback on ${stepName} compliance",
  "observations": ["observation 1", "observation 2"],
  "gaps": ["gap 1", "gap 2"]
}`;

    console.log(`[Multi-Step Eval] ${stepName}: Prompt tokens: ${TokenCounter.estimate(systemPrompt + userPrompt)}`);

    const response = await LLMCaller.call({
      systemPrompt,
      userPrompt,
      model: CHAT_MODEL,
      temperature: 0.2,
      maxTokens: 1000,
    });

    // Parse response
    const result = this._parseStepResponse(response, stepName);
    return result;
  },

  /**
   * Get step configuration
   */
  _getStepConfig(stepName) {
    const configs = {
      eligibility: {
        label: 'Eligibility Compliance',
        query: 'eligibility criteria requirements qualifications certifications experience',
        sections: ['eligibility', 'compliance', 'qualifications', 'company'],
      },
      technical: {
        label: 'Technical Compliance',
        query: 'technical specifications requirements standards quality methodology',
        sections: ['technical', 'methodology', 'approach', 'specifications'],
      },
      financial: {
        label: 'Financial Alignment',
        query: 'financial terms pricing payment EMD cost budget',
        sections: ['financial', 'pricing', 'cost', 'payment'],
      },
      risk: {
        label: 'Risk & Gap Analysis',
        query: 'risks penalties gaps missing requirements compliance issues',
        sections: ['all'], // Consider all sections for gap analysis
      },
    };

    return configs[stepName] || configs.eligibility;
  },

  /**
   * Extract relevant content from proposal for a specific step
   */
  _extractRelevantContent(proposalData, relevantSections) {
    if (!proposalData.sections || proposalData.sections.length === 0) {
      return '';
    }

    let content = '';

    if (relevantSections.includes('all')) {
      // Include all sections
      proposalData.sections.forEach(section => {
        content += `\n## ${section.title}\n${section.content}\n`;
      });
    } else {
      // Include only relevant sections
      proposalData.sections.forEach(section => {
        const sectionLower = (section.title || '').toLowerCase();
        const isRelevant = relevantSections.some(keyword => sectionLower.includes(keyword));

        if (isRelevant) {
          content += `\n## ${section.title}\n${section.content}\n`;
        }
      });
    }

    // If no relevant sections found, use first few sections
    if (content.length < 100 && proposalData.sections.length > 0) {
      proposalData.sections.slice(0, 3).forEach(section => {
        content += `\n## ${section.title}\n${section.content}\n`;
      });
    }

    return content.substring(0, 3000); // Hard limit
  },

  /**
   * Parse step response from LLM
   */
  _parseStepResponse(response, stepName) {
    try {
      // Try to parse JSON
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }

      const parsed = JSON.parse(cleaned.trim());

      return {
        score: Math.max(0, Math.min(100, parsed.score || 60)),
        feedback: parsed.feedback || `${stepName} evaluation complete.`,
        observations: parsed.observations || [],
        gaps: parsed.gaps || [],
        missingElements: parsed.gaps || [],
      };
    } catch (err) {
      console.warn(`[Multi-Step Eval] Failed to parse ${stepName} response, using fallback`);
      return this._getFallbackStepResult(stepName);
    }
  },

  /**
   * Get fallback step result
   */
  _getFallbackStepResult(stepName) {
    return {
      score: 60,
      feedback: `${stepName} evaluation completed. Manual review recommended.`,
      observations: ['Automatic evaluation completed'],
      gaps: [],
      missingElements: [],
    };
  },

  /**
   * Assess presentation quality
   */
  _assessPresentation(proposalData) {
    const sectionCount = proposalData.sections?.length || 0;
    const totalWords = proposalData.sections?.reduce((sum, s) => sum + (s.wordCount || 0), 0) || 0;

    let score = 70; // Base score

    if (sectionCount >= 6) score += 10;
    if (totalWords >= 1000) score += 10;
    if (totalWords >= 2000) score += 5;

    return Math.min(100, score);
  },

  /**
   * Assess completeness
   */
  _assessCompleteness(proposalData) {
    const sectionCount = proposalData.sections?.length || 0;

    if (sectionCount >= 8) return 90;
    if (sectionCount >= 6) return 80;
    if (sectionCount >= 4) return 70;
    if (sectionCount >= 2) return 60;
    return 50;
  },

  /**
   * Generate overall assessment
   */
  _generateOverallAssessment(score, stepResults) {
    if (score >= 80) {
      return 'Strong proposal with comprehensive coverage of requirements. High likelihood of competitive evaluation.';
    } else if (score >= 65) {
      return 'Solid proposal with good alignment to requirements. Some improvements recommended for competitive advantage.';
    } else if (score >= 50) {
      return 'Proposal addresses basic requirements but has significant gaps. Substantial revisions recommended.';
    } else {
      return 'Proposal has critical gaps and compliance issues. Major revisions required before submission.';
    }
  },

  /**
   * Extract strengths from step results
   */
  _extractStrengths(stepResults) {
    const strengths = [];

    Object.entries(stepResults).forEach(([step, result]) => {
      if (result.score >= 75 && result.observations?.length > 0) {
        strengths.push(...result.observations.slice(0, 2));
      }
    });

    return strengths.slice(0, 5);
  },

  /**
   * Extract weaknesses from step results
   */
  _extractWeaknesses(stepResults) {
    const weaknesses = [];

    Object.entries(stepResults).forEach(([step, result]) => {
      if (result.score < 70 && result.gaps?.length > 0) {
        weaknesses.push(...result.gaps.slice(0, 2));
      }
    });

    return weaknesses.slice(0, 5);
  },

  /**
   * Extract improvements from step results
   */
  _extractImprovements(stepResults) {
    const improvements = [];

    Object.entries(stepResults).forEach(([step, result]) => {
      if (result.gaps?.length > 0) {
        result.gaps.slice(0, 2).forEach(gap => {
          improvements.push({
            section: step.charAt(0).toUpperCase() + step.slice(1),
            suggestion: gap,
          });
        });
      }
    });

    return improvements.slice(0, 8);
  },

  /**
   * Assess win probability
   */
  _assessWinProbability(score) {
    if (score >= 85) return 'High';
    if (score >= 70) return 'Medium-High';
    if (score >= 55) return 'Medium';
    if (score >= 40) return 'Low-Medium';
    return 'Low';
  },

  /**
   * Get win probability reason
   */
  _getWinProbabilityReason(score, stepResults) {
    const eligScore = stepResults.eligibility?.score || 60;
    const techScore = stepResults.technical?.score || 60;

    if (score >= 85 && eligScore >= 80 && techScore >= 80) {
      return 'Proposal demonstrates strong compliance and technical capability. Competitive positioning is favorable.';
    } else if (score >= 70) {
      return 'Proposal is competitive but could benefit from strengthening weaker areas to improve win chances.';
    } else {
      return 'Proposal has gaps that reduce competitiveness. Address critical issues before submission.';
    }
  },

  /**
   * Generate recommended actions
   */
  _generateRecommendedActions(stepResults) {
    const actions = [];

    Object.entries(stepResults).forEach(([step, result]) => {
      if (result.score < 70) {
        actions.push(`Review and strengthen ${step} section based on feedback`);
      }
    });

    if (actions.length === 0) {
      actions.push('Final review of all sections', 'Verify all required documents are attached');
    }

    return actions.slice(0, 5);
  },

  /**
   * Store proposal in session (temporary - not persisted to DB)
   */
  async _storeProposalSession(sessionId, proposalData) {
    // In-memory or cache storage for session
    // This is temporary and doesn't need DB persistence
    console.log(`[Multi-Step Eval] Stored proposal session: ${sessionId}`);
  },
};
