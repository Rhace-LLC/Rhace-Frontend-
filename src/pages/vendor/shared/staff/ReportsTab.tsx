import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { BarChart3, Building2, Calendar, ChevronDown, Loader2, RefreshCw, User } from 'lucide-react';
import {
  staffService,
  type StaffBranchOption,
  type StaffMember,
  type StaffReports,
  type StaffReportRow,
} from '@/services/staff.service';

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

const formatMinutes = (ms?: number | null) =>
  ms == null ? '—' : `${(ms / 60000).toFixed(1)} min`;

const formatMoney = (value?: number) =>
  value == null ? '—' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);

interface MergedRow {
  staffId: string | null;
  salesVolume: number;
  orderCount: number;
  prepMs: number | null;
  voidCount: number;
  refundCount: number;
  refundAmount: number;
  turnoverCount: number;
  avgTurnoverMs: number | null;
}

export function ReportsTab({ onRefresh }: { onRefresh?: () => void }) {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toDateKey(d);
  });
  const [to, setTo] = useState(() => toDateKey(new Date()));
  const [staffId, setStaffId] = useState('all');
  const [branchId, setBranchId] = useState('all');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<StaffBranchOption[]>([]);
  const [reports, setReports] = useState<StaffReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const res = await staffService.getStaff({ limit: 200 });
      setStaff(res.docs || []);
    } catch {
      // non-fatal
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const res = await staffService.listBranches();
      setBranches(res.docs || []);
    } catch {
      // non-fatal: the branch filter simply stays hidden
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      setIsFetching(true);
      const res = await staffService.getReports({
        from: new Date(from).toISOString(),
        to: new Date(`${to}T23:59:59`).toISOString(),
        staffId: staffId === 'all' ? undefined : staffId,
        branchId: branchId === 'all' ? undefined : branchId,
      });
      setReports(res);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load reports');
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  }, [from, to, staffId, branchId]);

  useEffect(() => {
    loadStaff();
    loadBranches();
  }, [loadStaff, loadBranches]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleRefresh = () => {
    loadReports();
    onRefresh?.();
  };

  const staffMap = useMemo(() => {
    const map = new Map<string, StaffMember>();
    staff.forEach((s) => map.set(s._id, s));
    return map;
  }, [staff]);

  const merged = useMemo<MergedRow[]>(() => {
    if (!reports) return [];
    const rows = new Map<string, MergedRow>();
    const ensure = (id: string | null): MergedRow => {
      const key = id ?? 'unassigned';
      if (!rows.has(key)) {
        rows.set(key, {
          staffId: id,
          salesVolume: 0,
          orderCount: 0,
          prepMs: null,
          voidCount: 0,
          refundCount: 0,
          refundAmount: 0,
          turnoverCount: 0,
          avgTurnoverMs: null,
        });
      }
      return rows.get(key) as MergedRow;
    };

    reports.sales?.forEach((r: StaffReportRow) => {
      const row = ensure(r._id);
      row.salesVolume = r.salesVolume ?? 0;
      row.orderCount = r.orderCount ?? 0;
    });
    reports.prepSpeed?.forEach((r: StaffReportRow) => {
      const row = ensure(r._id);
      row.prepMs = r.totalPrepMs && r.orderCount ? r.totalPrepMs / r.orderCount : null;
    });
    reports.voids?.forEach((r: StaffReportRow) => {
      ensure(r._id).voidCount = r.voidCount ?? 0;
    });
    reports.refunds?.forEach((r: StaffReportRow) => {
      const row = ensure(r._id);
      row.refundCount = r.refundCount ?? 0;
      row.refundAmount = r.refundAmount ?? 0;
    });
    reports.turnover?.forEach((r: StaffReportRow) => {
      const row = ensure(r._id);
      row.turnoverCount = r.turnoverCount ?? 0;
      row.avgTurnoverMs = r.avgTurnoverMs ?? null;
    });

    return [...rows.values()].sort((a, b) => b.salesVolume - a.salesVolume);
  }, [reports]);

  const nameOf = (id: string | null) =>
    id ? staffMap.get(id)?.name ?? 'Unknown staff' : 'Unassigned';

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-3xl border border-teal-100/60 shadow-xs space-y-6">
        <div className="h-20 w-full bg-white border border-teal-100 rounded-2xl animate-pulse" />
        <div className="h-80 w-full bg-white border border-teal-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white rounded-3xl">
      {/* Cohesive Header & Filter Panel */}
      <div className="bg-white border border-teal-100/80 rounded-2xl p-5 shadow-xs transition-all">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          
          {/* From Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-slate-800 text-sm outline-none transition-all"
            />
          </div>

          {/* To Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-slate-800 text-sm outline-none transition-all"
            />
          </div>

          {/* Branch Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              Branch
            </label>
            <div className="relative">
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full h-10 px-3 pr-8 bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-slate-800 text-sm outline-none appearance-none transition-all cursor-pointer font-medium"
              >
                <option value="all">All branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
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

          {/* Action Button */}
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-10 px-5 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Reports Display Box */}
      <div className="bg-white border border-teal-100/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-teal-50 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Performance by staff</h2>
              <p className="text-xs text-slate-500 font-medium">
                Operational metrics and aggregate revenue by team member
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white">
          {merged.length === 0 ? (
            <div className="py-20 px-4 text-center bg-white flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3">
                <BarChart3 className="w-6 h-6" />
              </div>
              <p className="text-slate-800 font-bold text-sm mb-1">
                No report data recorded
              </p>
              <p className="text-slate-400 text-xs max-w-xs">
                Metrics appear once staff-attributed orders exist within the selected range.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-teal-100/60 bg-white">
                    <th className="py-3.5 pl-6 pr-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Sales Volume
                    </th>
                    <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Orders
                    </th>
                    <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Avg Prep Time
                    </th>
                    <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Voids
                    </th>
                    <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Refunds
                    </th>
                    <th className="py-3.5 pl-4 pr-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Turnover
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-50 bg-white">
                  {merged.map((row) => (
                    <tr
                      key={row.staffId ?? 'unassigned'}
                      className="hover:bg-teal-50/30 transition-colors group"
                    >
                      <td className="py-4 pl-6 pr-4 text-sm font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">
                        {nameOf(row.staffId)}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-900 font-mono text-right">
                        {formatMoney(row.salesVolume)}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-slate-700 text-right">
                        {row.orderCount}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-600 text-right">
                        {formatMinutes(row.prepMs)}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-600 text-right">
                        {row.voidCount}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-600 text-right">
                        {row.refundCount > 0
                          ? `${row.refundCount} (${formatMoney(row.refundAmount)})`
                          : '—'}
                      </td>
                      <td className="py-4 pl-4 pr-6 text-sm font-medium text-slate-600 text-right">
                        {row.turnoverCount} ({formatMinutes(row.avgTurnoverMs)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}