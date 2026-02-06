import React from 'react';
import { Search, Filter } from 'lucide-react';

export default function SearchAndFilters({ searchQuery, setSearchQuery, filters, setFilters }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="w-full relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description..."
            className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <select
            value={filters.industryDomain}
            onChange={(e) => setFilters({ ...filters, industryDomain: e.target.value })}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Industries</option>
            <option value="Government">Government</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Education">Education</option>
            <option value="Energy">Energy</option>
            <option value="Transportation">Transportation</option>
          </select>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="publishedAt">Latest</option>
            <option value="daysRemaining">Closing Soon</option>
            <option value="proposalCount">Most Popular</option>
            <option value="estimatedValue">Highest Value</option>
          </select>
          <button className="px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}
