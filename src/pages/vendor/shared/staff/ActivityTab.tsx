import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Activity as ActivityIcon, Calendar, ChevronDown, Loader2, RefreshCw, User } from 'lucide-react';
import { staffService, type StaffActivityDto, type StaffMember } from '@/services/staff.service';

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

const labelForAction = (action: string) =>
  action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const activityName = (value: StaffActivityDto['staff'], fallback?: string) =>
  typeof value === 'object' && value ? value.name || 'Staff' : fallback || 'Staff';

export function ActivityTab({ onRefresh }: { onRefresh?: () => void }) {
  const [date, setDate] = useState(toDateKey(new Date()));
  const [staffId, setStaffId] = useState('all');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activity, setActivity] = useState<StaffActivityDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsFetching(true);
      const res = await staffService.getActivity({
        date,
        staffId: staffId === 'all' ? undefined : staffId,
        limit: 200,
      });
      setActivity(res.docs || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load activity');
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  }, [date, staffId]);

  useEffect(() => {
    staffService
      .getStaff({ limit: 200 })
      .then((res) => setStaff(res.docs || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    load();
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-3xl border border-teal-100/60 shadow-xs space-y-6">
        <div className="h-20 w-full bg-white border border-teal-100 rounded-2xl animate-pulse" />
        <div className="h-96 w-full bg-white border border-teal-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 ">
      {/* Control Bar Panel */}

<div className="flex justify-end">
        <div className="w-full max-w-xl bg-white border border-teal-100/80 rounded-2xl p-5 shadow-xs transition-all">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            
            {/* Date Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-slate-800 text-sm outline-none transition-all"
              />
            </div>

            {/* Staff Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                Staff
              </label>
              <div className="relative">
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full h-10 px-3 pr-8 bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-slate-800 text-sm outline-none appearance-none transition-all cursor-pointer font-medium"
                >
                  <option value="all">All staff</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Activity Timeline Feed */}
      <div className="bg-white border border-teal-100/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-teal-50 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <ActivityIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Activity feed — {date}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Real-time log of staff operations and system actions
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3">
                <ActivityIcon className="w-6 h-6" />
              </div>
              <p className="text-slate-800 font-bold text-sm mb-1">
                No recorded activity
              </p>
              <p className="text-slate-400 text-xs max-w-xs">
                There are no staff events logged for this day. Select another date or clear filters.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-teal-100/80">
              {activity.map((entry) => (
                <div key={entry._id} className="relative group">
                  {/* Timeline Node */}
                  <div className="absolute -left-[23.5px] top-1.5 w-3 h-3 rounded-full bg-white ring-4 ring-white border-2 border-teal-600 shadow-2xs group-hover:scale-125 transition-transform" />

                  <div className="bg-white p-4 rounded-2xl border border-teal-100/80 shadow-xs group-hover:border-teal-200 transition-all space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-teal-50 text-teal-700 border border-teal-100 font-semibold text-[11px] px-2.5 py-0.5 rounded-md">
                          {labelForAction(entry.action)}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {activityName(entry.staff, entry.staffName)}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-400">
                        {new Date(entry.at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {entry.entity && (
                      <p className="text-xs font-medium text-slate-600 leading-relaxed pl-0.5">
                        <span className="text-slate-800 font-semibold">{entry.entity}</span>
                        {entry.metadata && Object.keys(entry.metadata).length > 0
                          ? ` · ${Object.entries(entry.metadata)
                              .map(([k, v]) => `${k}:${String(v)}`)
                              .join(', ')}`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}