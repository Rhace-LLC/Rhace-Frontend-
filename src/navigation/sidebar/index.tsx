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
  const { logout } = useAuth();

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
    console.log('Sidebar: logging out verified');
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

  const getBusinessName = () => {
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
        <div className="flex flex-col w-64 bg-emerald-950 text-white">
          {/* Logo */}
          <div className="flex items-center h-16 px-4">
            <div className="flex items-center">
              <img src={logo} alt="Rhace Logo" className="w-20 h-20 object-contain" />
            </div>
          </div>

          {/* Business selector */}
          <div className="px-4 py-3 border-b border-teal-700">
            <div className="bg-slate-300 text-gray-900 px-3 py-2 rounded text-sm">
              {getBusinessName()}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 space-y-1">
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
          <div className="px py-4 space-y-1">
            {bottomItems.map((item) => (
              <SidebarItem key={item.label} item={item} onClick={handleItemClick} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Navbar */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 z-10 w-full bg-transparent py-4 px-2 flex gap-2 items-center">
        <button className="p-4 bg-white rounded-full border">
          <Search className="shrink-0 size-5" />
        </button>
        <nav className="flex items-center justify-between flex-1 gap-1 bg-white border rounded-full p-1">
          {menuItems.map((item) => {
            const target = item.children?.[0]?.path ?? item.path;
            return (
              <button
                key={item.label}
                onClick={() => handleItemClick({ ...item, path: target, children: undefined })}
                className={`p-3 rounded-full ${
                  item.active
                    ? 'bg-teal-700 text-white'
                    : 'text-[#606368] hover:bg-teal-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 shrink-0 h-5" />
              </button>
            );
          })}
          <button
            onClick={() => {}}
            className={`p-3 rounded-full text-[#606368] hover:bg-teal-700 hover:text-white`}
          >
            <Menu className="w-5 shrink-0 h-5" />
          </button>
        </nav>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-teal-800 text-white transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Logo with close button */}
        <div className="flex items-center justify-between h-16 px-4 bg-teal-900">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-3">
              <div className="w-6 h-6 bg-teal-800 rounded-full"></div>
            </div>
            <span className="text-xl font-bold">Rhace</span>
          </div>
          <button onClick={onClose} className="text-white hover:bg-teal-700 p-1 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Business selector */}
        <div className="px-4 py-3 border-b border-teal-700">
          <div className="bg-teal-700 px-3 py-2 rounded text-sm">{getBusinessName()}</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => (
            <div key={item.label}>
              <button
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                  item.active
                    ? 'bg-teal-700 text-white'
                    : 'text-teal-100 hover:bg-teal-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="flex-1">{item.label}</span>
              </button>
              {item.children?.length && expandedItems[item.label] && (
                <div className="mt-1 space-y-1">
                  {item.children.map((child) => (
                    <button
                      key={child.label}
                      onClick={() => handleItemClick(child)}
                      className={`w-full flex items-center pl-10 pr-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                        child.active
                          ? 'bg-teal-700 text-white'
                          : 'text-teal-100 hover:bg-teal-700 hover:text-white'
                      }`}
                    >
                      <child.icon className="w-4 h-4 mr-3" />
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="px-4 py-4 border-t border-teal-700 space-y-1">
          {bottomItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                item.active
                  ? 'bg-teal-700 text-white'
                  : 'text-teal-100 hover:bg-teal-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
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
          console.log('Logout aborted');
          setPendingLogoutItem(null);
        }}
      />
    </>
  );
};

export default Sidebar;
