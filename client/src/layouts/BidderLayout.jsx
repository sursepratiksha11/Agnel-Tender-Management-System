import { Outlet } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import Topbar from "../components/shared/Topbar";

export default function BidderLayout() {
  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar role="bidder" />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
