import { ChevronDown, Menu, User, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AuthVendor } from '@/types';

interface HeaderProps {
  onMenuClick: () => void;
}

const VERTICAL_TITLE: Record<string, string> = {
  hotel: 'Hotel Management System',
  club: 'Club Management System',
  restaurant: 'Restaurant Management System',
};

function verticalFromPath(pathname: string): string {
  if (pathname.includes('/dashboard/hotel')) return 'hotel';
  if (pathname.includes('/dashboard/club')) return 'club';
  return 'restaurant';
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { vendor, logout } = useAuth();
  const [profile, setProfile] = useState<AuthVendor | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    try {
      if (vendor) {
        setProfile(vendor);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error(error);
      setProfile(null);
    }
  }, [vendor]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout('vendor');
  };

  const handleProfile = () => {
    setDropdownOpen(false);
    navigate(`/dashboard/${vendor?.vendorType}/profile`);
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    navigate(`/dashboard/${vendor?.vendorType}/settings`);
  };

  return (
    <header className="relative hidden h-16 items-center border-b border-res-line bg-res-card px-6 md:flex">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="z-10 mr-3 rounded-res-sm p-2 text-res-ink-muted transition-colors outline-none hover:bg-res-surface hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Dashboard title */}
      <div className="min-w-0">
        <h1 className="font-semibold tracking-tight truncate text-gray-600">
          {VERTICAL_TITLE[verticalFromPath(pathname)]}
        </h1>
      </div>

      {/* Right side items */}
      <div className="ml-auto flex items-center gap-1.5">
        <NotificationBell />

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-label="Account menu"
            className="flex cursor-pointer items-center gap-2.5 rounded-full p-1.5 pr-2 transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            {profile?.logo ? (
              <img
                src={profile.logo}
                alt="Venue logo"
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-res-brand">
                <UserIcon className="h-5 w-5 text-res-ink-inverted" />
              </div>
            )}
            <div className="hidden text-left lg:block">
              <div className="type-res-small max-w-32 truncate font-semibold text-res-ink">
                {profile?.businessName ?? 'Venue'}
              </div>
              <div className="type-res-caption font-normal text-res-ink-muted capitalize">
                {profile?.vendorType ?? ''}
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-res-ink-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div
                aria-hidden
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-res-md border border-res-line bg-res-card shadow-res-high">
                <div className="border-b border-res-line px-4 py-3">
                  <div className="flex items-center gap-3">
                    {profile?.logo ? (
                      <img
                        src={profile.logo}
                        alt="Venue logo"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-res-brand">
                        <UserIcon className="h-5 w-5 text-res-ink-inverted" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="type-res-small truncate font-semibold text-res-ink">
                        {profile?.businessName ?? 'Venue'}
                      </div>
                      <div className="type-res-small truncate font-normal text-res-ink-muted">
                        {profile?.email ?? profile?.vendorType ?? ''}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={handleProfile}
                    className="type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand"
                  >
                    <User className="h-4 w-4 text-res-brand" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={handleSettings}
                    className="type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand"
                  >
                    <Settings className="h-4 w-4 text-res-brand" />
                    <span>Settings</span>
                  </button>
                </div>
                <div className="border-t border-res-line p-1.5">
                  <button
                    onClick={handleLogout}
                    className="type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-red-600 transition-colors outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
