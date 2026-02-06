import React from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';

export default function SectionsTab({ sections, expandedSections, toggleSection }) {
  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection(idx)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                section.complexity === 'Very High' ? 'bg-red-100 text-red-700' :
                section.complexity === 'High' ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {section.complexity || 'Medium'}
              </span>
              <h3 className="text-lg font-bold text-slate-900">{section.name}</h3>
            </div>
            {expandedSections.includes(idx) ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          
          {expandedSections.includes(idx) && (
            <div className="px-6 pb-6">
              <div className="prose max-w-none mb-4">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {section.content}
                </p>
              </div>
              
              {section.keyPoints && section.keyPoints.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Key Points
                  </div>
                  <ul className="space-y-1">
                    {section.keyPoints.map((point, i) => (
                      <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
