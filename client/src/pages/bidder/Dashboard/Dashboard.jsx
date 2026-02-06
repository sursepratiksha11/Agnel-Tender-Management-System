import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import BidderLayout from "../../../components/bidder-layout/BidderLayout";
import PageHeader from "../../../components/shared/PageHeader";
import ActiveProposals from "./components/ActiveProposals";
import SavedTenders from "./components/SavedTenders";
import RecentlyViewed from "./components/RecentlyViewed";
import { DashboardInsights, NewsWidget } from "../../../components/insights";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'insights'

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user, navigate]);

  if (!user || loading) return null;

  return (
    <BidderLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Dashboard"
          description="Track your active proposals and shortlisted tenders"
        >
          <Link
            to="/bidder/tenders"
            className="px-4 py-2 rounded-md border border-primary-600 text-primary-600 hover:bg-primary-50 text-sm font-medium"
          >
            Browse Tenders
          </Link>
        </PageHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'insights'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            AI Insights
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
              NEW
            </span>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <ActiveProposals />
            <SavedTenders />
            <RecentlyViewed />
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main insights area */}
            <div className="lg:col-span-2">
              <DashboardInsights onNavigate={(path) => navigate(path)} />
            </div>

            {/* Sidebar with news */}
            <div className="lg:col-span-1">
              <NewsWidget limit={5} compact={false} />
            </div>
          </div>
        )}
      </div>
    </BidderLayout>
  );
}
