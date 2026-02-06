import React from 'react';
import { Sparkles } from 'lucide-react';

export default function TabNavigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: null },
    { id: 'sections', label: 'Full Document', icon: null },
    { id: 'insights', label: 'AI Insights', icon: Sparkles }
  ];

  return (
    <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-slate-200 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
