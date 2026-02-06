/**
 * Validation Results Panel
 * Displays proposal validation results against tender requirements
 * Shows: overall score, per-section status, gaps, and suggestions
 */

import React, { useState, useCallback } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Shield,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  FileText,
  AlertCircle,
  Lightbulb,
  Target,
} from 'lucide-react';
import { useCollaboration } from '../../context/CollaborationContext';

export default function ValidationResultsPanel({
  className = '',
  onSectionClick,
}) {
  const { validateProposal, isOwner } = useCollaboration();

  // State
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // Run validation
  const handleValidate = useCallback(async () => {
    setValidating(true);
    setError(null);

    try {
      const validationResults = await validateProposal();
      setResults(validationResults);

      // Auto-expand sections with issues
      const sectionsToExpand = {};
      validationResults.sections?.forEach((section) => {
        if (section.status !== 'COMPLETE' || section.gaps?.length > 0) {
          sectionsToExpand[section.sectionId] = true;
        }
      });
      setExpandedSections(sectionsToExpand);
    } catch (err) {
      console.error('Validation error:', err);
      setError(err.response?.data?.error || 'Failed to validate proposal');
    } finally {
      setValidating(false);
    }
  }, [validateProposal]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get score background
  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETE':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PARTIAL':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'INCOMPLETE':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETE':
        return 'Complete';
      case 'PARTIAL':
        return 'Partially Complete';
      case 'INCOMPLETE':
        return 'Incomplete';
      default:
        return 'Unknown';
    }
  };

  // Only owners can validate
  if (!isOwner) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Proposal Validation</h3>
              <p className="text-sm text-slate-500">
                Check your proposal against tender requirements
              </p>
            </div>
          </div>

          <button
            onClick={handleValidate}
            disabled={validating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            {validating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : results ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Re-validate
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Validate Proposal
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Validation Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* No results yet */}
        {!results && !validating && !error && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">No validation results yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Click "Validate Proposal" to check requirements coverage
            </p>
          </div>
        )}

        {/* Loading */}
        {validating && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Analyzing your proposal...</p>
            <p className="text-sm text-slate-500 mt-1">
              Checking against tender requirements
            </p>
          </div>
        )}

        {/* Results */}
        {results && !validating && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${getScoreBg(
                    results.score
                  )}`}
                >
                  <span className={`text-2xl font-bold ${getScoreColor(results.score)}`}>
                    {results.score}%
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Overall Score</p>
                  <p className="text-sm text-slate-600">
                    {results.isValid ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Proposal meets requirements
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <AlertTriangle className="w-4 h-4" />
                        Some requirements need attention
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {results.sections?.filter((s) => s.status === 'COMPLETE').length || 0}
                  </p>
                  <p className="text-xs text-slate-500">Complete</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {results.sections?.filter((s) => s.status === 'PARTIAL').length || 0}
                  </p>
                  <p className="text-xs text-slate-500">Partial</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {results.sections?.filter((s) => s.status === 'INCOMPLETE').length || 0}
                  </p>
                  <p className="text-xs text-slate-500">Incomplete</p>
                </div>
              </div>
            </div>

            {/* Section Results */}
            <div>
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Section Analysis
              </h4>

              <div className="space-y-2">
                {results.sections?.map((section) => (
                  <div
                    key={section.sectionId}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.sectionId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(section.status)}
                        <div className="text-left">
                          <p className="font-medium text-slate-900">
                            {section.sectionTitle || section.sectionId}
                          </p>
                          <p className="text-sm text-slate-500">
                            {getStatusText(section.status)}
                            {section.gaps?.length > 0 && (
                              <span className="ml-2 text-yellow-600">
                                • {section.gaps.length} gap{section.gaps.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onSectionClick && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSectionClick(section.sectionId);
                            }}
                            className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            Go to section
                          </button>
                        )}
                        {expandedSections[section.sectionId] ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Section details */}
                    {expandedSections[section.sectionId] && (
                      <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
                        {/* Gaps */}
                        {section.gaps?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                              <Target className="w-4 h-4 text-red-500" />
                              Missing Requirements
                            </p>
                            <ul className="space-y-1">
                              {section.gaps.map((gap, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-slate-600"
                                >
                                  <span className="text-red-400 mt-1">•</span>
                                  {gap}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Suggestions */}
                        {section.suggestions?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                              <Lightbulb className="w-4 h-4 text-yellow-500" />
                              Suggestions
                            </p>
                            <ul className="space-y-1">
                              {section.suggestions.map((suggestion, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-slate-600"
                                >
                                  <span className="text-yellow-400 mt-1">•</span>
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* All good */}
                        {(!section.gaps || section.gaps.length === 0) &&
                          (!section.suggestions || section.suggestions.length === 0) && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              This section meets all requirements
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Recommendations */}
            {results.recommendations?.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Overall Recommendations
                </p>
                <ul className="space-y-1">
                  {results.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="text-blue-400 mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
