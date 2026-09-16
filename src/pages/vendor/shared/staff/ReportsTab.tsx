import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export default function ReportsTab() {
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
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Staff</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadReports} disabled={isFetching}>
              {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Performance by staff</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {merged.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No report data for this range yet. Metrics appear once staff-attributed orders exist.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Sales volume</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Avg prep time</TableHead>
                  <TableHead className="text-right">Voids</TableHead>
                  <TableHead className="text-right">Refunds</TableHead>
                  <TableHead className="text-right">Turnover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merged.map((row) => (
                  <TableRow key={row.staffId ?? 'unassigned'}>
                    <TableCell className="font-medium">{nameOf(row.staffId)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.salesVolume)}</TableCell>
                    <TableCell className="text-right">{row.orderCount}</TableCell>
                    <TableCell className="text-right">{formatMinutes(row.prepMs)}</TableCell>
                    <TableCell className="text-right">{row.voidCount}</TableCell>
                    <TableCell className="text-right">
                      {row.refundCount > 0
                        ? `${row.refundCount} (${formatMoney(row.refundAmount)})`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.turnoverCount} ({formatMinutes(row.avgTurnoverMs)})
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
