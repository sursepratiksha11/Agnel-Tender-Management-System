import React, { useState } from 'react';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import { Clock, CheckCircle, AlertCircle, FileText, Building, DollarSign, Award } from 'lucide-react';

export default function BidderHistory() {
  const [history, setHistory] = useState([
    {
      id: '1',
      tenderTitle: 'Website Redesign Project',
      organization: 'Digital Media Corp',
      submittedDate: '2024-01-15',
      status: 'Won',
      value: '$50,000',
      competitorCount: 12
    },
    {
      id: '2',
      tenderTitle: 'Enterprise Software Development',
      organization: 'Global Solutions Ltd',
      submittedDate: '2024-01-10',
      status: 'In Evaluation',
      value: '$150,000',
      competitorCount: 8
    },
    {
      id: '3',
      tenderTitle: 'Infrastructure Modernization',
      organization: 'Tech Services Inc',
      submittedDate: '2024-01-05',
      status: 'Lost',
      value: '$200,000',
      competitorCount: 15
    },
    {
      id: '4',
      tenderTitle: 'Mobile App Development',
      organization: 'StartUp Ventures',
      submittedDate: '2023-12-28',
      status: 'Won',
      value: '$75,000',
      competitorCount: 6
    },
    {
      id: '5',
      tenderTitle: 'Cloud Migration Services',
      organization: 'Enterprise Systems',
      submittedDate: '2023-12-20',
      status: 'Lost',
      value: '$300,000',
      competitorCount: 20
    }
  ]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Won': return 'bg-green-100 text-green-700 border-green-200';
      case 'Lost': return 'bg-red-100 text-red-700 border-red-200';
      case 'In Evaluation': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Won': return <CheckCircle className="w-5 h-5" />;
      case 'Lost': return <AlertCircle className="w-5 h-5" />;
      case 'In Evaluation': return <Clock className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const stats = {
    total: history.length,
    won: history.filter(h => h.status === 'Won').length,
    lost: history.filter(h => h.status === 'Lost').length,
    inEvaluation: history.filter(h => h.status === 'In Evaluation').length,
  };

  const winRate = Math.round((stats.won / stats.total) * 100);

  return (
    <BidderLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Bidder History</h1>
          <p className="text-slate-600">Track your submitted proposals and bid outcomes</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Total Bids</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <FileText className="w-12 h-12 text-blue-100" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Won</p>
                <p className="text-3xl font-bold text-green-600">{stats.won}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-100" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Lost</p>
                <p className="text-3xl font-bold text-red-600">{stats.lost}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-100" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Win Rate</p>
                <p className="text-3xl font-bold text-purple-600">{winRate}%</p>
              </div>
              <Award className="w-12 h-12 text-purple-100" />
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Tender Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Organization</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Value</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Competitors</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{item.tenderTitle}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building className="w-4 h-4" />
                        <span className="text-sm">{item.organization}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-900 font-medium">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        {item.value}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                        {item.competitorCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border font-medium text-sm w-fit ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(item.submittedDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BidderLayout>
  );
}
