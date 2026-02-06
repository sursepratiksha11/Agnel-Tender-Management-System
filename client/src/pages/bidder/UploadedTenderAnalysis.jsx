import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  RefreshCw,
  Copy,
  Star,
  Target,
  Clock,
  DollarSign,
  Shield,
  Zap,
  BarChart3,
  FileCheck,
  ArrowLeft,
  Sparkles,
  Loader2,
  Check,
  X,
  Upload,
  Trash2,
} from 'lucide-react';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import { pdfAnalysisService } from '../../services/bidder/pdfAnalysisService';
import api from '../../services/bidder/api';

// Tab components
const TabButton = ({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
      active
        ? 'text-purple-600 border-purple-600 bg-purple-50'
        : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    {Icon && <Icon className="w-4 h-4" />}
    {children}
  </button>
);

// Score badge
const ScoreBadge = ({ score, size = 'md' }) => {
  const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : score >= 40 ? 'orange' : 'red';
  const sizes = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  };

  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold bg-${color}-100 text-${color}-700 border-2 border-${color}-300`}>
      {score}
    </div>
  );
};

// Bullet list component
const BulletList = ({ items, icon: Icon = CheckCircle, color = 'purple' }) => (
  <ul className="space-y-2">
    {items.map((item, idx) => (
      <li key={idx} className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-1 flex-shrink-0 text-${color}-500`} />
        <span className="text-slate-700">{item}</span>
      </li>
    ))}
  </ul>
);

