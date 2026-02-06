import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { tenderService } from "../../../services/tenderService";
import PageHeader from "../../../components/shared/PageHeader";
import TenderStatusBadge from "../../../components/admin/TenderStatusBadge";

export default function TendersList() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");

  useEffect(() => {
    async function loadTenders() {
      setLoading(true);
      setError(null);
      try {
        // Add timestamp to prevent caching
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
  }, [token, searchParams]); // Re-fetch when search params change

  // Filter tenders based on search and status
  const filteredTenders = useMemo(() => {
    return tenders.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tenders, searchTerm, statusFilter]);

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="px-6 py-6 mx-auto max-w-7xl">
      <PageHeader
        title="Tenders"
        description="Manage all your tenders in one place."
        actions={
          <Link
            to="/admin/tender/create"
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold shadow hover:bg-primary-700 transition-colors"
          >
            Create New Tender
          </Link>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Search Tenders
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title..."
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tenders Table */}
      {loading ? (
        <div className="text-center py-8 text-neutral-600">
          Loading tenders...
        </div>
      ) : filteredTenders.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
          <p className="text-neutral-600 mb-4">
            {tenders.length === 0 ? "No tenders found." : "No tenders match your search."}
          </p>
          {tenders.length === 0 && (
            <Link
              to="/admin/tender/create"
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Create Your First Tender
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-900">Title</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-900">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-900">Deadline</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-900">Created</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredTenders.map((tender) => (
                  <tr key={tender.tender_id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900 truncate max-w-md">
                        {tender.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TenderStatusBadge status={tender.status} />
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {tender.submission_deadline
                        ? new Date(tender.submission_deadline).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {new Date(tender.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {tender.status === "DRAFT" ? (
                          <>
                            <Link
                              to={`/admin/tender/edit/${tender.tender_id}`}
                              className="px-2.5 py-1.5 rounded text-xs font-medium border border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                            >
                              Edit
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              to={`/admin/tender/view/${tender.tender_id}`}
                              className="px-2.5 py-1.5 rounded text-xs font-medium border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              View
                            </Link>
                            <Link
                              to={`/admin/bid-evaluation/${tender.tender_id}`}
                              className="px-2.5 py-1.5 rounded text-xs font-medium border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              Evaluate
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && filteredTenders.length > 0 && (
        <div className="mt-4 text-sm text-neutral-600">
          Showing {filteredTenders.length} of {tenders.length} tenders
        </div>
      )}
    </div>
  );
}
