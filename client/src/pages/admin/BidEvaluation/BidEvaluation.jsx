import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuth from "../../../hooks/useAuth";
import { evaluationService } from "../../../services/evaluationService";
import { ChevronLeft, Download, Check, X, AlertCircle } from "lucide-react";

export default function BidEvaluation() {
  const { tenderId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tenderDetails, setTenderDetails] = useState(null);
  const [bids, setBids] = useState([]);
  const [selectedBid, setSelectedBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Evaluation form state
  const [evaluationForm, setEvaluationForm] = useState({
    technical_status: "PENDING",
    technical_score: "",
    remarks: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const bidsData = await evaluationService.getBidsForTender(tenderId, token);
        setBids(bidsData.bids || []);
        setSelectedBid(bidsData.bids?.[0] || null);

        const detailsData = await evaluationService.getTenderEvaluationDetails(tenderId, token);
        setTenderDetails(detailsData);
      } catch (err) {
        setError(err.message || "Failed to load bid data");
      } finally {
        setLoading(false);
      }
    }

    if (token && tenderId) loadData();
  }, [token, tenderId]);

  // Update form when selected bid changes
  useEffect(() => {
    if (selectedBid) {
      setEvaluationForm({
        technical_status: selectedBid.technical_status || "PENDING",
        technical_score: selectedBid.technical_score || "",
        remarks: selectedBid.remarks || "",
      });
    }
  }, [selectedBid]);

  const handleEvaluationSubmit = async () => {
    if (!selectedBid) return;

    setSubmitting(true);
    try {
      await evaluationService.updateBidEvaluation(selectedBid.proposal_id, evaluationForm, token);

      // Reload bids
      const bidsData = await evaluationService.getBidsForTender(tenderId, token);
      setBids(bidsData.bids || []);

      // Update selected bid
      const updatedBid = bidsData.bids.find((b) => b.proposal_id === selectedBid.proposal_id);
      setSelectedBid(updatedBid);
    } catch (err) {
      setError(err.message || "Failed to save evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteEvaluation = async () => {
    if (!window.confirm("Mark this tender's evaluation as complete? This action cannot be undone.")) {
      return;
    }

    setSubmitting(true);
    try {
      await evaluationService.completeEvaluation(tenderId, token);
      navigate("/admin/bid-evaluation");
    } catch (err) {
      setError(err.message || "Failed to complete evaluation");
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: "bg-neutral-100 text-neutral-700 border-neutral-300",
      QUALIFIED: "bg-green-100 text-green-700 border-green-300",
      DISQUALIFIED: "bg-red-100 text-red-700 border-red-300",
    };
    return colors[status] || colors.PENDING;
  };

  if (loading) {
    return (
      <div className="px-6 py-6 mx-auto max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-neutral-600">Loading bids...</div>
        </div>
      </div>
    );
  }

  const evaluationStatus = tenderDetails?.tender_evaluation_status;
  const isCompleted = evaluationStatus?.evaluation_status === "COMPLETED";

  return (
    <div className="px-6 py-6 mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/bid-evaluation")}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-neutral-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {tenderDetails?.tender?.title || "Bid Evaluation"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {bids.length} bid(s) received
            {isCompleted && " · Evaluation Completed"}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Status Alert */}
      {isCompleted && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-700">Evaluation Completed</p>
            <p className="text-sm text-green-600 mt-1">
              L1 (Lowest Qualified Bid): {evaluationStatus?.l1_amount ? `₹${Number(evaluationStatus.l1_amount).toLocaleString("en-IN")}` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel: Bid List */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden sticky top-6">
            <div className="px-4 py-3 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">Bids ({bids.length})</h3>
            </div>
            <div className="divide-y divide-neutral-200 max-h-96 overflow-y-auto">
              {bids.map((bid) => (
                <button
                  key={bid.proposal_id}
                  onClick={() => setSelectedBid(bid)}
                  className={`w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors ${
                    selectedBid?.proposal_id === bid.proposal_id ? "bg-neutral-50 border-l-2 border-blue-600" : ""
                  }`}
                >
                  <div className="text-sm font-medium text-neutral-900 truncate">{bid.organization_name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">₹{Number(bid.bid_amount).toLocaleString("en-IN")}</div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(bid.technical_status)}`}>
                      {bid.technical_status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel: Bid Details */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Bid Details</h3>
              <button className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 transition-colors" title="Download">
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {selectedBid ? (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs text-neutral-500 font-medium mb-1">Organization</p>
                    <p className="text-lg font-semibold text-neutral-900">{selectedBid.organization_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-neutral-500 font-medium mb-1">Bid Amount</p>
                      <p className="text-base font-semibold text-neutral-900">
                        ₹{Number(selectedBid.bid_amount).toLocaleString("en-IN")}
                      </p>
                      {selectedBid.proposal_id === evaluationStatus?.l1_proposal_id && (
                        <p className="text-xs text-green-600 font-medium mt-1">✓ L1 (Lowest Qualified)</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 font-medium mb-1">Submission Date</p>
                      <p className="text-base font-semibold text-neutral-900">
                        {selectedBid.created_at ? new Date(selectedBid.created_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>

                  {selectedBid.remarks && (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                      <p className="text-xs text-neutral-500 font-medium mb-2">Remarks</p>
                      <p className="text-sm text-neutral-700">{selectedBid.remarks}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No bid selected</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Evaluation Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden sticky top-6">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900">Evaluate Bid</h3>
            </div>

            <div className="p-6 space-y-4">
              {selectedBid ? (
                <>
                  {/* Technical Status */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-2">Decision</label>
                    <div className="space-y-2">
                      {["PENDING", "QUALIFIED", "DISQUALIFIED"].map((status) => (
                        <label key={status} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value={status}
                            checked={evaluationForm.technical_status === status}
                            onChange={(e) =>
                              setEvaluationForm({ ...evaluationForm, technical_status: e.target.value })
                            }
                            disabled={isCompleted}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-neutral-700">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Score */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-2">Score (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={evaluationForm.technical_score}
                      onChange={(e) =>
                        setEvaluationForm({ ...evaluationForm, technical_score: e.target.value })
                      }
                      disabled={isCompleted}
                      placeholder="0-100"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-2">Remarks</label>
                    <textarea
                      value={evaluationForm.remarks}
                      onChange={(e) =>
                        setEvaluationForm({ ...evaluationForm, remarks: e.target.value })
                      }
                      disabled={isCompleted}
                      placeholder="Add comments..."
                      rows="4"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-4 border-t border-neutral-200">
                    <button
                      onClick={handleEvaluationSubmit}
                      disabled={submitting || isCompleted}
                      className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-neutral-300 transition-colors"
                    >
                      {submitting ? "Saving..." : "Save Evaluation"}
                    </button>

                    {bids.every((b) => b.technical_status !== "PENDING") && !isCompleted && (
                      <button
                        onClick={handleCompleteEvaluation}
                        disabled={submitting}
                        className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-neutral-300 transition-colors"
                      >
                        Complete Evaluation
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-neutral-500">Select a bid to evaluate</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
