import { useState } from 'react';
import BidderSidebar from './Sidebar';

const BidderLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <BidderSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <div className="p-4 sm:p-5 lg:p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default BidderLayout;
