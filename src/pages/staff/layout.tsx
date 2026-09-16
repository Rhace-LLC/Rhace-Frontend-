import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Clock, LayoutDashboard, LogOut, Loader2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { staffService, type StaffShiftDto } from '@/services/staff.service';
import { staffRoleLabel } from './roles';

const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

export default function StaffLayout() {
  const { staff, logout } = useAuth();
  const navigate = useNavigate();
  const [shift, setShift] = useState<StaffShiftDto | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadShift = useCallback(async () => {
    try {
      const res = await staffService.getCurrentShift();
      setShift(res.shift);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadShift();
  }, [loadShift]);

  const handleClockToggle = async () => {
    try {
      setIsBusy(true);
      if (shift) {
        await staffService.clockOut();
        toast.success('Clocked out');
        setShift(null);
      } else {
        const created = await staffService.clockIn();
        toast.success('Clocked in');
        setShift(created);
      }
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Clock action failed',
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/staff" className="flex items-center gap-2 font-semibold text-[#0A6C6D]">
              <LayoutDashboard className="w-5 h-5" />
              Staff Workspace
            </Link>
            <Badge variant="outline" className="gap-1">
              <UserRound className="w-3 h-3" />
              {staff?.name ?? 'Staff'} · {staffRoleLabel(staff?.role)}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {shift && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                On shift since {formatTime(shift.clockInAt)}
              </span>
            )}
            <Button
              size="sm"
              variant={shift ? 'outline' : 'default'}
              onClick={handleClockToggle}
              disabled={isBusy}
              className={shift ? '' : 'bg-[#0A6C6D] hover:bg-[#085a5b]'}
            >
              {isBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 mr-1" />
              )}
              {shift ? 'Clock out' : 'Clock in'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                // Revoke the refresh token before tearing the local session down.
                await staffService.logout();
                logout('staff');
                navigate('/auth/staff/login');
              }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Outlet context={{ shift, reloadShift: loadShift }} />
      </main>
    </div>
  );
}
