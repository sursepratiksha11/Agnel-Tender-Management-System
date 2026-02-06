import React from 'react';
import { FileText, Eye, Send, AlertCircle, Lock } from 'lucide-react';

export default function ProposalHeader({ 
  tender, 
  proposal, 
  completionPercent, 
  completedSections, 
  totalSections,
  onPreview,
  onSubmit,
  submitting
}) {
  const isReadOnly = proposal?.status !== 'DRAFT';
  const allSectionsComplete = completedSections === totalSections && totalSections > 0;

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-yellow-100 text-yellow-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      UNDER_REVIEW: 'bg-purple-100 text-purple-700',
      ACCEPTED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">{tender?.title}</h1>
                <p className="text-sm text-slate-500">{tender?.authority?.name}</p>
              </div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${getStatusColor(proposal?.status || 'DRAFT')}`}>
            {isReadOnly && <Lock className="w-4 h-4" />}
            {proposal?.status || 'DRAFT'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-700">
                {completedSections} of {totalSections} sections completed
              </span>
              <span className="text-sm font-bold text-slate-900">{completionPercent}%</span>
            </div>
            <div className="w-full sm:w-64 h-2 bg-slate-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onPreview}
              disabled={isReadOnly}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={onSubmit}
              disabled={!allSectionsComplete || isReadOnly || submitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Warning if not all sections complete */}
        {!allSectionsComplete && !isReadOnly && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700">
              Complete all {totalSections} sections to submit this proposal
            </p>
          </div>
        )}

        {isReadOnly && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-slate-100 border border-slate-300 rounded-lg">
            <Lock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">
              This proposal is {proposal?.status?.toLowerCase()} and cannot be edited
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
