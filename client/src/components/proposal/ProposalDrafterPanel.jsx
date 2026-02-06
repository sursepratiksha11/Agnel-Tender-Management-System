import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  FileText,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Lightbulb,
  Zap,
  BookOpen,
  PenTool,
  Target
} from 'lucide-react';
import { aiService } from '../../services/bidder/aiService';

/**
 * ProposalDrafterPanel - AI-powered proposal draft generation
 *
 * Features:
 * - Generate draft content for current section
 * - Improve existing draft
 * - Generate content snippets
 * - Section-specific templates
 */
export default function ProposalDrafterPanel({
  tenderId,
  sectionId,
  sectionType,
  sectionTitle,
  tenderRequirement,
  currentContent,
  onInsertDraft,
  onReplaceDraft
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [improvementFocus, setImprovementFocus] = useState('professional');

  // Snippet types for quick generation
  const snippetTypes = [
    { id: 'experience', label: 'Experience Statement', icon: BookOpen },
    { id: 'certification', label: 'Certification Claim', icon: Target },
    { id: 'methodology', label: 'Methodology', icon: PenTool },
    { id: 'compliance', label: 'Compliance Statement', icon: Check },
    { id: 'financial', label: 'Financial Terms', icon: FileText },
  ];

  // Improvement focus options
  const improvementOptions = [
    { id: 'professional', label: 'Professional Tone', description: 'Enhance formal language' },
    { id: 'detail', label: 'Add Details', description: 'Include more specifics' },
    { id: 'clarity', label: 'Improve Clarity', description: 'Simplify and clarify' },
    { id: 'compliance', label: 'Compliance Focus', description: 'Address requirements' },
  ];

  /**
   * Generate full section draft
   */
  const handleGenerateDraft = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await aiService.generateSectionDraft(tenderId, {
        sectionId,
        sectionType: sectionType || inferSectionType(sectionTitle),
        tenderRequirement,
      });

      if (response.data?.data) {
        setGeneratedDraft(response.data.data);
      }
    } catch (err) {
      console.error('Error generating draft:', err);
      setError('Failed to generate draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Improve existing draft
   */
  const handleImproveDraft = async () => {
    if (!currentContent || currentContent.length < 20) {
      setError('Please write some content first before improving.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await aiService.improveDraft({
        existingDraft: currentContent,
        sectionType: sectionType || inferSectionType(sectionTitle),
        tenderRequirement,
        improvementFocus,
      });

      if (response.data?.data) {
        setGeneratedDraft({
          draft: response.data.data.improvedDraft,
          isImproved: true,
          improvementFocus,
          wordCount: response.data.data.improvedWordCount,
        });
      }
    } catch (err) {
      console.error('Error improving draft:', err);
      setError('Failed to improve draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate a quick snippet
   */
  const handleGenerateSnippet = async (snippetType) => {
    try {
      setLoading(true);
      setError(null);

      const response = await aiService.generateSnippet({
        snippetType,
        context: `${sectionTitle}: ${tenderRequirement?.substring(0, 200) || 'Government tender response'}`,
        length: 'medium',
      });

      if (response.data?.data?.snippet) {
        setGeneratedDraft({
          draft: response.data.data.snippet,
          isSnippet: true,
          snippetType,
        });
      }
    } catch (err) {
      console.error('Error generating snippet:', err);
      setError('Failed to generate snippet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Infer section type from title
   */
  const inferSectionType = (title) => {
    const titleLower = (title || '').toLowerCase();
    if (titleLower.includes('eligib') || titleLower.includes('qualif')) return 'ELIGIBILITY';
    if (titleLower.includes('technic') || titleLower.includes('method')) return 'TECHNICAL';
    if (titleLower.includes('financ') || titleLower.includes('price')) return 'FINANCIAL';
    if (titleLower.includes('evalua') || titleLower.includes('criteria')) return 'EVALUATION';
    if (titleLower.includes('term') || titleLower.includes('condition')) return 'TERMS';
    return 'TECHNICAL';
  };

  /**
   * Copy draft to clipboard
   */
  const handleCopy = async () => {
    if (generatedDraft?.draft) {
      await navigator.clipboard.writeText(generatedDraft.draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Insert draft into editor
   */
  const handleInsert = () => {
    if (generatedDraft?.draft && onInsertDraft) {
      onInsertDraft(generatedDraft.draft);
      setGeneratedDraft(null);
    }
  };

  /**
   * Replace editor content with draft
   */
  const handleReplace = () => {
    if (generatedDraft?.draft && onReplaceDraft) {
      onReplaceDraft(generatedDraft.draft);
      setGeneratedDraft(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Draft Assistant
          </h3>
          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            Beta
          </span>
        </div>
      </div>

      {/* Main Actions */}
      <div className="p-4 space-y-4">
        {/* Generate Full Draft Button */}
        <button
          onClick={handleGenerateDraft}
          disabled={loading}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate Full Draft
            </>
          )}
        </button>

        {/* Improve Existing Draft */}
        {currentContent && currentContent.length > 20 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-between text-slate-700"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Improve My Draft
              </span>
              {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showOptions && (
              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <p className="text-xs text-slate-500 mb-2">Select improvement focus:</p>
                <div className="grid grid-cols-2 gap-2">
                  {improvementOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setImprovementFocus(option.id)}
                      className={`p-2 rounded-lg text-left text-xs transition-all ${
                        improvementFocus === option.id
                          ? 'bg-purple-100 border-purple-300 border-2'
                          : 'bg-white border border-slate-200 hover:border-purple-200'
                      }`}
                    >
                      <div className="font-medium text-slate-900">{option.label}</div>
                      <div className="text-slate-500">{option.description}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleImproveDraft}
                  disabled={loading}
                  className="w-full mt-2 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Improve Draft
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Snippets */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Quick Snippets
          </p>
          <div className="flex flex-wrap gap-2">
            {snippetTypes.map((snippet) => {
              const Icon = snippet.icon;
              return (
                <button
                  key={snippet.id}
                  onClick={() => handleGenerateSnippet(snippet.id)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center gap-1 disabled:opacity-50 transition-colors"
                >
                  <Icon className="w-3 h-3" />
                  {snippet.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Generated Draft Display */}
        {generatedDraft && (
          <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-green-900 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {generatedDraft.isImproved
                  ? 'Improved Draft'
                  : generatedDraft.isSnippet
                  ? 'Generated Snippet'
                  : 'Generated Draft'}
              </h4>
              <div className="flex items-center gap-2">
                {generatedDraft.wordCount && (
                  <span className="text-xs text-green-700">
                    {generatedDraft.wordCount} words
                  </span>
                )}
                {generatedDraft.isAIGenerated !== false && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI
                  </span>
                )}
              </div>
            </div>

            {/* Draft Content Preview */}
            <div className="bg-white rounded-lg p-3 mb-3 max-h-60 overflow-y-auto">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {generatedDraft.draft}
              </p>
            </div>

            {/* Suggested Structure */}
            {generatedDraft.suggestedStructure && (
              <div className="mb-3">
                <p className="text-xs text-green-700 mb-1">Suggested structure:</p>
                <div className="flex flex-wrap gap-1">
                  {generatedDraft.suggestedStructure.slice(0, 4).map((item, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-white text-slate-600 rounded">
                      {idx + 1}. {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleInsert}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-1"
              >
                <FileText className="w-4 h-4" />
                Insert at Cursor
              </button>
              <button
                onClick={handleReplace}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Replace All
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Disclaimer */}
            {generatedDraft.disclaimer && (
              <p className="mt-3 text-xs text-slate-500 italic">
                {generatedDraft.disclaimer}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Tips */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          <strong>Tip:</strong> AI drafts are starting points. Always review and customize before submission.
        </p>
      </div>
    </div>
  );
}
