import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../../../hooks/useAuth";
import { tenderService } from "../../../../services/tenderService";

export default function DraftTenderList({ drafts = [], onDelete }) {
  const { token } = useAuth();
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (tenderId) => {
    if (!window.confirm("Delete this draft tender? This action cannot be undone.")) {
      return;
    }
    setDeleting(tenderId);
    try {
      await tenderService.deleteTender(tenderId, token);
      onDelete && onDelete(tenderId);
    } catch (err) {
      alert(err.message || "Failed to delete tender");
    } finally {
      setDeleting(null);
    }
  };
  if (!drafts.length) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
        <p className="text-neutral-700 mb-4">
          You don’t have any draft tenders yet.
        </p>
        <Link
          to="/admin/tender/create"
          className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold shadow hover:bg-primary-700 transition-colors"
        >
          Create your first tender
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((t) => (
        <div
          key={t.id}
          className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-neutral-900 truncate">
                {t.title}
              </h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                Draft
              </span>
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              Last updated {new Date(t.updatedAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/admin/tender/edit/${t.id}`}
              className="px-3 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={() => handleDelete(t.id)}
              disabled={deleting === t.id}
              className="px-3 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {deleting === t.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
