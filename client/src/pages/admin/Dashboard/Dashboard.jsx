import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { tenderService } from "../../../services/tenderService";
import PageHeader from "../../../components/shared/PageHeader";
import StatsCard from "./components/StatsCard";
import DraftTenderList from "./components/DraftTenderList";
import PublishedTenderList from "./components/PublishedTenderList";

export default function Dashboard() {
  const { token } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Check if we need to force refresh (from publish redirect)
    const needsRefresh = sessionStorage.getItem('tendersNeedRefresh');
    if (needsRefresh) {
      sessionStorage.removeItem('tendersNeedRefresh');
      setRefreshKey(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    async function loadTenders() {
      setLoading(true);
      setError(null);
      try {
        // Add timestamp to bust cache
        const { tenders: data } = await tenderService.listTenders(token, { _t: Date.now() });
        setTenders(data || []);
      } catch (err) {
        setError(err.message || "Failed to load tenders");
        setTenders([]);
      } finally {
        setLoading(false);
      }
    }
    if (token) loadTenders();
    
    // Set up periodic refresh every 60 seconds (reduced from 15s)
    const interval = setInterval(() => {
      if (token && !loading) {
        loadTenders();
      }
    }, 60000);
    
    // Debounced refresh when window gains focus (user returns to tab)
    let focusTimeout;
    const handleFocus = () => {
      clearTimeout(focusTimeout);
      focusTimeout = setTimeout(() => {
        if (token && !loading) {
          loadTenders();
        }
      }, 1000); // Wait 1s after focus to avoid rapid calls
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      clearTimeout(focusTimeout);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token, refreshKey]);

  // Compute metrics from real data
  const metrics = useMemo(() => {
    const drafts = tenders.filter(t => t.status === 'DRAFT');
    const published = tenders.filter(t => t.status === 'PUBLISHED');
    const closed = tenders.filter(t => t.status === 'CLOSED');
    
    const now = new Date();
    const upcomingCount = published.filter(t => {
      if (!t.submission_deadline) return false;
      const deadline = new Date(t.submission_deadline);
      const daysUntil = (deadline - now) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 7;
    }).length;

    return {
      total: tenders.length,
      drafts: drafts.length,
      published: published.length,
      closed: closed.length,
      upcoming: upcomingCount,
      draftsData: drafts,
      publishedData: published,
    };
  }, [tenders]);

  const handleDeleteDraft = (id) => {
    setTenders((prev) => prev.filter((t) => t.tender_id !== id));
  };

  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="px-6 py-6 mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        description="Manage and publish your tenders from a single place."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 rounded-md bg-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh tender list"
            >
              ⟳ Refresh
            </button>
            <Link
              to="/admin/tender/create"
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold shadow hover:bg-primary-700 transition-colors"
            >
              Create New Tender
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatsCard title="Total Tenders" value={metrics.total} tone="neutral" loading={loading} />
        <StatsCard title="Draft Tenders" value={metrics.drafts} tone="neutral" loading={loading} />
        <StatsCard title="Published Tenders" value={metrics.published} tone="positive" loading={loading} />
        <StatsCard title="Upcoming Deadlines" value={metrics.upcoming} tone="warning" loading={loading} />
      </section>

      {/* Drafts */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">
            Draft Tenders ({metrics.drafts})
          </h2>
          <Link
            to="/admin/tenders?status=DRAFT"
            className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            View All
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-neutral-600">Loading tenders...</div>
        ) : metrics.drafts === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
            <p className="text-sm text-neutral-600 mb-4">
              You don't have any draft tenders yet.
            </p>
            <Link
              to="/admin/tender/create"
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold shadow hover:bg-primary-700 transition-colors"
            >
              Create your first tender
            </Link>
          </div>
        ) : (
          <DraftTenderList
            drafts={metrics.draftsData.map(t => ({
              id: t.tender_id,
              title: t.title,
              updatedAt: t.created_at
            }))}
            onDelete={handleDeleteDraft}
          />
        )}
      </section>

      {/* Published */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">
            Published Tenders ({metrics.published})
          </h2>
          <Link
            to="/admin/tenders?status=PUBLISHED"
            className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            View All
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-neutral-600">Loading tenders...</div>
        ) : metrics.published === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center text-neutral-700">
            No tenders have been published yet.
          </div>
        ) : (
          <PublishedTenderList
            tenders={metrics.publishedData.map(t => ({
              id: t.tender_id,
              title: t.title,
              publishedAt: t.created_at,
              deadline: t.submission_deadline
            }))}
          />
        )}
      </section>
    </div>
  );
}
