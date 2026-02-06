import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Lock, Save, FileText, Clock } from 'lucide-react';

export default function ProposalEditor({ 
  section, 
  content, 
  onContentChange,
  isReadOnly,
  savingStatus, // 'saving' | 'saved' | null
  lastSaved
}) {
  const [showRequirement, setShowRequirement] = useState(true);

  const wordCount = content ? content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const characterCount = content ? content.length : 0;
  const minChars = 50;
  const charPercent = Math.min((characterCount / minChars) * 100, 100);
  const isMinimumMet = characterCount >= minChars;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Section Header with Better Styling */}
      <div className="p-6 border-b border-slate-200 flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-6 h-6" />
              <div>
                <h2 className="text-2xl font-bold">{section?.title || 'Select a section'}</h2>
                {section?.type && (
                  <p className="text-blue-100 text-sm mt-1 capitalize">
                    {section.type} section
                  </p>
                )}
              </div>
            </div>
            {section?.mandatory && (
              <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-900 text-xs font-semibold rounded-full">
                ★ Mandatory Section
              </div>
            )}
          </div>
          
          {/* Status Info */}
          <div className="text-right text-sm">
            {isReadOnly && (
              <div className="flex items-center gap-1 text-yellow-100 font-medium">
                <Lock className="w-4 h-4" />
                Read-only
              </div>
            )}
            {lastSaved && !isReadOnly && (
              <div className="flex items-center gap-1 text-blue-100">
                <Clock className="w-3 h-3" />
                <span className="text-xs">
                  {saving ? 'Saving...' : `Saved ${new Date(lastSaved).toLocaleTimeString()}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tender Requirement Box - Collapsible */}
      {showRequirement && (
        <div className="p-6 border-b border-slate-200 bg-blue-50 flex-shrink-0">
          <button
            onClick={() => setShowRequirement(!showRequirement)}
            className="w-full flex items-center justify-between mb-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-700">?</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 text-sm">Tender Requirement</h3>
                <p className="text-xs text-slate-600">What needs to be addressed</p>
              </div>
            </div>
            {showRequirement ? (
              <ChevronUp className="w-5 h-5 text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" />
            )}
          </button>
          
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">
              {section?.description || section?.content || 'No requirement specified'}
            </p>
          </div>
        </div>
      )}

      {/* Hidden Requirement Indicator */}
      {!showRequirement && (
        <button
          onClick={() => setShowRequirement(true)}
          className="px-6 py-3 text-xs text-blue-600 hover:text-blue-700 font-medium border-b border-slate-200 flex items-center gap-2 flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4" />
          Show tender requirement
        </button>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
        {/* Character Count Progress */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">Minimum content required</span>
            <span className={`text-xs font-bold ${isMinimumMet ? 'text-green-600' : 'text-orange-600'}`}>
              {characterCount}/{minChars} characters
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isMinimumMet
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600'
              }`}
              style={{ width: `${charPercent}%` }}
            />
          </div>
        </div>

        {/* Text Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isReadOnly ? (
            <div className="flex-1 p-6 bg-slate-50 rounded-lg border-2 border-slate-200 flex items-center justify-center">
              <div className="text-center">
                <Lock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium mb-1">This proposal is read-only</p>
                <p className="text-sm text-slate-500">Editing is disabled after submission</p>
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              disabled={isReadOnly}
              placeholder={`Write your response here. Include all relevant details to address the tender requirement above.

Tips:
• Be clear and concise
• Reference specific requirements
• Use professional language
• Provide concrete details and examples`}
              className={`flex-1 w-full p-4 border-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-normal text-sm leading-relaxed ${
                isReadOnly
                  ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                  : 'border-slate-300 bg-white text-slate-900'
              }`}
            />
          )}
        </div>

        {/* Stats and Actions Footer */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex gap-6 items-center">
            <div>
              <p className="text-xs text-slate-600 font-medium">Words</p>
              <p className="text-lg font-bold text-slate-900">{wordCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Characters</p>
              <p className="text-lg font-bold text-slate-900">{characterCount}</p>
            </div>
            
            {/* Auto-save Status */}
            <div className="flex items-center gap-2 ml-auto">
              {savingStatus === 'saving' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">Saving...</span>
                </div>
              )}
              {savingStatus === 'saved' && (
                <div className="flex items-center gap-2 text-green-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    {lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString()}` : 'Saved'}
                  </span>
                </div>
              )}
              {!savingStatus && lastSaved && (
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">
                    {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
