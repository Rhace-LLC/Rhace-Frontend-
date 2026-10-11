import { Menu, Bell } from 'lucide-react';
import { LogoutIcon } from '../../../components/icons/icons';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

const AdminHeader = ({ onMenuClick }: AdminHeaderProps) => {
  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-res-card border-b border-res-line">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="lg:hidden mr-3 rounded-res-sm p-2 text-res-ink-muted transition-colors outline-none hover:bg-res-surface hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="type-res-h2 text-res-ink">Admin Dashboard</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="rounded-full p-2.5 text-res-ink-muted transition-colors outline-none hover:bg-res-surface hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
        >
          <Bell className="h-5 w-5" />
        </button>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-res-brand type-res-small font-semibold text-res-ink-inverted">
          A
        </span>
      </div>
    </header>
  );
};

export default AdminHeader;
