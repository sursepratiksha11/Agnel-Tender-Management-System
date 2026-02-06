import { Link } from "react-router-dom";
import { mockTenders } from "../../../../mock/tenders";

export default function RecentlyViewed() {
  // Mock: show last 3 published tenders
  const recent = mockTenders
    .filter((t) => t.status === "published")
    .slice(0, 3);

  if (recent.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">
        Recently Viewed
      </h2>
      <div className="bg-white border border-neutral-200 rounded-lg divide-y">
        {recent.map((tender) => (
          <Link
            key={tender.id}
            to={`/bidder/tenders/${tender.id}/analyze`}
            className="block p-4 hover:bg-neutral-50 transition-colors"
          >
            <div className="text-sm font-medium text-neutral-900">
              {tender.title}
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              Deadline: {new Date(tender.deadline).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
