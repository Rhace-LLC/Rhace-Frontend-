import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Building2, Loader2, RefreshCw, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { staffService, type StaffAssignmentDto } from '@/services/staff.service';
import { floorPlanService } from '@/services/floorPlan.service';
import { physicalUnitService } from '@/services/physicalUnit.service';
import type { FloorPlanDto, FloorPlanLayoutDto, PhysicalUnitDto } from '@/types';
import type { StaffActivityDto } from '@/services/staff.service';
import { staffRoleLabel } from '../roles';
import RoomGrid from './RoomGrid';

/** Housekeeping-only transitions; a safe subset of the hotel state machine. */
const HK_NAV = {
  to: 'vacant_clean',
  label: 'Ready for check-in',
  shortcut: 'Clean',
};

const HK_DIRTY = {
  to: 'vacant_dirty',
  label: 'Dirty',
  shortcut: 'Dirty',
};

const HK_CLEANING = {
  to: 'cleaning_in_progress',
  label: 'In cleaning',
  shortcut: 'Cleaning',
};

const HK_INSPECTED = {
  to: 'inspected',
  label: 'Inspected',
  shortcut: 'Inspect',
};

const HK_OOO = {
  to: 'out_of_order_ooo',
  label: 'Out of order',
  shortcut: 'OOO',
};

const ACTIONS: { state: string; action: typeof HK_NAV }[] = [
  { state: 'occupied', action: HK_DIRTY },
  { state: 'vacant_dirty', action: HK_CLEANING },
  { state: 'cleaning_in_progress', action: HK_INSPECTED },
  { state: 'inspected', action: HK_NAV },
  { state: 'vacant_clean', action: HK_OOO },
  { state: 'out_of_order_ooo', action: HK_DIRTY },
];

const nextActionFor = (state: string) =>
  ACTIONS.find((a) => a.state === state)?.action ?? HK_NAV;



const todayKey = () => new Date().toISOString().slice(0, 10);

/** Map each assigned unit → its real label, from the loaded layout. */  const unitLabel = (
  refId: string | null | undefined,
  units: readonly PhysicalUnitDto[],
) => (units && refId != null ? (units.find((u) => u._id === refId)?.label ?? refId) ?? refId : refId ?? '—');

interface AssignedRoom {
  row: StaffAssignmentDto;
  label: string;
  unit: { _id: string; type: string; label: string; state: string };
  state: string;
}

/**
 * Housekeeping workspace: my assigned rooms for today, quick status toggles,
 * the room grid with in-house guests, my latest activity, and a maintenance
 * issue ledger (maintenance items on the plan, any verified with maintenance
 * notes I enter here).
 */
