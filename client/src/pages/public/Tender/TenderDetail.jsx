import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../../components/shared/PageHeader";
import useAuth from "../../../hooks/useAuth";
import { tenderService } from "../../../services/tenderService";
import { proposalService } from "../../../services/proposalService";

export default function TenderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [tender, setTender] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);

  const role = user?.role?.toLowerCase?.();
  const isBidder = role === "bidder";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!token) {
        setError("Please log in to view this tender.");
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const [tenderRes, proposalRes] = await Promise.all([
          tenderService.getTender(id, token),
          isBidder ? proposalService.listMine(token) : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setTender(tenderRes);
        if (proposalRes?.proposals) setProposals(proposalRes.proposals);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load tender");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id, token, isBidder]);

  const proposalByTender = useMemo(() => {
    const map = new Map();
    proposals.forEach((p) => map.set(p.tender_id, p));
    return map;
  }, [proposals]);

  const startProposal = async (tenderId) => {
    setActionId(tenderId);
    try {
      const proposal = await proposalService.createDraft(tenderId, token);
      setProposals((prev) => [proposal, ...prev]);
      navigate(`/bidder/proposals/${proposal.proposal_id}`);
    } catch (err) {
      if (err.status === 400 && err.message?.includes("exists")) {
        const existing = proposalByTender.get(tenderId);
        if (existing) {
          navigate(`/bidder/proposals/${existing.proposal_id}`);
          return;
        }
        setError("You already have a proposal for this tender.");
      } else {
        setError(err.message || "Failed to start proposal");
      }
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader title="Loading tender..." />
        <div className="bg-white border border-neutral-200 rounded-lg p-6 text-sm text-neutral-700">
          Fetching tender details.
        </div>
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={error ? "Unable to load tender" : "Tender Not Found"}
          description={error || "The tender you are looking for does not exist."}
        />
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <Link to="/" className="text-primary-600 hover:underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const isPublished = tender.status === "PUBLISHED";
  const deadline = tender.submission_deadline
    ? new Date(tender.submission_deadline)
    : null;
  const existing = proposalByTender.get(tender.tender_id);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={tender.title}
        description={isPublished ? "Published tender details" : "Draft tender (read-only)"}
      />

      <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
              isPublished
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isPublished ? "Published" : "Draft"}
          </span>
          {deadline && (
            <span className="text-sm text-neutral-600">
              Deadline: {deadline.toLocaleDateString()}
            </span>
          )}
          {tender.organization_name && (
            <span className="text-sm text-neutral-600">
              Issuing Authority: {tender.organization_name}
            </span>
          )}
        </div>

        <div className="prose max-w-none">
          <h3 className="text-lg font-semibold text-neutral-900">Overview</h3>
          <p className="text-neutral-700">
            This is a read-only preview of the tender. In a real app, this would
            include the scope, eligibility criteria, submission instructions,
            and attachments.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link
            to={"/"}
            className="px-4 py-2 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          >
            Back to Home
          </Link>
          <Link
            to={"/bidder/dashboard"}
            className="px-4 py-2 rounded-md bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
          >
            Bidder Dashboard
          </Link>
          {isBidder && isPublished && (
            existing ? (
              <button
                onClick={() => navigate(`/bidder/proposals/${existing.proposal_id}`)}
                className="px-4 py-2 rounded-md bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100"
              >
                View Proposal
              </button>
            ) : (
              <button
                onClick={() => startProposal(tender.tender_id)}
                disabled={actionId === tender.tender_id}
                className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {actionId === tender.tender_id ? "Starting..." : "Start Proposal"}
              </button>
            )
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
