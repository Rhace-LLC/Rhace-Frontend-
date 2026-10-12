import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminList, type SideMenuItem } from './SideMenuList';
import { SidebarItem } from './_sub_component';
import { Menu, Search, X } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import logo from '@/public/images/Rhace-09.png';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  onMenuClick?: () => void;
}

const AdminSidebar = ({ isOpen, onClose, onMenuClick }: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, admin } = useAuth();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const isActiveRoute = (itemPath: string) => location.pathname === itemPath;

  const menuItems = AdminList.topItems.map((item) => ({
    ...item,
    active: isActiveRoute(item.path),
  }));

  const bottomItems = AdminList.bottomItems.map((item) => ({
    ...item,
    active: isActiveRoute(item.path),
  }));

  const executeLogout = () => {
    logout('admin');

    setTimeout(() => {
      navigate('/auth/admin/login');
    }, 500);

    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleItemClick = (item: SideMenuItem) => {
    if (item.label === 'Logout') {
      setIsLogoutDialogOpen(true);
      return;
    }

    navigate(item.path);
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  const adminName = admin?.fullName || admin?.name || admin?.email || 'Rhace Admin';
  const adminRole = admin?.role ? String(admin.role) : 'Administrator';

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <div className="flex w-64 flex-col bg-emerald-950 pt-0">
          {/* Logo */}
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-center rounded-md bg-[#083808] px-0 py-[13px]">
              <img src={logo} alt="Rhace Logo" className="h-[22px] w-auto object-contain" />
            </div>
          </div>

          {/* Identity */}
          <div className="border-b border-t border-white/10 px-4 py-3 mt-0">
            <div className="rounded-res-sm bg-white/10 px-3 py-2">
              <p className="type-res-small truncate font-semibold text-slate-100">{adminName}</p>
              <p className="type-res-caption font-normal text-white/60 capitalize">{adminRole}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {menuItems.map((item) => (
              <SidebarItem key={item.label} item={item} onClick={handleItemClick} />
            ))}
          </nav>

          {/* Bottom items */}
          <div className="space-y-1 border-t border-white/10 px-3 py-4">
            {bottomItems.map((item) => (
              <SidebarItem key={item.label} item={item} onClick={handleItemClick} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Navbar */}
      <div className="fixed bottom-0 right-0 left-0 z-10 flex w-full items-center gap-2 bg-transparent px-2 py-4 md:hidden">
        <button
          aria-label="Search"
          className="cursor-pointer rounded-full bg-emerald-950 p-4 text-slate-100 shadow-res-low transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white"
        >
          <Search className="size-5 shrink-0" />
        </button>
        <nav
          aria-label="Primary"
          className="flex flex-1 items-center justify-between gap-1 rounded-full bg-emerald-950 p-1 shadow-res-low"
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
              onClick={() => handleItemClick(item)}
              className={`cursor-pointer rounded-full p-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white ${
                item.active
                  ? 'bg-white text-emerald-950 shadow-res-low'
                  : 'text-slate-100/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
            </button>
          ))}
          <button
            aria-label="Open menu"
            onClick={onMenuClick}
            className="cursor-pointer rounded-full p-3 text-slate-100/70 transition-colors outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
          >
            <Menu className="h-5 w-5 shrink-0" />
          </button>
        </nav>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col bg-emerald-950 pt-2 transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Logo with close button */}
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center justify-center rounded-md bg-[#083808] px-0 py-[13px]">
              <img src={logo} alt="Rhace Logo" className="h-[19px] w-auto object-contain" />
            </div>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="cursor-pointer rounded-res-sm p-1.5 text-slate-100/70 transition-colors outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Identity */}
        <div className="border-b border-white/10 px-4 py-3">
          <div className="rounded-res-sm bg-white/10 px-3 py-2">
            <p className="type-res-small truncate font-semibold text-slate-100">{adminName}</p>
            <p className="type-res-caption font-normal text-white/60 capitalize">{adminRole}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => (
            <SidebarItem key={item.label} item={item} onClick={handleItemClick} />
          ))}
        </nav>

        {/* Bottom items */}
        <div className="space-y-1 border-t border-white/10 px-3 py-4">
          {bottomItems.map((item) => (
            <SidebarItem key={item.label} item={item} onClick={handleItemClick} />
          ))}
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmationDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        variant="danger"
        title="Confirm Logout"
        confirmationMsg="Are you sure you want to log out of your admin account?"
        onConfirm={executeLogout}
        onCancel={() => {}}
      />
    </>
  );
};

export default AdminSidebar;
