import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { evaluationService } from "../../../services/evaluationService";
import { CheckCircle2, Clock, AlertCircle, ChevronRight, FileText } from "lucide-react";

export default function BidEvaluationList() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTenders() {
      try {
        const data = await evaluationService.getTendersForEvaluation(token);
        setTenders(data.tenders || []);
      } catch (err) {
        setError(err.message || "Failed to load tenders");
      } finally {
        setLoading(false);
      }
    }

    if (token) loadTenders();
  }, [token]);

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: AlertCircle },
      IN_PROGRESS: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: Clock },
      COMPLETED: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: CheckCircle2 },
    };

    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 ${badge.bg} border ${badge.border} rounded-full`}>
        <Icon className="w-4 h-4" />
        <span className={`text-sm font-medium ${badge.text}`}>{status.replace("_", " ")}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="px-6 py-6 mx-auto max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-neutral-600">Loading tenders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Bid Evaluation</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Review and evaluate bids submitted for your published tenders
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tenders List */}
      {tenders.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-1">No tenders to evaluate</h3>
          <p className="text-sm text-neutral-500">
            Published tenders with bids will appear here for evaluation
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tenders.map((tender) => (
            <div
              key={tender.tender_id}
              className="bg-white border border-neutral-200 rounded-lg overflow-hidden hover:border-neutral-300 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-neutral-900 truncate">
                      {tender.title}
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      ID: {tender.tender_id.substring(0, 8)}...
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(tender.evaluation_status || "PENDING")}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 font-medium">Total Bids</p>
                    <p className="text-2xl font-bold text-neutral-900 mt-1">
                      {tender.total_bids || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-700 font-medium">Qualified</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                      {tender.qualified_bids || 0}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs text-amber-700 font-medium">Pending Review</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">
                      {(tender.total_bids || 0) - (tender.qualified_bids || 0)}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigate(`/admin/bid-evaluation/${tender.tender_id}`)}
                  className="mt-4 w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <span>View & Evaluate Bids</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
