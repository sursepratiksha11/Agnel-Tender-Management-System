import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, Calendar, Building, Loader2, Trash2, Upload, ExternalLink } from "lucide-react";
import { tenderService } from "../../../../services/bidder/tenderService";

export default function SavedTenders() {
  const navigate = useNavigate();
  const [savedTenders, setSavedTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    fetchSavedTenders();
  }, []);

  const fetchSavedTenders = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await tenderService.getSavedTenders({ limit: 50 });
      if (response.data?.success) {
        setSavedTenders(response.data.data || []);
      } else {
        setSavedTenders([]);
      }
    } catch (err) {
      console.error('Failed to fetch saved tenders:', err);
      setError(err.response?.data?.error || err.message || "Failed to load saved tenders");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (tender) => {
    const tenderId = tender._id;
    const isUploaded = tender.isUploaded;

    setRemovingId(tenderId);
    try {
      await tenderService.unsaveTender(tenderId, isUploaded);
      setSavedTenders(prev => prev.filter(t => t._id !== tenderId));
    } catch (err) {
      console.error('Failed to remove saved tender:', err);
      setError('Failed to remove tender');
    } finally {
      setRemovingId(null);
    }
  };

  const handleViewTender = (tender) => {
    if (tender.isUploaded) {
      navigate(`/bidder/uploaded-tenders/${tender._id}/analyze`);
    } else {
      navigate(`/bidder/tenders/${tender._id}/analyze`);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-yellow-500" />
          Saved Tenders
        </h2>
        <span className="text-sm text-neutral-500">
          {savedTenders.length} saved
        </span>
      </div>

      {loading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm text-neutral-600">Loading saved tenders...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
          <button
            onClick={fetchSavedTenders}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : savedTenders.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
          <Bookmark className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 mb-2">No saved tenders yet</p>
          <p className="text-sm text-neutral-500 mb-4">
            Save tenders from the Discover page to see them here
          </p>
          <Link
            to="/bidder/tenders"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Discover Tenders
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedTenders.map((tender) => {
            const deadline = tender.deadline ? new Date(tender.deadline) : null;
            const isUploaded = tender.isUploaded === true;

            return (
              <div
                key={tender._id}
                className={`bg-white border rounded-lg p-5 hover:shadow-md transition-shadow ${
                  isUploaded ? 'border-purple-200' : 'border-neutral-200'
                }`}
              >
                {/* Header with badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    {isUploaded && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium mb-2">
                        <Upload className="w-3 h-3" />
                        Uploaded
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2">
                      {tender.title}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(tender);
                    }}
                    disabled={removingId === tender._id}
                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Remove from saved"
                  >
                    {removingId === tender._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Organization */}
                <div className="flex items-center gap-1 text-xs text-neutral-600 mb-2">
                  <Building className="w-3 h-3" />
                  <span className="truncate">
                    {tender.organizationId?.organizationName || 'Organization'}
                  </span>
                </div>

                {/* Deadline */}
                {deadline && (
                  <div className="flex items-center gap-1 text-xs text-neutral-500 mb-3">
                    <Calendar className="w-3 h-3" />
                    <span>
                      Deadline: {deadline.toLocaleDateString()}
                      {tender.daysRemaining !== undefined && (
                        <span className={`ml-1 ${
                          tender.daysRemaining <= 7 ? 'text-red-600 font-medium' :
                          tender.daysRemaining <= 14 ? 'text-orange-600' : ''
                        }`}>
                          ({tender.daysRemaining}d left)
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Value */}
                {tender.value && (
                  <div className="text-xs text-neutral-600 mb-3">
                    Value: <span className="font-medium text-neutral-900">
                      ₹{(tender.value / 100000).toFixed(1)}L
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-3 pt-3 border-t border-neutral-100">
                  <button
                    onClick={() => handleViewTender(tender)}
                    className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                      isUploaded
                        ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {isUploaded ? 'View Analysis' : 'View Tender'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
