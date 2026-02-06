import React from 'react';
import { useNavigate } from 'react-router-dom';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import { ArrowRight, TrendingUp, Upload, Loader2 } from 'lucide-react';
import { apiRequest } from '../../services/apiClient';
import useAuth from '../../hooks/useAuth';

export default function AnalyzePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [recentAnalyses, setRecentAnalyses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Fetch recent uploaded tenders
  React.useEffect(() => {
    if (token) {
      fetchRecentAnalyses();
    }
  }, [token]);

  const fetchRecentAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest('/uploaded-tender/my-uploads?limit=6', { token });
      
      // Transform API response to component format
      const analyses = data.map(tender => ({
        id: tender.id,
        tenderTitle: tender.title,
        matchScore: tender.opportunityScore || 75,
        analyzedDate: formatDate(tender.createdAt),
        sector: tender.sector,
        authorityName: tender.authorityName
      }));
      
      setRecentAnalyses(analyses);
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
      setError(err.message || 'Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const handleAnalysisClick = (analysisId) => {
    navigate(`/bidder/tenders`);
  };

  return (
    <BidderLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Analyze Tenders</h1>
          <p className="text-slate-600">View detailed AI analysis of tenders you're interested in</p>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Advanced Tender Analysis</h2>
              <p className="text-slate-600 mb-4">Get AI-powered insights on tender complexity, competition levels, and your match score. Navigate to a specific tender from the discovery page to view its detailed analysis.</p>
              <button
                onClick={() => navigate('/bidder/tenders')}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
              >
                Discover Tenders <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-slate-600">Loading your analyses...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Recent Analyses */}
        {!loading && !error && recentAnalyses.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Recent Analyses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentAnalyses.map((analysis) => (
                <div 
                  key={analysis.id} 
                  onClick={() => handleAnalysisClick(analysis.id)}
                  className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition cursor-pointer"
                >
                  <div className="mb-3">
                    <h4 className="font-semibold text-slate-900 mb-1">{analysis.tenderTitle}</h4>
                    {analysis.authorityName && (
                      <p className="text-sm text-slate-500">{analysis.authorityName}</p>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Match Score</p>
                      <p className="text-3xl font-bold text-blue-600">{analysis.matchScore}%</p>
                    </div>
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {analysis.matchScore}%
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">{analysis.analyzedDate}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && recentAnalyses.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Analyses Yet</h3>
            <p className="text-slate-600 mb-6">Upload your first tender PDF to get started with AI analysis</p>
            <button
              onClick={() => navigate('/bidder/pdf-analyze')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Upload First Tender
            </button>
          </div>
        )}
      </div>
    </BidderLayout>
  );
}
