import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Search, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClubList, HotelList, RestaurantList, type SideMenuItem } from './SideMenuList';
import { SidebarItem } from './_sub_component';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import logo from '@/public/images/Rhace-09.png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  type?: string;
}

// Hook to get current menu configuration
const useMenuConfig = (businessType?: string) => {
  const location = useLocation();

  const getMenuList = () => {
    return businessType === 'hotel'
      ? HotelList
      : businessType === 'restaurant'
        ? RestaurantList
        : businessType === 'club'
          ? ClubList
          : ClubList;
  };

  const isActiveRoute = (itemPath: string) => location.pathname === itemPath;

  const withActive = (item: SideMenuItem): SideMenuItem => {
    const children = item.children?.map((child) => ({
      ...child,
      active: isActiveRoute(child.path),
    }));
    const active =
      isActiveRoute(item.path) || (children?.some((child) => child.active) ?? false);
    return { ...item, active, children };
  };

  const menuList = getMenuList();

  const menuItems = menuList.topItems.map(withActive);
  const bottomItems = menuList.bottomItems.map(withActive);

  return { menuItems, bottomItems, businessType };
};

const Sidebar = ({ isOpen, onClose, onNavigate, type }: SidebarProps) => {
  const { menuItems, bottomItems } = useMenuConfig(type);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, vendor } = useAuth();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [pendingLogoutItem, setPendingLogoutItem] = useState<SideMenuItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Auto-expand the group that contains the active route.
  useEffect(() => {
    const next: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.children?.some((child) => child.active)) next[item.label] = true;
    });
    setExpandedItems((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, type]);

  const executeLogout = (item: SideMenuItem) => {
    logout('vendor');

    setTimeout(() => {
      navigate('/auth/vendor/login');
    }, 500);

    if (onNavigate) onNavigate(item.path);
    if (onClose && window.innerWidth < 1024) onClose();
  };

  const handleItemClick = (item: SideMenuItem) => {
    if (item.children?.length) {
      setExpandedItems((prev) => ({ ...prev, [item.label]: !prev[item.label] }));
      return;
    }

    if (item.label === 'Logout') {
      setPendingLogoutItem(item);
      setIsLogoutDialogOpen(true);
      return;
    }

    if (onNavigate) {
      onNavigate(item.path);
    }
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  // The venue name per the presentation vocabulary (never "Vendor").
  const getBusinessName = () => {
    if (vendor?.businessName) return vendor.businessName;
    return type === 'hotel'
      ? 'Hotel 1 - HQ'
      : type === 'restaurant'
        ? 'Restaurant 1 - HQ'
        : 'Club 1 - HQ';
  };

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

          {/* Business selector */}
          <div className="border-b border-t border-white/10 px-4 py-3 mt-0">
            <div className="rounded-res-sm bg-white/10 px-3 py-2">
              <p className="type-res-small truncate font-semibold text-slate-100">
                {getBusinessName()}
              </p>
              <p className="type-res-caption font-normal text-white/60 capitalize">
                {type ?? 'Venue'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {menuItems.map((item) => (
              <div key={item.label}>
                <SidebarItem
                  item={item}
                  onClick={handleItemClick}
                  hasChildren={!!item.children?.length}
                  expanded={!!expandedItems[item.label]}
                />
                {item.children?.length && expandedItems[item.label] && (
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => (
                      <SidebarItem
                        key={child.label}
                        item={child}
                        onClick={handleItemClick}
                        indent
                      />
                    ))}
                  </div>
                )}
              </div>
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
          {menuItems.map((item) => {
            const target = item.children?.[0]?.path ?? item.path;
            return (
              <button
                key={item.label}
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
                onClick={() => handleItemClick({ ...item, path: target, children: undefined })}
                className={`cursor-pointer rounded-full p-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  item.active
                    ? 'bg-white text-emerald-950 shadow-res-low'
                    : 'text-slate-100/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
              </button>
            );
          })}
          <button
            aria-label="Open menu"
            onClick={() => {}}
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

        {/* Business selector */}
        <div className="border-b border-white/10 px-4 py-3">
          <div className="rounded-res-sm bg-white/10 px-3 py-2">
            <p className="type-res-small truncate font-semibold text-slate-100">
              {getBusinessName()}
            </p>
            <p className="type-res-caption font-normal text-white/60 capitalize">
              {type ?? 'Venue'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => (
            <div key={item.label}>
              <SidebarItem
                item={item}
                onClick={handleItemClick}
                hasChildren={!!item.children?.length}
                expanded={!!expandedItems[item.label]}
              />
              {item.children?.length && expandedItems[item.label] && (
                <div className="mt-1 space-y-1">
                  {item.children.map((child) => (
                    <SidebarItem
                      key={child.label}
                      item={child}
                      onClick={handleItemClick}
                      indent
                    />
                  ))}
                </div>
              )}
            </div>
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
        confirmationMsg="Are you sure you want to log out of your vendor account?"
        onConfirm={() => {
          if (pendingLogoutItem) {
            executeLogout(pendingLogoutItem);
          }
        }}
        onCancel={() => {
          setPendingLogoutItem(null);
        }}
      />
    </>
  );
};

export default Sidebar;
