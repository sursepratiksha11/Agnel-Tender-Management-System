import React, { useState } from 'react';
import { Check, AlertCircle, ChevronRight, ListChecks } from 'lucide-react';

export default function SectionList({ 
  sections, 
  activeSection, 
  onSelectSection,
  sectionCompletion 
}) {
  const getCompletionStatus = (sectionId) => {
    const content = sectionCompletion?.[sectionId];
    if (!content || content.trim().length === 0) {
      return 'empty';
    }
    if (content.trim().length < 50) {
      return 'in-progress';
    }
    return 'complete';
  };

  const getStatusIcon = (status) => {
    if (status === 'complete') {
      return <Check className="w-5 h-5 text-green-600" />;
    }
    if (status === 'in-progress') {
      return <AlertCircle className="w-5 h-5 text-orange-500" />;
    }
    return <div className="w-5 h-5 rounded-full border-2 border-slate-300" />;
  };

  const getStatusColor = (status) => {
    if (status === 'complete') {
      return 'hover:bg-green-50 border-green-100';
    }
    if (status === 'in-progress') {
      return 'hover:bg-orange-50 border-orange-100';
    }
    return 'hover:bg-slate-50 border-slate-100';
  };

  const completedCount = sections.filter(s => getCompletionStatus(s._id || s.id) === 'complete').length;
  const totalCount = sections.length;

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Header with Summary */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-900">Sections</h2>
        </div>
        
        {/* Progress Summary */}
        <div className="bg-blue-50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-900">Progress</span>
            <span className="text-xs font-bold text-blue-700">{completedCount}/{totalCount}</span>
          </div>
          <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-600 transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">Click a section to edit</p>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto">
        <nav className="space-y-2 p-3">
          {sections.map((section, index) => {
            const status = getCompletionStatus(section._id || section.id);
            const isActive = activeSection?._id === section._id || activeSection?.id === section.id;
            const sectionId = section._id || section.id;

            return (
              <button
                key={sectionId}
                onClick={() => onSelectSection(section)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : `border-slate-200 bg-white ${getStatusColor(status)}`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {index + 1}
                      </span>
                      {section.mandatory && (
                        <span className="text-xs font-bold text-red-600 px-1">*</span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        status === 'complete'
                          ? 'bg-green-100 text-green-700'
                          : status === 'in-progress'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {status === 'complete' ? 'Done' : status === 'in-progress' ? 'Started' : 'Not started'}
                      </span>
                    </div>
                    <h3 className={`font-medium text-sm truncate ${
                      isActive ? 'text-blue-900' : 'text-slate-900'
                    }`}>
                      {section.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    {getStatusIcon(status)}
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Legend */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600 flex-shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span>In Progress</span>
          </div>
        </div>
      </div>
    </div>
  );
}