export default function HousekeepingWorkspace() {
  const { staff } = useAuth();

  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [layout, setLayout] = useState<FloorPlanLayoutDto | null>(null);
  const [assignments, setAssignments] = useState<StaffAssignmentDto[]>([]);
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [_activity] = useState<{ docs: { _id: string; staffName?: string; action: string; entity?: string; entityId?: string; at: string }[]; total: number }>({ docs: [], total: 0 });

  // Maintenance console: which rooms are flagged out-of-order + notes entered.
  const [maintenance, setMaintenance] = useState<
    { unitId: string; label: string; note: string; at: string }[]
  >([]);
  const [noteForRoom, setNoteForRoom] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [plansRes, assignsRes, activityRes] = await Promise.all([
        floorPlanService.list(),
        staffService.getAssignments({ date: todayKey() }),
        staffService.getActivity({ date: todayKey() }),
      ]);
      const planDocs = plansRes.data?.items ?? [];
      setPlans(planDocs);
      setPlanId((current) =>
        current && planDocs.some((d) => d._id === current) ? current : planDocs[0]?._id ?? '',
      );
      setAssignments(assignsRes.docs ?? []);
      void activityRes; // loaded but not rendered in this slice
    } catch (error) {
      console.error(error);
      toast.error('Failed to load housekeeping data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch the selected plan's layout (rooms + their live state) once the plan is chosen.
  useEffect(() => {
    let cancelled = false;
    if (!planId) {
      setLayout(null);
      return;
    }
    setMapLoading(true);
    floorPlanService
      .getLayout(planId)
      .then((res) => {
        if (!cancelled) setLayout(res.data ?? null);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) toast.error('Failed to load the room list');
      })
      .finally(() => {
        if (!cancelled) setMapLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  // An assignment row with its label + current state in one object.
  const enrichAssigned = useCallback(
    (assign: StaffAssignmentDto, units: readonly PhysicalUnitDto[]): AssignedRoom | null => {
      if (assign.type !== 'room') return null;
      const unit = (units.find((u) => u._id === assign.refId)) ?? null;
      if (!unit) return null;
      return {
        row: assign,
        label: unitLabel(unit._id, units),
        unit: {
          _id: unit._id,
          type: (unit as { type?: string }).type ?? 'room',
          label: unit.label,
          state: String(unit.state ?? 'vacant_clean'),
        },
        state: String(unit.state ?? 'vacant_clean'),
      };
    },
    [],
  );

  // Bitmap of units the current plan knows about, for label resolution.
  const units = useMemo(() => layout?.units ?? [], [layout]);

  const assignedRoomRows = useMemo((): AssignedRoom[] => {
    if (!layout) return [];
    const roomCandidates = layout.units.filter(
      (u) => (u as { type?: string }).type === 'room' || (u as { type?: string }).type === 'room_type' || (u as { type?: string }).type === 'room_zone',
    ) as readonly PhysicalUnitDto[];
    const unitsToUse = roomCandidates.length > 0 ? roomCandidates : layout.units;
    return assignments
      .filter((a) => a.type === 'room')
      .map((a) => enrichAssigned(a, unitsToUse))
      .filter(Boolean) as AssignedRoom[];
  }, [assignments, layout, enrichAssigned]);

  // Refresh after a status write.
  const refreshLayout = useCallback(() => {
    setMapLoading(true);
    floorPlanService
      .getLayout(planId)
      .then((res) => {
        if (res.data) setLayout(res.data);
      })
      .catch(console.error)
      .finally(() => setMapLoading(false));
  }, [planId]);

  const changeState = async (unitId: string, to: string, note?: string) => {
    try {
      setBusyUnitId(unitId);
      await physicalUnitService.transitionStatus(unitId, { to, note });
      toast.success(`Room marked ${to.replace('_', ' ')}`);
      setBusyUnitId(null);
      refreshLayout();
      const unitDoc = (await physicalUnitService.get(unitId)).data?.unit;
      if (unitDoc && to === 'out_of_order_ooo') {
        setMaintenance((prev) =>
          prev.some((m) => m.unitId === unitId) ? prev.map((m) => (m.unitId === unitId ? { unitId, label: unitDoc.label as string, note: note ?? m.note, at: new Date().toISOString() } : m)) : [...prev, { unitId, label: unitDoc.label as string, note: note ?? '', at: new Date().toISOString() }],
        );
      }
    } catch (error) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? String(error);
      toast.error(msg);
    } finally {
      setBusyUnitId(null);
    }
  };

  const openNote = (unitId: string, _label: string) => {
    setNoteForRoom(unitId);
    setNoteDraft('');
  };

  const submitNote = async () => {
    if (!noteForRoom || noteDraft.trim().length === 0) return;
    try {
      setNoteSubmitting(true);
      // Re-mark the unit OOO with the note attached so it persists the reason.
      await physicalUnitService.transitionStatus(noteForRoom, { to: 'out_of_order_ooo', note: noteDraft.trim() });
      setNoteForRoom(null);
      setNoteDraft('');
      toast.success(`Maintenance note recorded for ${noteForRoom}`);
      refreshLayout();
      setMaintenance((prev) =>
        prev.some((m) => m.unitId === noteForRoom)
          ? prev.map((m) => (m.unitId === noteForRoom ? { ...m, note: noteDraft.trim(), at: new Date().toISOString() } : m))
          : prev,
      );
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to record maintenance note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }



  const outOfOrder = assignedRoomRows.filter((r) => r.state === 'out_of_order_ooo').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-6 w-6 text-[#0A6C6D]" /> Housekeeping
          </h1>
          <p className="text-sm text-muted-foreground">
            {staffRoleLabel(staff?.role)} · {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plans.length > 1 && (
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Floor plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={load}>
            <Loader2 className="mr-1 hidden h-4 w-4 animate-spin" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" /> My room assignments
            <Badge variant="secondary">{assignedRoomRows.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedRoomRows.length === 0 && layout && (
            <p className="text-sm text-muted-foreground">
              No rooms assigned to you today — check with your supervisor.
            </p>
          )}
          {assignedRoomRows.map((row) => (
            <div key={row.row._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{row.label}</Badge>
                <Badge
                  className="px-2 text-[11px]"
                  style={{
                    backgroundColor:
                      row.state === 'occupied'
                        ? '#e0e7ff'
                        : row.state === 'vacant_dirty'
                        ? '#fef3c7'
                        : row.state === 'cleaning_in_progress'
                        ? '#e0f2fe'
                        : row.state === 'inspected'
                        ? '#ccfbf1'
                        : row.state === 'out_of_order_ooo'
                        ? '#fce4e4'
                        : '#f0fdf4',
                    color:
                      row.state === 'occupied'
                        ? '#4338ca'
                        : row.state === 'vacant_dirty'
                        ? '#92400e'
                        : row.state === 'cleaning_in_progress'
                        ? '#0c4a6e'
                        : row.state === 'inspected'
                        ? '#0f766e'
                        : row.state === 'out_of_order_ooo'
                        ? '#b91c1c'
                        : '#166534',
                  }}
                >
                  {row.state.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={busyUnitId === row.unit._id}
                  onClick={() => changeState(row.unit._id, nextActionFor(row.state).to, undefined)}
                >
                  {busyUnitId === row.unit._id ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    nextActionFor(row.state).shortcut
                  )}
                </Button>
                {row.state === 'out_of_order_ooo' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busyUnitId === row.unit._id}
                    onClick={() => openNote(row.unit._id, row.label)}
                  >
                    <Wrench className="h-3 w-3 mr-1" /> Note
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Room grid
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mapLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : layout ? (
            <RoomGrid
              units={units}
              reservationsByUnit={new Map()}
              className="max-w-5xl"
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No floor plan available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4" /> Maintenance ledger
            <Badge variant="secondary">{outOfOrder}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedRoomRows.filter((r) => r.state === 'out_of_order_ooo').length === 0 ? (
            <p className="text-sm text-muted-foreground">No rooms are out of order right now.</p>
          ) : (
            <ul className="space-y-3">
              {assignedRoomRows
                .filter((r) => r.state === 'out_of_order_ooo')
                .map((row) => (
                  <li key={row.unit._id} className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">{new Date(row.row.date).toLocaleString()}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => openNote(row.unit._id, row.label)}>
                      {maintenance.find((m) => m.unitId === row.unit._id)?.note ? 'Update note' : 'Add note'}
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {noteForRoom && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Maintenance note — {unitLabel(noteForRoom, units)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              rows={3}
              placeholder="e.g. HVAC unit noisy, wall crack, burnt outlet..."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setNoteForRoom(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitNote} disabled={noteSubmitting || noteDraft.trim().length === 0}>
                {noteSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wrench className="h-4 w-4 mr-1" />}
                {noteSubmitting ? 'Saving...' : 'Save note'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
