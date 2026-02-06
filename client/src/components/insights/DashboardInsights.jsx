/**
 * Dashboard Insights Component
 * Displays actionable insights, risk alerts, and compliance status
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  Calendar,
  Shield,
  FileText,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { insightsService } from '../../services/bidder/insightsService';

// Severity color mapping
const severityColors = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-blue-100 text-blue-800 border-blue-200',
  INFO: 'bg-slate-100 text-slate-800 border-slate-200'
};

const severityIcons = {
  CRITICAL: XCircle,
  HIGH: AlertTriangle,
  MEDIUM: AlertCircle,
  LOW: Clock,
  INFO: CheckCircle
};

// Icon mapping for insight types
const insightIcons = {
  HIGH_RISK: AlertTriangle,
  OVERDUE: Clock,
  DUE_SOON: Calendar,
  COMPLIANCE: Shield,
  INCOMPLETE: FileText,
  DEFAULT: TrendingUp
};

export default function DashboardInsights({ onNavigate }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await insightsService.getDashboardInsights();
      setInsights(response.data);
      setError(null);
    } catch (err) {
      console.error('[DashboardInsights] Error:', err);
      setError('Failed to load insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-slate-600">Loading insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-slate-600">{error}</p>
          <button
            onClick={() => fetchInsights()}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const { overview, actionableInsights, risk, compliance, news } = insights;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Actionable Insights</h2>
          <p className="text-sm text-slate-600">AI-powered recommendations for your proposals</p>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Active Drafts</p>
          <p className="text-2xl font-bold text-slate-900">{overview.totalDrafts}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Due This Week</p>
          <p className={`text-2xl font-bold ${overview.dueThisWeek > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
            {overview.dueThisWeek}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600">High Risk</p>
          <p className={`text-2xl font-bold ${risk.highRiskCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {risk.highRiskCount}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Compliance Issues</p>
          <p className={`text-2xl font-bold ${compliance.criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {compliance.criticalCount}
          </p>
        </div>
      </div>

      {/* Actionable Insights Cards */}
      {actionableInsights && actionableInsights.length > 0 ? (
        <div className="space-y-3">
          {actionableInsights.map((insight, index) => {
            const IconComponent = insightIcons[insight.type] || insightIcons.DEFAULT;
            const SeverityIcon = severityIcons[insight.severity] || AlertCircle;

            return (
              <div
                key={index}
                className={`bg-white rounded-xl border p-4 ${severityColors[insight.severity]} transition hover:shadow-md`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    insight.severity === 'CRITICAL' ? 'bg-red-200' :
                    insight.severity === 'HIGH' ? 'bg-orange-200' :
                    'bg-yellow-200'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        insight.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                        insight.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                        'bg-yellow-600 text-white'
                      }`}>
                        {insight.severity}
                      </span>
                      <h3 className="font-semibold">{insight.title}</h3>
                      {insight.count > 0 && (
                        <span className="text-sm opacity-75">({insight.count})</span>
                      )}
                    </div>
                    <p className="text-sm opacity-90 mb-2">{insight.description}</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <ChevronRight className="w-4 h-4" />
                      {insight.action}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800">All Clear!</h3>
          <p className="text-green-700">No immediate action items. Your proposals are on track.</p>
        </div>
      )}

      {/* Risk Overview */}
      {risk.proposals && risk.proposals.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Proposals Needing Attention
          </h3>
          <div className="space-y-3">
            {risk.proposals.slice(0, 3).map((proposal) => (
              <div
                key={proposal.proposalId}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                onClick={() => onNavigate && onNavigate(`/bidder/proposal/${proposal.tenderId}`)}
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 truncate">{proposal.tenderTitle}</p>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span>Risk: {proposal.riskLevel}</span>
                    <span>Completion: {proposal.mandatoryCompletion}%</span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  proposal.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                  proposal.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                  proposal.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {proposal.riskScore}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News Highlights */}
      {news && news.highlights && news.highlights.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Regulatory Updates
            {news.usingFallback && (
              <span className="text-xs text-slate-400 font-normal">(Demo data)</span>
            )}
          </h3>
          <div className="space-y-3">
            {news.highlights.map((item) => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-slate-50 rounded-lg hover:bg-blue-50 transition"
              >
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    item.category === 'REGULATORY' ? 'bg-purple-100 text-purple-700' :
                    item.category === 'COMPLIANCE' ? 'bg-blue-100 text-blue-700' :
                    item.category === 'DEADLINE' ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {item.category}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.source}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
