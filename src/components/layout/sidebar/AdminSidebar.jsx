import React from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../../redux/slices/authSlice';
import { AdminList } from './SideMenuList';
import { X } from 'lucide-react';
import { RhaceIcon } from '@/public/icons/icons';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 1. Add state to track if the confirmation dialog is open
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [pendingLogoutItem, setPendingLogoutItem] = useState(null);

  // 2. The core logout execution logic (runs ONLY after user clicks Confirm)
  const executeLogout = (item) => {
    console.log('Admin Sidebar: logging out verified');
    dispatch(logout());

    setTimeout(() => {
      navigate('/auth/admin/login');
    }, 500);

    // Close mobile menu layout upon successful action
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleItemClick = (item) => {
    if (item.label === 'Logout') {
      setIsLogoutDialogOpen(true);
      setPendingLogoutItem(item);
    } else {
      navigate(item.path);
    }
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  const isActiveRoute = (itemPath) => {
    return location.pathname === itemPath;
  };
  const menuItems = AdminList.topItems.map((item) => ({
    ...item,
    active: isActiveRoute(item.path),
  }));

  const bottomItems = AdminList.bottomItems.map((item) => ({
    ...item,
    active: isActiveRoute(item.path),
  }));

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-emerald-950 text-white">
          <div className="flex items-center h-16 px-4">
            <div className="flex items-center">
              <RhaceIcon />
              <span className="text-xl font-bold">rhace Admin</span>
            </div>
          </div>

          <nav className="flex-1 py-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className={`w-[90%] flex items-center pl-7 py-2 gap-3 rounded-tr-[36px] rounded-br-[36px] text-left transition-colors duration-200 ${
                  item.active
                    ? 'bg-teal-700 text-white shadow-[0px_1px_3px_0px_rgba(122,122,122,0.10)]'
                    : 'text-teal-100 hover:bg-teal-700 hover:text-white'
                }`}
              >
                <item.icon color="" className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px py-4 space-y-1">
            {bottomItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className={`w-[90%] flex items-center pl-7 py-2 gap-3 rounded-tr-[36px] rounded-br-[36px] text-left transition-colors duration-200 ${
                  item.active
                    ? 'bg-teal-700 text-white shadow-[0px_1px_3px_0px_rgba(122,122,122,0.10)]'
                    : 'text-teal-100 hover:bg-teal-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-emerald-950 text-white transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-teal-900">
          <div className="flex items-center">
            <RhaceIcon />
            <span className="text-xl font-bold">rhace Admin</span>
          </div>
          <button onClick={onClose} className="text-white hover:bg-teal-700 p-1 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                item.label === 'Logout' ? 'mt-16' : ''
              } ${
                item.active
                  ? 'bg-teal-700 text-white'
                  : 'text-teal-100 hover:bg-teal-700 hover:text-white'
              }`}
            >
              <item.icon color="" className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-teal-700 space-y-1">
          {bottomItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center px-3 py-2 gap-3 rounded-lg text-left transition-colors duration-200 ${
                item.active
                  ? 'bg-teal-700 text-white'
                  : 'text-teal-100 hover:bg-teal-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Add the confirmation dialog markup */}
      <ConfirmationDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        variant="danger" // "danger" or "warning" fits logout well
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

export default AdminSidebar;
