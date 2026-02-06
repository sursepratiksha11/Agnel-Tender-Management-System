import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../../../hooks/useAuth";
import { proposalService } from "../../../../services/proposalService";

export default function ActiveProposals() {
  const { token } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setError(null);
        const { proposals } = await proposalService.listMine(token);
        if (!cancelled) {
          setDrafts(proposals || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load proposals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (token) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  const activeDrafts = useMemo(
    () => drafts.filter((p) => p.status === "DRAFT"),
    [drafts]
  );

  return (
    <section>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">
        Active Proposals
      </h2>

      {loading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 text-sm text-neutral-600">
          Loading proposals...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      ) : activeDrafts.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
          <p className="text-neutral-600 mb-4">
            You don't have any active proposals yet.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/bidder/tenders"
              className="text-primary-600 hover:underline text-sm"
            >
              View saved tenders
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg divide-y">
          {activeDrafts.map((draft) => (
            <div
              key={draft.proposal_id}
              className="p-6 hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    {draft.tender_title || "Untitled Tender"}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    Status: {draft.tender_status || "Unknown"}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Draft
                    </span>
                    <span className="text-xs text-neutral-500">
                      Created: {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/bidder/proposal/${draft.tender_id}`}
                  className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm hover:bg-primary-700 whitespace-nowrap"
                >
                  Continue Drafting
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
