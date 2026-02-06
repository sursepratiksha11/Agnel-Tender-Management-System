import React from 'react';
import {
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  FileText,
  ArrowRight
} from 'lucide-react';

export default function InsightsTab({ aiInsights, tenderSummary }) {
  // Use tender summary if available, otherwise fall back to aiInsights
  const summary = tenderSummary?.data || null;

  if (!aiInsights && !summary) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600">Analyzing tender...</p>
      </div>
    );
  }

  // If we have the new summary format, show enhanced view
  if (summary) {
    const urgencyColors = {
      CRITICAL: 'bg-red-100 text-red-700 border-red-200',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      LOW: 'bg-green-100 text-green-700 border-green-200'
    };

    const competitionColors = {
      HIGH: 'text-red-600',
      MEDIUM: 'text-orange-600',
      LOW: 'text-green-600'
    };

    return (
      <div className="space-y-6">
        {/* Executive Summary */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Executive Summary
          </h3>
          <p className="text-slate-700 leading-relaxed">{summary.executiveSummary}</p>
          {summary.isAIEnhanced && (
            <span className="inline-block mt-3 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              AI Enhanced
            </span>
          )}
        </div>

        {/* Opportunity Score & Urgency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Opportunity Score
              </h3>
              <div className="text-3xl font-bold text-blue-600">{summary.opportunityScore}%</div>
            </div>
            <div className="w-full bg-white rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  summary.opportunityScore >= 75 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  summary.opportunityScore >= 50 ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                  'bg-gradient-to-r from-orange-500 to-red-500'
                }`}
                style={{ width: `${summary.opportunityScore}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 mt-2">
              {summary.opportunityScore >= 75 ? 'Strong opportunity - consider bidding' :
               summary.opportunityScore >= 50 ? 'Moderate opportunity - review carefully' :
               'Challenging opportunity - assess resources'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Deadline Status
            </h3>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${urgencyColors[summary.urgency]}`}>
                {summary.urgency}
              </span>
              <span className="text-slate-600">
                {summary.metrics.daysRemaining !== null
                  ? `${summary.metrics.daysRemaining} days remaining`
                  : 'No deadline set'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <TrendingUp className={`w-4 h-4 ${competitionColors[summary.competitionLevel]}`} />
              <span className={competitionColors[summary.competitionLevel]}>
                {summary.competitionLevel} Competition ({summary.metrics.proposalCount} bidders)
              </span>
            </div>
          </div>
        </div>

        {/* Key Requirements */}
        {summary.keyRequirements && summary.keyRequirements.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Key Requirements
            </h3>
            <div className="space-y-2">
              {summary.keyRequirements.map((req, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <ArrowRight className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-900">{req}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors */}
        {summary.riskFactors && summary.riskFactors.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Risk Factors
            </h3>
            <div className="space-y-2">
              {summary.riskFactors.map((risk, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-900">{risk}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {summary.recommendedActions && summary.recommendedActions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              Recommended Actions
            </h3>
            <div className="space-y-2">
              {summary.recommendedActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-blue-900">{action}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500">Sections</div>
            <div className="text-lg font-bold text-slate-900">{summary.metrics.sectionCount}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500">Mandatory</div>
            <div className="text-lg font-bold text-red-600">{summary.metrics.mandatorySections}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500">Words</div>
            <div className="text-lg font-bold text-slate-900">{summary.metrics.wordCount?.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500">Value</div>
            <div className="text-lg font-bold text-green-600">{summary.metrics.formattedValue}</div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to old format if no summary available
  return (
    <div className="space-y-6">
      {/* Match Score */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Your Match Score</h3>
          <div className="text-4xl font-bold text-blue-600">{aiInsights.matchScore || 75}%</div>
        </div>
        <div className="w-full bg-white rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            style={{ width: `${aiInsights.matchScore || 75}%` }}
          />
        </div>
        <p className="text-sm text-slate-600 mt-2">
          {aiInsights.matchScore >= 75 ? 'Strong match - consider bidding' :
           aiInsights.matchScore >= 50 ? 'Moderate match - review requirements' :
           'Review requirements carefully'}
        </p>
      </div>

      {/* Strengths */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Your Strengths
        </h3>
        <div className="space-y-3">
          {(aiInsights.strengths || []).map((strength, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-900">{strength}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Concerns */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          Areas of Concern
        </h3>
        <div className="space-y-3">
          {(aiInsights.concerns || []).map((concern, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-900">{concern}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-600" />
          AI Recommendations
        </h3>
        <div className="space-y-3">
          {(aiInsights.recommendations || []).map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
