import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Search, LogOut, Menu, X, LayoutDashboard, TrendingUp, FileCheck, Clock, Building2, Bookmark, Settings } from 'lucide-react';

const BidderSidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/bidder/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/bidder/tenders', label: 'Discover Tenders', icon: Search },
    { path: '/bidder/saved-tenders', label: 'Saved Tenders', icon: Bookmark },
    { path: '/bidder/analyze', label: 'Tender Analysis', icon: TrendingUp },
    { path: '/bidder/proposal-drafting', label: 'Proposal Drafting', icon: FileCheck },
    { path: '/bidder/history', label: 'History', icon: Clock },
    { path: '/bidder/profile', label: 'Profile', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary-600 text-white shadow-lg"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-neutral-200 flex flex-col transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } shadow-sm`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-200">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
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
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'B'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {user?.name || user?.email || 'User'}
              </p>
              <p className="text-xs text-neutral-500">
                Bidder
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Menu
          </p>
          <ul className="space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-neutral-400'}`} />
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

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default BidderSidebar;
