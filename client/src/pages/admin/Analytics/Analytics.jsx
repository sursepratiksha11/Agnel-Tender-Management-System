import { useEffect, useState, useMemo } from "react";
import useAuth from "../../../hooks/useAuth";
import { analyticsService } from "../../../services/analyticsService";
import { BarChart, LineChart, PieChart } from "../../../components/admin/Charts";
import { TrendingUp, Users, Award, Clock, DollarSign, CheckCircle2 } from "lucide-react";

export default function Analytics() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const data = await analyticsService.getAnalytics(token);
        setAnalytics(data);
      } catch (err) {
        setError(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    if (token) loadAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="px-6 py-6 mx-auto max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-neutral-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6 mx-auto max-w-7xl">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const { metrics, tenderDetails, statusDistribution } = analytics || {};

  // Prepare chart data
  const bidsPerTenderData = tenderDetails
    ?.slice(0, 10)
    .map(t => ({
      title: t.title.substring(0, 15),
      bid_count: t.bidCount,
    })) || [];

  const lifecycleData = tenderDetails
    ?.slice(0, 20)
    .map(t => ({
      title: t.title.substring(0, 10),
      days: t.lifecycleDays,
    })) || [];

  return (
    <div className="px-6 py-6 mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Analytics & Governance</h1>
        <p className="text-sm text-neutral-500 mt-2">
          System-level insights to support transparent and efficient tendering
        </p>
      </div>

      {/* KEY METRICS - PART 1 */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Tenders Created */}
        <MetricCard
          icon={Award}
          title="Total Tenders Created"
          value={metrics?.totalTenders || 0}
          color="bg-blue-50"
          iconColor="text-blue-600"
          description="Complete tenders in the system"
        />

        {/* Total Published */}
        <MetricCard
          icon={CheckCircle2}
          title="Published Tenders"
          value={metrics?.publishedTenders || 0}
          color="bg-green-50"
          iconColor="text-green-600"
          description="Actively accepting bids"
        />

        {/* Closed Tenders */}
        <MetricCard
          icon={TrendingUp}
          title="Closed Tenders"
          value={metrics?.closedTenders || 0}
          color="bg-purple-50"
          iconColor="text-purple-600"
          description="Evaluation completed"
        />

        {/* Average Bids */}
        <MetricCard
          icon={Users}
          title="Average Bids per Tender"
          value={parseFloat(metrics?.averageBidsPerTender || 0).toFixed(1)}
          color="bg-amber-50"
          iconColor="text-amber-600"
          description="Competitive participation"
        />

        {/* Total Bids */}
        <MetricCard
          icon={DollarSign}
          title="Total Bids Received"
          value={metrics?.totalBids || 0}
          color="bg-indigo-50"
          iconColor="text-indigo-600"
          description="Across all tenders"
        />

        {/* Lifecycle Duration */}
        <MetricCard
          icon={Clock}
          title="Avg Tender Lifecycle"
          value={`${metrics?.averageLifecycleDays || 0} days`}
          color="bg-rose-50"
          iconColor="text-rose-600"
          description="From creation to deadline"
        />
      </section>

      {/* VISUAL INSIGHTS - PART 2 */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-neutral-900">Visual Insights</h2>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="font-semibold text-neutral-900 mb-6">Tender Status Distribution</h3>
          <PieChart
            data={{
              DRAFT: statusDistribution?.DRAFT || 0,
              PUBLISHED: statusDistribution?.PUBLISHED || 0,
              CLOSED: statusDistribution?.CLOSED || 0,
            }}
          />
          <p className="text-xs text-neutral-500 mt-4">
            Shows the current state of all tenders across the tendering lifecycle
          </p>
        </div>

        {/* Bids Per Tender Bar Chart */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="font-semibold text-neutral-900 mb-6">Bid Participation</h3>
          {bidsPerTenderData.length > 0 ? (
            <>
              <BarChart
                data={bidsPerTenderData}
                xKey="title"
                yKey="bid_count"
                label="Number of Bids"
              />
              <p className="text-xs text-neutral-500 mt-4">
                Shows bidder participation across your recent tenders (higher = more competitive)
              </p>
            </>
          ) : (
            <p className="text-neutral-500 text-center py-8">No tender data available</p>
          )}
        </div>

        {/* Tender Lifecycle Duration Line Chart */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="font-semibold text-neutral-900 mb-6">Tender Timeline</h3>
          {lifecycleData.length > 0 ? (
            <>
              <LineChart
                data={lifecycleData}
                xKey="title"
                yKey="days"
                label="Duration (days)"
              />
              <p className="text-xs text-neutral-500 mt-4">
                Shows how long each tender allows for bid submission (planning period)
              </p>
            </>
          ) : (
            <p className="text-neutral-500 text-center py-8">No timeline data available</p>
          )}
        </div>
      </section>

      {/* GOVERNANCE SUMMARY - PART 3 */}
      <section className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Governance Checklist</h3>
        <div className="space-y-3">
          <GovernanceItem
            completed={metrics?.publishedTenders > 0}
            label="Tenders are being published and opened for competitive bidding"
          />
          <GovernanceItem
            completed={metrics?.averageBidsPerTender > 2}
            label="Each tender is receiving adequate bidder participation"
          />
          <GovernanceItem
            completed={metrics?.closedTenders > 0}
            label="Completed tenders have been evaluated"
          />
          <GovernanceItem
            completed={metrics?.totalTenders > 0}
            label="System is actively in use for tender management"
          />
          <GovernanceItem
            completed={metrics?.averageLifecycleDays > 0}
            label="Adequate time is provided for bid submission"
          />
        </div>
      </section>

      {/* INSIGHTS & RECOMMENDATIONS - PART 4 */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">System Health Summary</h3>
        <div className="space-y-3 text-sm text-neutral-700">
          <p>
            ✓ <strong>Transparency:</strong> All tenders and bids are visible and tracked
          </p>
          <p>
            ✓ <strong>Competition:</strong> Average of {parseFloat(metrics?.averageBidsPerTender || 0).toFixed(1)} bids per tender
            indicates {parseFloat(metrics?.averageBidsPerTender || 0) > 3 ? "healthy" : "developing"} competition
          </p>
          <p>
            ✓ <strong>Timeline:</strong> Tender lifecycle averages {metrics?.averageLifecycleDays || 0} days for bid submission
          </p>
          <p>
            ✓ <strong>Completion:</strong> {metrics?.closedTenders || 0} tenders have been evaluated and closed
          </p>
          <p className="pt-3 border-t border-blue-200 mt-3">
            <strong>Key Metric:</strong> The system demonstrates efficient tender management with transparent processes.
            All decisions remain under human authority control with comprehensive audit trails.
          </p>
        </div>
      </section>
    </div>
  );
}

// Reusable metric card component
function MetricCard({ icon: Icon, title, value, color, iconColor, description }) {
  return (
    <div className={`${color} border border-neutral-200 rounded-lg p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-neutral-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-neutral-900 mt-2">{value}</p>
          <p className="text-xs text-neutral-500 mt-2">{description}</p>
        </div>
        <Icon className={`${iconColor} w-8 h-8 flex-shrink-0 opacity-50`} />
      </div>
    </div>
  );
}

// Governance checklist item
function GovernanceItem({ completed, label }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
        completed ? 'bg-green-500 border-green-600' : 'bg-neutral-200 border-neutral-300'
      }`}>
        {completed && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <p className={`text-sm ${completed ? 'text-neutral-900' : 'text-neutral-600'}`}>{label}</p>
    </div>
  );
}
