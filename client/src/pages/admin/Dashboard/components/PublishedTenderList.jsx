import { Link } from "react-router-dom";

export default function PublishedTenderList({ tenders = [] }) {
  if (!tenders.length) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center text-neutral-700">
        No tenders have been published yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tenders.map((t) => (
        <div
          key={t.id}
          className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-neutral-900 truncate">
                {t.title}
              </h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Published
              </span>
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              Published {new Date(t.publishedAt).toLocaleDateString()} •
              Deadline {new Date(t.deadline).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/admin/tender/view/${t.id}`}
              className="px-3 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              View
            </Link>
            <Link
              to={`/admin/bid-evaluation/${t.id}`}
              className="px-3 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Evaluate
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
