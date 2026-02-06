import BidderLayout from "../../components/bidder-layout/BidderLayout";
import SavedTenders from "./Dashboard/components/SavedTenders";

export default function SavedTendersPage() {
  return (
    <BidderLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Saved Tenders</h1>
        <p className="text-neutral-600 mt-1">
          View and manage your bookmarked tenders
        </p>
      </div>
      <SavedTenders />
    </BidderLayout>
  );
}
