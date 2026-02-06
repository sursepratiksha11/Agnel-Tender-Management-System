import React from 'react';

export default function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const colors = {
          blue: 'bg-blue-100 text-blue-600',
          purple: 'bg-purple-100 text-purple-600',
          orange: 'bg-orange-100 text-orange-600',
          green: 'bg-green-100 text-green-600'
        };

        return (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${colors[stat.color]} rounded-lg flex items-center justify-center mb-2 sm:mb-3`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
            <div className="text-xs sm:text-sm text-slate-600">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
