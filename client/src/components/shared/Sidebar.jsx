import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Bookmark,
  FileCheck,
  Search,
  TrendingUp,
  Clock,
  LogOut,
  Building2,
  ClipboardList,
} from "lucide-react";

const adminMenu = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, rootPath: "/admin/dashboard" },
  { label: "Tenders", href: "/admin/tenders", icon: FileText, rootPath: "/admin/tenders" },
  { label: "Create Tender", href: "/admin/tender/create", icon: FileText, rootPath: "/admin/tender" },
  { label: "Bid Evaluation", href: "/admin/bid-evaluation", icon: FileCheck, rootPath: "/admin/bid-evaluation" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, rootPath: "/admin/analytics" },
  { label: "Profile", href: "/admin/profile", icon: Settings, rootPath: "/admin/profile" },
];

const bidderMenu = [
  { label: "Dashboard", href: "/bidder/dashboard", icon: LayoutDashboard, rootPath: "/bidder/dashboard" },
  { label: "Discover Tenders", href: "/bidder/tenders", icon: Search, rootPath: "/bidder/tenders" },
  { label: "Saved Tenders", href: "/bidder/saved-tenders", icon: Bookmark, rootPath: "/bidder/saved-tenders" },
  { label: "Tender Analysis", href: "/bidder/analyze", icon: TrendingUp, rootPath: "/bidder/analyze" },
  { label: "Proposal Drafting", href: "/bidder/proposal-drafting", icon: FileCheck, rootPath: "/bidder/proposal-drafting" },
  { label: "History", href: "/bidder/history", icon: Clock, rootPath: "/bidder/history" },
  { label: "Profile", href: "/bidder/profile", icon: Settings, rootPath: "/bidder/profile" },
    { label: "Profile", href: "/bidder/profile", icon: Settings, rootPath: "/bidder/profile" },
];

const assisterMenu = [
  { label: "Dashboard", href: "/assister/dashboard", icon: LayoutDashboard, rootPath: "/assister/dashboard" },
  { label: "My Assignments", href: "/assister/assignments", icon: ClipboardList, rootPath: "/assister/assignments" },
  { label: "Profile", href: "/assister/profile", icon: Settings, rootPath: "/assister/profile" },
];

/**
 * Check if a route is active.
 * For nested routes like /admin/tender/edit/123, check against rootPath (/admin/tender)
 */
function isRouteActive(currentPath, menuItem) {
  if (menuItem.rootPath) {
    return currentPath.startsWith(menuItem.rootPath);
  }
  return currentPath === menuItem.href;
}

export default function Sidebar({ role = "admin" }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Select menu based on role
  const menu = role === "admin"
    ? adminMenu
    : role === "assister"
    ? assisterMenu
    : bidderMenu;

  const user = JSON.parse(localStorage.getItem("tms_user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("tms_user");
    localStorage.removeItem("tms_token");
    navigate("/login");
  };

  const roleLabel = role === "admin" ? "Authority" : role === "assister" ? "Assister" : "Bidder";

  return (
    <aside className="w-64 h-screen bg-white border-r border-neutral-200 flex flex-col fixed top-0 left-0 overflow-y-auto shadow-sm">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-200">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-neutral-900 tracking-tight">
            TenderFlow
          </span>
        </Link>
      </div>

      {/* User Info */}
      <div className="px-4 py-3 border-b border-neutral-100">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
            {user.name ? user.name.charAt(0).toUpperCase() : roleLabel.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">
              {user.name || "User"}
            </p>
            <p className="text-xs text-neutral-500">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <p className="px-3 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Menu
        </p>
        <ul className="space-y-1">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(location.pathname, item);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700 border border-primary-100"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary-600" : "text-neutral-400"}`} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-neutral-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
