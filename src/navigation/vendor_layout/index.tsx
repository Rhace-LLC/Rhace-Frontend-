import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@/navigation/sidebar';
import VendorHeader from './_sub_component/VendorHeader';

const VendorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const type = pathname.includes('/dashboard/hotel')
    ? 'hotel'
    : pathname.includes('/dashboard/club')
      ? 'club'
      : 'restaurant';

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => {}}
          onNavigate={(path) => navigate(path)}
          type={type}
        />
      </div>

      <div className="flex flex-1 relative overfow-hidden flex-col w-full">
        <VendorHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto lg:mb-14">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default VendorLayout;
