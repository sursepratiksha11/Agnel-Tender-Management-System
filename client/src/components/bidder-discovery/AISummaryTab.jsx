import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  TrendingUp,
  Award,
  Shield,
  DollarSign,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Sparkles,
  ClipboardList,
  AlertCircle,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { aiService } from '../../services/bidder/aiService';

export default function AISummaryTab({ tenderId, basicSummary }) {
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState(['critical', 'eligibility']);

  useEffect(() => {
    if (tenderId) {
      fetchAISummary();
    }
  }, [tenderId]);

  const fetchAISummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await aiService.getComprehensiveSummary(tenderId);
      if (response.data?.data) {
        setAiSummary(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching AI summary:', err);
      setError('Failed to generate AI summary. Using basic analysis.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-900">Generating AI Summary</h3>
            <p className="text-sm text-slate-500 mt-1">Analyzing tender content with AI...</p>
          </div>
        </div>
      </div>
    );
  }

  // Use AI summary if available, otherwise fall back to basic
  const summary = aiSummary || basicSummary?.data;

  if (error && !summary) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchAISummary}
          className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
        <p className="text-slate-500">No summary available</p>
      </div>
    );
  }

  const urgencyColors = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-300',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    LOW: 'bg-green-100 text-green-700 border-green-300',
    UNKNOWN: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  const competitionColors = {
    HIGH: 'text-red-600 bg-red-50',
    MEDIUM: 'text-orange-600 bg-orange-50',
    LOW: 'text-green-600 bg-green-50',
  };

  const metrics = summary.metrics || {};
  const bulletPoints = summary.bulletPoints || {};
  const opportunityAssessment = summary.opportunityAssessment || {};

  // Bullet point sections configuration
  const bulletSections = [
    {
      id: 'critical',
      title: 'Critical Requirements',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      items: bulletPoints.criticalRequirements || summary.keyRequirements || [],
    },
    {
      id: 'eligibility',
      title: 'Eligibility Criteria',
      icon: Award,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      items: bulletPoints.eligibilityCriteria || [],
    },
    {
      id: 'technical',
      title: 'Technical Specifications',
      icon: ClipboardList,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      items: bulletPoints.technicalSpecifications || [],
    },
    {
      id: 'financial',
      title: 'Financial Terms',
      icon: DollarSign,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      items: bulletPoints.financialTerms || [],
    },
    {
      id: 'compliance',
      title: 'Compliance Requirements',
      icon: Shield,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      items: bulletPoints.complianceRequirements || [],
    },
    {
      id: 'deadlines',
      title: 'Deadlines & Timelines',
      icon: Calendar,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      items: bulletPoints.deadlinesAndTimelines || [],
    },
    {
      id: 'risks',
      title: 'Risk Factors',
      icon: AlertCircle,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      items: bulletPoints.riskFactors || summary.riskFactors || [],
    },
  ];

  return (
    <div className="space-y-6">
      {/* AI Generated Badge */}
      {summary.isAIGenerated && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Sparkles className="w-4 h-4" />
          <span>AI-Generated Summary</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">{new Date(summary.generatedAt).toLocaleString()}</span>
        </div>
      )}

      {/* Executive Summary */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Executive Summary
        </h3>
        <p className="text-slate-700 leading-relaxed text-base">
          {summary.executiveSummary}
        </p>
      </div>

      {/* Opportunity Score & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opportunity Score Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Opportunity Score
            </h3>
            <div className="text-4xl font-bold text-blue-600">
              {opportunityAssessment.score || metrics.opportunityScore || summary.opportunityScore || 70}%
            </div>
          </div>
          <div className="w-full bg-white rounded-full h-4 overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                (opportunityAssessment.score || summary.opportunityScore || 70) >= 75
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : (opportunityAssessment.score || summary.opportunityScore || 70) >= 50
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                  : 'bg-gradient-to-r from-orange-500 to-red-500'
              }`}
              style={{ width: `${opportunityAssessment.score || summary.opportunityScore || 70}%` }}
            />
          </div>
          <p className="text-sm text-slate-600">
            {opportunityAssessment.recommendation ||
              (summary.opportunityScore >= 75 ? 'Strong opportunity - highly recommended' :
               summary.opportunityScore >= 50 ? 'Good opportunity - proceed with preparation' :
               'Evaluate carefully before proceeding')}
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Status Overview
          </h3>

          <div className="space-y-3">
            {/* Urgency */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Urgency</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                urgencyColors[metrics.urgencyLevel || opportunityAssessment.urgencyLevel || summary.urgency || 'MEDIUM']
              }`}>
                {metrics.urgencyLevel || opportunityAssessment.urgencyLevel || summary.urgency || 'MEDIUM'}
              </span>
            </div>

            {/* Days Remaining */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Days Remaining</span>
              <span className="font-semibold text-slate-900">
                {metrics.daysRemaining !== null && metrics.daysRemaining !== undefined
                  ? `${metrics.daysRemaining} days`
                  : 'Not specified'}
              </span>
            </div>

            {/* Competition */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Competition</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${
                competitionColors[metrics.competitionLevel || opportunityAssessment.competitionLevel || summary.competitionLevel || 'MEDIUM']
              }`}>
                <Users className="w-3 h-3" />
                {metrics.competitionLevel || opportunityAssessment.competitionLevel || summary.competitionLevel || 'MEDIUM'}
                <span className="text-xs">({metrics.proposalCount || 0} bidders)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-xs text-slate-500 mb-1">Sections</div>
          <div className="text-2xl font-bold text-slate-900">{metrics.sectionCount || 0}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-xs text-slate-500 mb-1">Mandatory</div>
          <div className="text-2xl font-bold text-red-600">{metrics.mandatorySections || 0}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-xs text-slate-500 mb-1">Words</div>
          <div className="text-2xl font-bold text-blue-600">{(metrics.wordCount || 0).toLocaleString()}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-xs text-slate-500 mb-1">Est. Value</div>
          <div className="text-xl font-bold text-green-600">{metrics.formattedValue || 'N/A'}</div>
        </div>
      </div>

      {/* Bullet Point Sections */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-600" />
          Detailed Analysis
        </h3>

        {bulletSections.map((section) => {
          if (!section.items || section.items.length === 0) return null;

          const isExpanded = expandedSections.includes(section.id);
          const Icon = section.icon;

          return (
            <div key={section.id} className={`rounded-xl border ${section.borderColor} overflow-hidden`}>
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full px-5 py-4 flex items-center justify-between ${section.bgColor} hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${section.iconColor}`} />
                  <span className="font-semibold text-slate-900">{section.title}</span>
                  <span className="text-xs px-2 py-0.5 bg-white rounded-full text-slate-600">
                    {section.items.length} items
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="bg-white p-4">
                  <ul className="space-y-2">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <ArrowRight className={`w-4 h-4 ${section.iconColor} flex-shrink-0 mt-0.5`} />
                        <span className="text-sm text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Section Summaries */}
      {summary.sectionSummaries && summary.sectionSummaries.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-slate-600" />
            Section-by-Section Analysis
          </h3>

          <div className="space-y-3">
            {summary.sectionSummaries.map((section, idx) => (
              <div
                key={section.sectionId || idx}
                className="bg-white rounded-lg border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    {section.sectionTitle}
                    {section.isMandatory && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                        Mandatory
                      </span>
                    )}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    section.complexity === 'Low' ? 'bg-green-100 text-green-700' :
                    section.complexity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    section.complexity === 'High' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {section.complexity} Complexity
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3">{section.summary}</p>

                {section.keyPoints && section.keyPoints.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-slate-500">Key Points:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {section.keyPoints.slice(0, 3).map((point, pidx) => (
                        <span
                          key={pidx}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded"
                        >
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {(summary.actionItems || summary.recommendedActions) && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-green-600" />
            Recommended Actions
          </h3>
          <div className="space-y-3">
            {(summary.actionItems || summary.recommendedActions || []).map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-100"
              >
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-sm text-slate-700">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={fetchAISummary}
          disabled={loading}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Regenerate Summary
        </button>
      </div>
    </div>
  );
}