export default function UploadedTenderAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();

  // States
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tender, setTender] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [proposalSections, setProposalSections] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [regeneratingSection, setRegeneratingSection] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch uploaded tender data
  useEffect(() => {
    fetchTenderData();
  }, [id]);

  const fetchTenderData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/bidder/uploaded-tenders/${id}`);

      if (response.data.success) {
        const tenderData = response.data.data;
        setTender(tenderData);

        // Reconstruct analysis object from stored data
        const analysisData = {
          parsed: tenderData.parsedData,
          summary: tenderData.analysisData?.summary,
          proposalDraft: tenderData.analysisData?.proposalDraft,
        };
        setAnalysis(analysisData);
        setProposalSections(tenderData.analysisData?.proposalDraft?.sections || []);
      } else {
        throw new Error('Failed to load tender');
      }
    } catch (err) {
      console.error('Error fetching uploaded tender:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load tender');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!analysis || proposalSections.length === 0) return;

    setEvaluating(true);
    setError(null);

    try {
      const sessionId = analysis?.analysisId || tender?.analysisId || tender?.id || id || `session-${Date.now()}`;
      const result = await pdfAnalysisService.evaluateProposal(
        sessionId,
        { sections: proposalSections },
        tender?.id || null
      );

      if (result.success) {
        setEvaluation(result.data);
        setActiveTab('evaluation');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Evaluation error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to evaluate proposal');
    } finally {
      setEvaluating(false);
    }
  };

  const handleSectionEdit = (sectionId, newContent) => {
    setProposalSections(prev =>
      prev.map(s =>
        s.id === sectionId
          ? { ...s, content: newContent, wordCount: newContent.split(/\s+/).filter(w => w).length }
          : s
      )
    );
    setEditingSection(null);
  };

  const handleRegenerateSection = async (section) => {
    setRegeneratingSection(section.id);

    try {
      const result = await pdfAnalysisService.regenerateSection({
        sectionId: section.id,
        sectionTitle: section.title,
        tenderContext: tender?.title || '',
        currentContent: section.content,
        instructions: 'Improve and make more detailed and professional',
      });

      if (result.success) {
        handleSectionEdit(section.id, result.data.content);
      }
    } catch (err) {
      console.error('Regenerate error:', err);
      setError('Failed to regenerate section');
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this tender? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/bidder/uploaded-tenders/${id}`);
      navigate('/bidder/tenders');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete tender');
      setDeleting(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Loading state
  if (loading) {
    return (
      <BidderLayout>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading tender analysis...</p>
          </div>
        </div>
      </BidderLayout>
    );
  }

  // Error state
  if (error && !tender) {
    return (
      <BidderLayout>
        <div className="min-h-screen bg-slate-50 py-8">
          <div className="max-w-3xl mx-auto px-4">
            <button
              onClick={() => navigate('/bidder/tenders')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Discover
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Tender</h2>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                onClick={() => navigate('/bidder/tenders')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Return to Discovery
              </button>
            </div>
          </div>
        </div>
      </BidderLayout>
    );
  }

  const summary = analysis?.summary;

  return (
    <BidderLayout>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-start justify-between">
              <div>
                <button
                  onClick={() => navigate('/bidder/tenders')}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Discover
                </button>
                <div className="flex items-center gap-3 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                    <Upload className="w-3 h-3" />
                    Uploaded Tender
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 line-clamp-1">
                  {tender?.title || 'Tender Analysis'}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {tender?.wordCount?.toLocaleString() || analysis?.parsed?.stats?.totalWords?.toLocaleString()} words
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Uploaded {tender?.createdAt ? new Date(tender.createdAt).toLocaleDateString() : ''}
                  </span>
                  {tender?.estimatedValue && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ₹{(tender.estimatedValue / 100000).toFixed(1)}L
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete tender"
                >
                  {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Opportunity Score</p>
                  <ScoreBadge score={tender?.opportunityScore || summary?.opportunityScore || 70} size="sm" />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 border-b border-slate-200 -mb-px">
              <TabButton
                active={activeTab === 'summary'}
                onClick={() => setActiveTab('summary')}
                icon={FileCheck}
              >
                Summary
              </TabButton>
              <TabButton
                active={activeTab === 'proposal'}
                onClick={() => setActiveTab('proposal')}
                icon={Edit3}
              >
                Proposal Draft
              </TabButton>
              <TabButton
                active={activeTab === 'evaluation'}
                onClick={() => setActiveTab('evaluation')}
                icon={BarChart3}
              >
                Evaluation
              </TabButton>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && summary && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Executive Summary
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  {summary.executiveSummary}
                </p>
              </div>

              {/* Key Points Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Critical Requirements */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-red-500" />
                    Critical Requirements
                  </h3>
                  <BulletList
                    items={summary.bulletPoints?.criticalRequirements || []}
                    icon={AlertCircle}
                    color="red"
                  />
                </div>

                {/* Eligibility */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    Eligibility Criteria
                  </h3>
                  <BulletList
                    items={summary.bulletPoints?.eligibilityCriteria || []}
                    icon={CheckCircle}
                    color="green"
                  />
                </div>

                {/* Technical */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    Technical Specifications
                  </h3>
                  <BulletList
                    items={summary.bulletPoints?.technicalSpecifications || []}
                    icon={CheckCircle}
                    color="purple"
                  />
                </div>

                {/* Financial */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                    Financial Terms
                  </h3>
                  <BulletList
                    items={summary.bulletPoints?.financialTerms || []}
                    icon={CheckCircle}
                    color="yellow"
                  />
                </div>

                {/* Deadlines */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Deadlines & Timelines
                  </h3>
                  <BulletList
                    items={summary.bulletPoints?.deadlinesAndTimelines || []}
                    icon={Clock}
                    color="orange"
                  />
                </div>

                {/* Risk Factors */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Risk Factors
                  </h3>
                  <BulletList
                    items={summary.bulletPoints?.riskFactors || []}
                    icon={AlertCircle}
                    color="red"
                  />
                </div>
              </div>

              {/* Action Items */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-600" />
                  Recommended Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(summary.actionItems || []).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-purple-100">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-sm flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Proposal Draft Tab */}
          {activeTab === 'proposal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Proposal Draft</h2>
                  <p className="text-slate-600 text-sm">
                    Edit each section to customize your proposal. Use AI to regenerate sections.
                  </p>
                </div>
                <button
                  onClick={handleEvaluate}
                  disabled={evaluating}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-medium rounded-lg flex items-center gap-2"
                >
                  {evaluating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BarChart3 className="w-4 h-4" />
                  )}
                  Evaluate Proposal
                </button>
              </div>

              {proposalSections.map((section) => (
                <div
                  key={section.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-medium">
                        {section.order}
                      </span>
                      <div>
                        <h3 className="font-medium text-slate-900">{section.title}</h3>
                        <p className="text-sm text-slate-500">{section.wordCount} words</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(section.content);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                        title="Copy content"
                      >
                        <Copy className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateSection(section);
                        }}
                        disabled={regeneratingSection === section.id}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                        title="Regenerate with AI"
                      >
                        {regeneratingSection === section.id ? (
                          <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                      {expandedSections[section.id] ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {expandedSections[section.id] && (
                    <div className="border-t border-slate-200 p-4">
                      {editingSection === section.id ? (
                        <div>
                          <textarea
                            className="w-full h-64 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                            defaultValue={section.content}
                            id={`edit-${section.id}`}
                          />
                          <div className="flex justify-end gap-2 mt-3">
                            <button
                              onClick={() => setEditingSection(null)}
                              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                const textarea = document.getElementById(`edit-${section.id}`);
                                handleSectionEdit(section.id, textarea.value);
                              }}
                              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                            {section.content}
                          </div>
                          <button
                            onClick={() => setEditingSection(section.id)}
                            className="mt-4 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit Section
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Evaluation Tab */}
          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              {!evaluation ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Evaluation Yet</h3>
                  <p className="text-slate-600 mb-6">
                    Edit your proposal draft, then run an evaluation to see how it scores against the tender requirements.
                  </p>
                  <button
                    onClick={handleEvaluate}
                    disabled={evaluating}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-medium rounded-lg flex items-center gap-2 mx-auto"
                  >
                    {evaluating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <BarChart3 className="w-5 h-5" />
                    )}
                    Evaluate My Proposal
                  </button>
                </div>
              ) : (
                <>
                  {/* Overall Score */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-6">
                      <ScoreBadge score={evaluation.overallScore} size="lg" />
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">Overall Assessment</h2>
                        <p className="text-slate-700">{evaluation.overallAssessment}</p>
                        <div className="mt-3 flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            evaluation.winProbability === 'High' ? 'bg-green-100 text-green-700' :
                            evaluation.winProbability === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            Win Probability: {evaluation.winProbability}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Object.entries(evaluation.scores || {}).map(([key, value]) => (
                      <div key={key} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                        <ScoreBadge score={value.score} size="sm" />
                        <h4 className="font-medium text-slate-900 mt-2 capitalize">{key}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{value.feedback}</p>
                      </div>
                    ))}
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Strengths
                      </h3>
                      <BulletList items={evaluation.strengths || []} icon={Check} color="green" />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Areas for Improvement
                      </h3>
                      <BulletList items={evaluation.weaknesses || []} icon={X} color="red" />
                    </div>
                  </div>

                  {/* Improvements */}
                  {evaluation.improvements && evaluation.improvements.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h3 className="font-semibold text-slate-900 mb-4">Specific Improvements</h3>
                      <div className="space-y-3">
                        {evaluation.improvements.map((imp, idx) => (
                          <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <p className="font-medium text-purple-900">{imp.section}</p>
                            <p className="text-purple-700 text-sm mt-1">{imp.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-green-600" />
                      Recommended Next Steps
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(evaluation.recommendedActions || []).map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-green-100">
                          <span className="w-6 h-6 rounded-full bg-green-600 text-white text-sm flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-slate-700">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Re-evaluate button */}
                  <div className="text-center">
                    <button
                      onClick={handleEvaluate}
                      disabled={evaluating}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-medium rounded-lg inline-flex items-center gap-2"
                    >
                      {evaluating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-5 h-5" />
                      )}
                      Re-evaluate After Edits
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </BidderLayout>
  );
}
