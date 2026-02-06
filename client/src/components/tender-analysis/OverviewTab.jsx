import React from 'react';
import { FileText, Clock, Users, BookOpen, AlertCircle } from 'lucide-react';

export default function OverviewTab({ tender, sections }) {
  const stats = tender.statistics || {};
  const mandatoryCount = sections.filter(s => s.isMandatory).length;

  // Calculate competition level
  const getCompetitionLevel = (count) => {
    if (count >= 10) return { label: 'High', color: 'text-red-600', bg: 'bg-red-50' };
    if (count >= 5) return { label: 'Medium', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (count > 0) return { label: 'Low', color: 'text-green-600', bg: 'bg-green-50' };
    return { label: 'None yet', color: 'text-blue-600', bg: 'bg-blue-50' };
  };

  const competition = getCompetitionLevel(tender.proposalCount);

  return (
    <div className="space-y-6">
      {/* Quick Stats - Primary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Estimated Value</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{tender.estimatedValue || 'N/A'}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Total Sections</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{sections.length}</div>
          {mandatoryCount > 0 && (
            <div className="text-xs text-red-600 mt-1">{mandatoryCount} mandatory</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Competition</div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{tender.proposalCount}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${competition.bg} ${competition.color}`}>
              {competition.label}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Days Remaining</div>
          <div className={`text-xl sm:text-2xl font-bold ${
            tender.daysRemaining <= 7 ? 'text-red-600' :
            tender.daysRemaining <= 14 ? 'text-orange-600' : 'text-slate-900'
          }`}>
            {tender.daysRemaining}
          </div>
          {tender.daysRemaining <= 7 && (
            <div className="text-xs text-red-600 mt-1">Urgent!</div>
          )}
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
          <BookOpen className="w-5 h-5 text-slate-500" />
          <div>
            <div className="text-xs text-slate-500">Word Count</div>
            <div className="text-sm font-semibold text-slate-900">{stats.wordCount?.toLocaleString() || 0}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
          <Clock className="w-5 h-5 text-slate-500" />
          <div>
            <div className="text-xs text-slate-500">Read Time</div>
            <div className="text-sm font-semibold text-slate-900">~{stats.estimatedReadTime || 1} min</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
          <Users className="w-5 h-5 text-slate-500" />
          <div>
            <div className="text-xs text-slate-500">Bidders</div>
            <div className="text-sm font-semibold text-slate-900">{tender.proposalCount} active</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
          <AlertCircle className="w-5 h-5 text-slate-500" />
          <div>
            <div className="text-xs text-slate-500">Mandatory</div>
            <div className="text-sm font-semibold text-slate-900">{mandatoryCount} sections</div>
          </div>
        </div>
      </div>

      {/* Section Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Document Structure</h3>
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className={`w-5 h-5 ${section.isMandatory ? 'text-red-500' : 'text-slate-400'}`} />
                <div>
                  <div className="font-medium text-slate-900 flex items-center gap-2">
                    {section.name}
                    {section.isMandatory && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Required</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {section.wordCount > 0 ? `${section.wordCount} words` : 'No content'}
                    {section.complexityScore > 0 && ` • Score: ${section.complexityScore}`}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                section.complexity === 'Very High' ? 'bg-red-100 text-red-700' :
                section.complexity === 'High' ? 'bg-orange-100 text-orange-700' :
                section.complexity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {section.complexity || 'Low'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
