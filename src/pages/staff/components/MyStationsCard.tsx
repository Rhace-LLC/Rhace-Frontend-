import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Armchair, Clock, DoorOpen, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { floorPlanService } from '@/services/floorPlan.service';
import { physicalUnitService } from '@/services/physicalUnit.service';
import {
  staffService,
  assignmentIsActive,
  assignmentRole,
  assignmentStaffId,
  assignmentUnitId,
  type StaffAssignmentDto,
  type StaffAssignmentRole,
} from '@/services/staff.service';
import type { FloorPlanDto, FloorPlanLayoutDto, PhysicalUnitDto } from '@/types';
import type { StaffShiftDto } from '@/services/staff.service';

/** Outlet context shared by the staff layout (clock-in gating, plan §6.2). */
interface StaffOutletContext {
  shift: StaffShiftDto | null;
  reloadShift: () => Promise<void>;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

/**
 * The floor plan that holds this vertical's roster units: the hotel plan for
 * rooms, the restaurant/club plan for tables. `layout` loads from that plan.
 */
const planForUnitType = (plans: FloorPlanDto[], unitType: 'table' | 'room'): FloorPlanDto | undefined =>
  unitType === 'room'
    ? plans.find((p) => p.vertical === 'hotel') ?? plans[0]
    : plans.find((p) => p.vertical === 'restaurant' || p.vertical === 'club') ?? plans[0];

/** Friendly copy for the backend's typed error codes (plan §6.2). */
const claimErrorMessage = (error: unknown, fallback: string): string => {
  const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
  switch (code) {
    case 'STAFF_NOT_CLOCKED_IN':
      return 'Clock in first';
    case 'UNIT_LEAD_TAKEN':
      return 'Someone owns that station now';
    case 'UNIT_AT_CAPACITY':
      return 'That station already has enough staff';
    case 'ROLE_NOT_COMPATIBLE':
      return "Your role can't hold this station";
    case 'DUPLICATE_ASSIGNMENT':
      return 'You are already on this station';
    default:
      return (
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        fallback
      );
  }
};

const stateLabel = (state?: string) => (state ? state.replace(/_/g, ' ') : '');

/**
 * My stations (plan §6.2): the caller's active lead/support slots for today
 * plus Claim (free + compatible + under-capacity units) and Release. Claiming
 * is gated on clock-in via the layout's Outlet context (`shift === null` →
 * "Clock in first").
 */
export default function MyStationsCard({
  unitType,
  onChanged,
}: {
  /** The vertical's roster unit type — hotels claim rooms, others tables. */
  unitType: 'table' | 'room';
  /** Called after any claim/release so the host screen can reload its data. */
  onChanged?: () => void;
}) {
  const { staff } = useAuth();
  const outlet = useOutletContext<StaffOutletContext | null>();
  const onShift = Boolean(outlet?.shift);

  const [assignments, setAssignments] = useState<StaffAssignmentDto[]>([]);
  const [layout, setLayout] = useState<FloorPlanLayoutDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimUnits, setClaimUnits] = useState<PhysicalUnitDto[]>([]);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimUnitId, setClaimUnitId] = useState('');
  const [claimRole, setClaimRole] = useState<StaffAssignmentRole>('lead');
  const [busyId, setBusyId] = useState<string | null>(null);

  const myId = staff?.id ?? staff?._id ?? '';

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [assigns, plansRes] = await Promise.all([
        staffService.getAssignments({ date: todayKey() }),
        floorPlanService.list({ limit: 50 }),
      ]);
      setAssignments(assigns.docs ?? []);
      const plans: FloorPlanDto[] = plansRes.data?.items ?? [];
      const planId = planForUnitType(plans, unitType)?._id;
      if (planId) {
        const layoutRes = await floorPlanService.getLayout(planId);
        setLayout(layoutRes.data ?? null);
      } else {
        setLayout(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [unitType]);

  useEffect(() => {
    load();
  }, [load]);

  // My active slots on this unit type, lead first (plan §6.2).
  const mine = useMemo(
    () =>
      assignments
        .filter(
          (a) =>
            assignmentIsActive(a) &&
            assignmentStaffId(a.staff) === myId &&
            (unitType === 'room' ? a.type === 'room' : a.type !== 'room'),
        )
        .sort((a, b) => (assignmentRole(a) === 'lead' ? -1 : 1) - (assignmentRole(b) === 'lead' ? -1 : 1)),
    [assignments, myId, unitType],
  );

  const unitLabel = useCallback(
    (unitId: string) =>
      layout?.units.find((u) => u._id === unitId)?.label ?? `#${unitId.slice(-4)}`,
    [layout],
  );

  const openClaimDialog = async () => {
    setClaimOpen(true);
    setClaimLoading(true);
    setClaimUnitId('');
    try {
      // Load the roster plan's units so the caller only sees stations that exist.
      const plansRes = await floorPlanService.list({ limit: 50 });
      const plans: FloorPlanDto[] = plansRes.data?.items ?? [];
      const planId = planForUnitType(plans, unitType)?._id;
      if (!planId) {
        setClaimUnits([]);
        return;
      }
      const unitsRes = await physicalUnitService.list(planId, { limit: 200 });
      const units: PhysicalUnitDto[] = unitsRes.data?.items ?? [];
      // Only units nobody holds a slot on yet — the backend still enforces
      // lead uniqueness, capacity, role compatibility and clock-in on submit.
      const held = new Set(
        assignments
          .filter((a) => assignmentIsActive(a))
          .map((a) => assignmentUnitId(a.refId)),
      );
      setClaimUnits(units.filter((u) => !held.has(u._id)));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load stations');
    } finally {
      setClaimLoading(false);
    }
  };

  const submitClaim = async () => {
    if (!claimUnitId) return;
    try {
      setBusyId(claimUnitId);
      await staffService.selfAssign({ refId: claimUnitId, action: 'claim', role: claimRole });
      toast.success('Station claimed');
      setClaimOpen(false);
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(claimErrorMessage(error, 'Could not claim this station'));
    } finally {
      setBusyId(null);
    }
  };

  const release = async (assignmentId: string) => {
    try {
      setBusyId(assignmentId);
      await staffService.selfAssign({ refId: assignmentUnitId(
        assignments.find((a) => a._id === assignmentId)?.refId ?? null,
      ), action: 'release' });
      toast.success('Station released');
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(claimErrorMessage(error, 'Could not release this station'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Armchair className="h-4 w-4 text-[#0A6C6D]" /> My stations
            <Badge variant="secondary">{mine.length}</Badge>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {unitType === 'room' ? 'Rooms' : 'Tables'} you&apos;ve claimed or been assigned today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            className="bg-[#0A6C6D] hover:bg-[#085a5b]"
            onClick={openClaimDialog}
            disabled={!onShift}
            title={onShift ? 'Claim an open station' : 'Clock in first'}
          >
            {!onShift && <Clock className="mr-1 h-3 w-3" />}
            Claim station
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {onShift
              ? `You hold no ${unitType === 'room' ? 'rooms' : 'tables'} right now — claim one to get started.`
              : 'Clock in to claim or view your stations.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {mine.map((a) => {
              const unitId = assignmentUnitId(a.refId);
              const role = assignmentRole(a);
              const unitState = layout?.units.find((u) => u._id === unitId)?.state;
              return (
                <li
                  key={a._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#0A6C6D]" />
                    <span className="font-medium">
                      {assignmentUnitId(a.refId) ? unitLabel(unitId) : 'Station'}
                    </span>
                    <Badge
                      variant="outline"
                      className={role === 'lead' ? 'border-[#0A6C6D] text-[#0A6C6D]' : ''}
                    >
                      {role === 'lead' ? 'Lead' : 'Support'}
                    </Badge>
                    {unitState && (
                      <span className="text-xs capitalize text-muted-foreground">
                        {stateLabel(unitState)}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busyId === a._id}
                    onClick={() => release(a._id)}
                  >
                    {busyId === a._id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <DoorOpen className="mr-1 h-3 w-3" />
                    )}
                    Release
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Claim a station</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pick an open {unitType === 'room' ? 'room' : 'table'} that has free slots. You take
              the lead slot unless the station already has an owner.
            </p>
            {claimLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#0A6C6D]" />
              </div>
            ) : claimUnits.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No open stations available right now.
              </p>
            ) : (
              <>
                <Select value={claimUnitId} onValueChange={setClaimUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Choose a ${unitType === 'room' ? 'room' : 'table'}…`} />
                  </SelectTrigger>
                  <SelectContent>
                    {claimUnits.map((u) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.label || u._id}
                        {u.state ? ` · ${stateLabel(u.state)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={claimRole} onValueChange={(v) => setClaimRole(v as StaffAssignmentRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Slot role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead — own the station</SelectItem>
                    <SelectItem value="support">Support — assist on it</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="w-full bg-[#0A6C6D] hover:bg-[#085a5b]"
                  disabled={!claimUnitId || busyId === claimUnitId}
                  onClick={submitClaim}
                >
                  {busyId === claimUnitId ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Armchair className="mr-1 h-4 w-4" />
                  )}
                  Claim station
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
