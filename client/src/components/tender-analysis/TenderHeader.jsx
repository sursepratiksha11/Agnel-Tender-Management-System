import React from 'react';

export default function TenderHeader({ tender, onStartProposal }) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 line-clamp-2">{tender.title}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 mt-1">
            <span className="truncate">{tender.organization}</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-orange-600 font-medium">{tender.daysRemaining} days left</span>
            <span className="hidden sm:inline">•</span>
            <span>{tender.proposalCount} bids</span>
          </div>
        </div>
        <button 
          onClick={onStartProposal}
          className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition whitespace-nowrap"
        >
          Start Proposal
        </button>
      </div>
    </header>
  );
}
