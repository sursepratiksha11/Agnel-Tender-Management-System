/**
 * Risk Score Card Component
 * Displays risk assessment for a proposal with visual score indicator
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  FileText,
  Loader,
  RefreshCw
} from 'lucide-react';
import { insightsService } from '../../services/bidder/insightsService';

// Risk level configurations
const riskLevelConfig = {
  CRITICAL: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    progressColor: 'bg-red-500',
    icon: AlertTriangle,
    label: 'Critical Risk'
  },
  HIGH: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    progressColor: 'bg-orange-500',
    icon: AlertTriangle,
    label: 'High Risk'
  },
  MEDIUM: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    progressColor: 'bg-yellow-500',
    icon: AlertCircle,
    label: 'Medium Risk'
  },
  LOW: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    progressColor: 'bg-blue-500',
    icon: CheckCircle,
    label: 'Low Risk'
  },
  MINIMAL: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    progressColor: 'bg-green-500',
    icon: CheckCircle,
    label: 'Minimal Risk'
  }
};

// Factor category icons
const categoryIcons = {
  MISSING_MANDATORY_SECTIONS: FileText,
  INCOMPLETE_SECTIONS: FileText,
  DEADLINE_PASSED: Clock,
  DEADLINE_CRITICAL: Clock,
  DEADLINE_APPROACHING: Clock,
  DEADLINE_NEAR: Clock,
  CONTENT_QUALITY: AlertCircle,
  COMPLIANCE: Shield,
  STALE_DRAFT: Clock
};

export default function RiskScoreCard({ proposalId, compact = false, onRefresh }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(!compact);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRiskAssessment = async (isRefresh = false) => {
    if (!proposalId) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await insightsService.getProposalRisk(proposalId);
      setAssessment(response.data);
      setError(null);
      if (onRefresh) onRefresh(response.data);
    } catch (err) {
      console.error('[RiskScoreCard] Error:', err);
      setError('Failed to load risk assessment');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRiskAssessment();
  }, [proposalId]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-center py-4">
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-600">Analyzing risk...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center py-2">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
          <p className="text-sm text-slate-600">{error}</p>
          <button
            onClick={() => fetchRiskAssessment()}
            className="mt-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  const config = riskLevelConfig[assessment.riskLevel] || riskLevelConfig.MEDIUM;
  const IconComponent = config.icon;

  return (
    <div className={`bg-white rounded-xl border ${config.borderColor} ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <IconComponent className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Risk Assessment</h3>
            {!compact && (
              <p className="text-xs text-slate-500">AI-powered analysis</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRiskAssessment(true)}
            disabled={refreshing}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {compact && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Risk Score Gauge */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
          <span className={`text-2xl font-bold ${config.color}`}>{assessment.riskPercentage}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${config.progressColor}`}
            style={{ width: `${Math.min(100, assessment.riskPercentage)}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      <p className={`text-sm ${config.color} ${config.bgColor} rounded-lg p-3 mb-4`}>
        {assessment.summary}
      </p>

      {/* Completion Metrics (always visible) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Mandatory Sections</p>
          <p className="text-lg font-semibold text-slate-900">
            {assessment.completionMetrics.completedMandatory}/{assessment.completionMetrics.mandatorySections}
          </p>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
            <div
              className="h-1.5 rounded-full bg-blue-500"
              style={{ width: `${assessment.completionMetrics.mandatoryCompletionRate}%` }}
            />
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Total Words</p>
          <p className="text-lg font-semibold text-slate-900">
            {assessment.completionMetrics.totalWordCount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <>
          {/* Risk Factors */}
          {assessment.riskFactors && assessment.riskFactors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Risk Factors</h4>
              <div className="space-y-2">
                {assessment.riskFactors.map((factor, index) => {
                  const FactorIcon = categoryIcons[factor.category] || AlertCircle;
                  const factorConfig = riskLevelConfig[factor.severity] || riskLevelConfig.MEDIUM;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${factorConfig.borderColor} ${factorConfig.bgColor}`}
                    >
                      <div className="flex items-start gap-2">
                        <FactorIcon className={`w-4 h-4 mt-0.5 ${factorConfig.color}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${factorConfig.color}`}>
                              {factor.severity}
                            </span>
                            <span className="text-xs text-slate-500">
                              {factor.score}/{factor.maxScore} pts
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-1">{factor.description}</p>
                          {factor.recommendation && (
                            <p className="text-xs text-slate-600 mt-1 italic">
                              → {factor.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prioritized Recommendations */}
          {assessment.prioritizedRecommendations && assessment.prioritizedRecommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Recommended Actions</h4>
              <ol className="space-y-2">
                {assessment.prioritizedRecommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      rec.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                      rec.priority === 'HIGH' ? 'bg-orange-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-slate-700">{rec.action}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {/* Assessed timestamp */}
      <p className="text-xs text-slate-400 mt-4 text-right">
        Assessed {new Date(assessment.assessedAt).toLocaleString()}
      </p>
    </div>
  );
}
