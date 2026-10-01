import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Armchair, Clock, DoorOpen, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/others/RhaceModal';
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

const selectClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none focus:border-res-brand';

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

  const unitWord = unitType === 'room' ? 'room' : 'table';

  return (
    <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Armchair className="h-4 w-4 text-res-brand" />
            <h2 className="type-res-h3 text-res-ink">My stations</h2>
            <span
              className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${
                mine.length
                  ? 'bg-res-brand text-res-ink-inverted'
                  : 'bg-res-surface text-res-ink-muted'
              }`}
            >
              {mine.length}
            </span>
          </div>
          <p className="type-res-small mt-1 font-normal text-res-ink-muted">
            {unitType === 'room' ? 'Rooms' : 'Tables'} you&apos;ve claimed or been assigned
            today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            aria-label="Refresh stations"
            title="Refresh stations"
            className="type-res-small cursor-pointer rounded-full bg-res-surface p-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openClaimDialog}
            disabled={!onShift}
            title={onShift ? 'Claim an open station' : 'Clock in first'}
            className="type-res-small inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-4 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!onShift && <Clock className="h-3.5 w-3.5" />}
            Claim station
          </button>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-res-sm bg-res-surface" />
            ))}
          </div>
        ) : mine.length === 0 ? (
          <div className="rounded-res-md bg-res-surface px-6 py-8 text-center">
            <p className="type-res-h3 text-res-ink">No stations yet</p>
            <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
              {onShift
                ? `You hold no ${unitWord}s right now — claim one to get started.`
                : 'Clock in to claim or view your stations.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {mine.map((a) => {
              const unitId = assignmentUnitId(a.refId);
              const role = assignmentRole(a);
              const unitState = layout?.units.find((u) => u._id === unitId)?.state;
              const busy = busyId === a._id;
              return (
                <li
                  key={a._id}
                  className="flex flex-col gap-3 rounded-res-md border border-res-line bg-res-card p-3 shadow-res-low sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-res-sm bg-res-surface">
                      <MapPin className="h-4 w-4 text-res-brand" />
                    </span>
                    <div className="min-w-0">
                      <p className="type-res-body truncate font-semibold text-res-ink">
                        {assignmentUnitId(a.refId) ? unitLabel(unitId) : 'Station'}
                      </p>
                      <p className="type-res-small flex flex-wrap items-center gap-1.5 font-normal text-res-ink-muted">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                            role === 'lead'
                              ? 'bg-res-secondary text-res-brand'
                              : 'bg-res-surface text-res-ink-muted'
                          }`}
                        >
                          {role === 'lead' ? 'Lead' : 'Support'}
                        </span>
                        {unitState && <span className="capitalize">{stateLabel(unitState)}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => release(a._id)}
                    className="type-res-small inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <DoorOpen className="h-3.5 w-3.5" />
                    )}
                    {busy ? 'Releasing…' : 'Release'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {claimOpen && (
        <Modal
          isOpen
          onClose={() => setClaimOpen(false)}
          title="Claim a station"
          subtitle={`Pick an open ${unitWord} with a free slot`}
          footer={
            <button
              type="button"
              disabled={!claimUnitId || busyId === claimUnitId}
              onClick={submitClaim}
              className="type-res-small inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyId === claimUnitId ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Armchair className="h-3.5 w-3.5" />
              )}
              Claim station
            </button>
          }
        >
          <div className="space-y-4">
            <p className="type-res-small font-normal text-res-ink-muted">
              You take the lead slot unless the station already has an owner.
            </p>
            {claimLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-res-brand" />
              </div>
            ) : claimUnits.length === 0 ? (
              <div className="rounded-res-md bg-res-surface px-6 py-8 text-center">
                <p className="type-res-small font-medium text-res-ink-muted">
                  No open stations available right now.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label
                    className="type-res-small mb-1.5 block font-medium text-res-ink-muted"
                    htmlFor="claim-station-unit"
                  >
                    Station
                  </label>
                  <select
                    id="claim-station-unit"
                    value={claimUnitId}
                    onChange={(e) => setClaimUnitId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Choose a {unitWord}…</option>
                    {claimUnits.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.label || u._id}
                        {u.state ? ` · ${stateLabel(u.state)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="type-res-small mb-1.5 block font-medium text-res-ink-muted"
                    htmlFor="claim-station-role"
                  >
                    Slot role
                  </label>
                  <select
                    id="claim-station-role"
                    value={claimRole}
                    onChange={(e) => setClaimRole(e.target.value as StaffAssignmentRole)}
                    className={selectClass}
                  >
                    <option value="lead">Lead — own the station</option>
                    <option value="support">Support — assist on it</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
