import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Building2,
  ChevronDown,
  Clock,
  DoorOpen,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { Modal } from '@/components/others/RhaceModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  staffService,
  assignmentIsActive,
  assignmentRole,
  assignmentStaffId,
  assignmentUnit,
  assignmentUnitId,
  type StaffAssignmentDto,
  type StaffAssignmentRole,
  type StaffShiftDto,
} from '@/services/staff.service';
import { floorPlanService } from '@/services/floorPlan.service';
import { physicalUnitService } from '@/services/physicalUnit.service';
import type { FloorPlanDto, FloorPlanLayoutDto, PhysicalUnitDto } from '@/types';
import { staffRoleLabel } from '../roles';
import RoomGrid from './RoomGrid';
import { roomStatusMeta } from './roomStatus';

/** Clock-in gate lives on the staff layout's Outlet context. */
interface StaffOutletContext {
  shift: StaffShiftDto | null;
}

/**
 * Every status a housekeeper may move a room to, per current state.
 * `done` feeds the confirmation toast.
 */
const STATUS_OPTIONS: Record<string, { to: string; label: string; done: string }[]> = {
  occupied: [{ to: 'vacant_dirty', label: 'Mark dirty', done: 'marked dirty' }],
  vacant_dirty: [
    { to: 'cleaning_in_progress', label: 'Start cleaning', done: 'now cleaning' },
    { to: 'out_of_order_ooo', label: 'Out of order', done: 'reported out of order' },
  ],
  cleaning_in_progress: [
    { to: 'inspected', label: 'Mark inspected', done: 'marked inspected' },
    { to: 'vacant_dirty', label: 'Back to dirty', done: 'marked dirty' },
    { to: 'out_of_order_ooo', label: 'Out of order', done: 'reported out of order' },
  ],
  inspected: [
    { to: 'vacant_clean', label: 'Mark ready', done: 'marked ready' },
    { to: 'vacant_dirty', label: 'Back to dirty', done: 'marked dirty' },
    { to: 'out_of_order_ooo', label: 'Out of order', done: 'reported out of order' },
  ],
  vacant_clean: [
    { to: 'vacant_dirty', label: 'Mark dirty', done: 'marked dirty' },
    { to: 'out_of_order_ooo', label: 'Out of order', done: 'reported out of order' },
  ],
  out_of_order_ooo: [
    { to: 'vacant_dirty', label: 'Mark dirty', done: 'marked dirty' },
    { to: 'vacant_clean', label: 'Mark ready', done: 'marked ready' },
  ],
};

const doneFor = (to: string): string =>
  Object.values(STATUS_OPTIONS)
    .flat()
    .find((o) => o.to === to)?.done ?? to.replace(/_/g, ' ');

const inputClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';
const labelClass = 'type-res-small mb-1.5 block font-medium text-res-ink-muted';

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Map each assigned unit → its real label, from the loaded layout. */
const unitLabel = (
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
 * Housekeeping workspace: one merged "stations & assignments" list (rooms
 * claimed or assigned to me), quick status steps in plain words, the room
 * grid, and a reported-issues ledger.
 */
export default function HousekeepingWorkspace() {
  const { staff } = useAuth();
  const outlet = useOutletContext<StaffOutletContext | null>();
  const onShift = Boolean(outlet?.shift);
  const myId = staff?.id ?? staff?._id ?? '';

  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [layout, setLayout] = useState<FloorPlanLayoutDto | null>(null);
  const [assignments, setAssignments] = useState<StaffAssignmentDto[]>([]);
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);

  // Claim-a-room dialog state.
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimUnitId, setClaimUnitId] = useState('');
  const [claimRole, setClaimRole] = useState<StaffAssignmentRole>('lead');
  const [claiming, setClaiming] = useState(false);

  // Reported issues.
  const [maintenance, setMaintenance] = useState<
    { unitId: string; label: string; note: string; at: string }[]
  >([]);
  const [noteForRoom, setNoteForRoom] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      // NOTE: the vendor-wide activity feed is role-gated (manager+) and isn't
      // rendered here, so it must not be fetched — a 403 would reject the
      // whole batch below and block plans + assignments from loading.
      const [plansRes, assignsRes] = await Promise.all([
        floorPlanService.list(),
        staffService.getAssignments({ date: todayKey() }),
      ]);
      const planDocs = plansRes.data?.items ?? [];
      setPlans(planDocs);
      setPlanId((current) =>
        current && planDocs.some((d) => d._id === current) ? current : planDocs[0]?._id ?? '',
      );
      setAssignments(assignsRes.docs ?? []);
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

  // Bitmap of units the current plan knows about, for label resolution.
  const units = useMemo(() => layout?.units ?? [], [layout]);

  const roomUnits = useMemo(() => {
    const candidates = units.filter(
      (u) =>
        (u as { type?: string }).type === 'room' ||
        (u as { type?: string }).type === 'room_type' ||
        (u as { type?: string }).type === 'room_zone',
    );
    return candidates.length > 0 ? candidates : units;
  }, [units]);

  // An assignment row with its label + current state in one object.
  const enrichAssigned = useCallback(
    (assign: StaffAssignmentDto, roomList: readonly PhysicalUnitDto[]): AssignedRoom | null => {
      if (assign.type !== 'room') return null;
      const refId = assignmentUnitId(assign.refId);
      // Prefer the loaded layout unit (it carries the live state); the populated
      // assignment refId is the fallback when the unit is not on this plan.
      const unit = (roomList.find((u) => u._id === refId) ?? null) as PhysicalUnitDto | null;
      const populated = assignmentUnit(assign.refId);
      if (!unit && !populated) return null;
      const state = String(unit?.state ?? populated?.state ?? 'vacant_clean');
      return {
        row: assign,
        label: unit ? unitLabel(unit._id, roomList) : populated?.label ?? refId,
        unit: {
          _id: refId,
          type: (unit as { type?: string })?.type ?? 'room',
          label: unit?.label ?? populated?.label ?? refId,
          state,
        },
        state,
      };
    },
    [],
  );

  const assignedRoomRows = useMemo((): AssignedRoom[] => {
    if (!layout) return [];
    return assignments
      .filter((a) => a.type === 'room')
      .map((a) => enrichAssigned(a, roomUnits))
      .filter(Boolean) as AssignedRoom[];
  }, [assignments, layout, roomUnits, enrichAssigned]);

  const isMyStation = useCallback(
    (assign: StaffAssignmentDto) =>
      assignmentIsActive(assign) && assignmentStaffId(assign.staff) === myId,
    [myId],
  );

  // Rooms nobody holds yet — the claim picker.
  const freeRooms = useMemo(() => {
    const held = new Set(
      assignments.filter((a) => assignmentIsActive(a)).map((a) => assignmentUnitId(a.refId)),
    );
    return roomUnits.filter((u) => !held.has(u._id));
  }, [assignments, roomUnits]);

  // Refresh after a status write.
  const refreshLayout = useCallback(() => {
    if (!planId) return;
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
      toast.success(`Room ${doneFor(to)}`);
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

  const handleClaim = async () => {
    if (!claimUnitId) return;
    try {
      setClaiming(true);
      await staffService.selfAssign({ refId: claimUnitId, action: 'claim', role: claimRole });
      toast.success('Room claimed');
      setClaimOpen(false);
      setClaimUnitId('');
      await load();
    } catch (error) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(
        code === 'STAFF_NOT_CLOCKED_IN'
          ? 'Clock in first'
          : code === 'UNIT_LEAD_TAKEN'
            ? 'Someone owns that room now'
            : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Could not claim this room',
      );
    } finally {
      setClaiming(false);
    }
  };

  const handleRelease = async (assign: StaffAssignmentDto) => {
    try {
      setBusyUnitId(assignmentUnitId(assign.refId));
      await staffService.selfAssign({
        refId: assignmentUnitId(assign.refId),
        action: 'release',
      });
      toast.success('Room released');
      await load();
    } catch {
      toast.error('Could not release this room');
    } finally {
      setBusyUnitId(null);
    }
  };

  const openNote = (unitId: string) => {
    setNoteForRoom(unitId);
    setNoteDraft('');
  };

  const submitNote = async () => {
    if (!noteForRoom || noteDraft.trim().length === 0) return;
    try {
      setNoteSubmitting(true);
      // Re-mark the room out of order with the note attached so it persists the reason.
      await physicalUnitService.transitionStatus(noteForRoom, { to: 'out_of_order_ooo', note: noteDraft.trim() });
      setNoteForRoom(null);
      setNoteDraft('');
      toast.success('Issue note recorded');
      refreshLayout();
      setMaintenance((prev) =>
        prev.some((m) => m.unitId === noteForRoom)
          ? prev.map((m) => (m.unitId === noteForRoom ? { ...m, note: noteDraft.trim(), at: new Date().toISOString() } : m))
          : prev,
      );
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to record issue note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-64 animate-pulse rounded-res-md bg-res-card shadow-res-low" />
        <div className="h-64 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
        <div className="h-64 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
      </div>
    );
  }

  const outOfOrder = assignedRoomRows.filter((r) => r.state === 'out_of_order_ooo').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="type-res-h2 flex items-center gap-2 text-res-ink">
            <Building2 className="h-5 w-5 text-res-brand" /> Housekeeping
          </h1>
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">
            {staffRoleLabel(staff?.role)} · {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plans.length > 1 && (
            <span className="relative inline-flex items-center">
              <select
                value={planId}
                aria-label="Floor plan"
                onChange={(e) => setPlanId(e.target.value)}
                className="cursor-pointer appearance-none rounded-full bg-res-card py-2.5 pr-9 pl-4 type-res-small font-semibold text-res-ink shadow-res-low outline-none focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-res-ink-muted" />
            </span>
          )}
          <button
            type="button"
            onClick={load}
            className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-card px-4 py-2.5 font-semibold text-res-ink shadow-res-low transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Merged stations + assignments */}
      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="type-res-h3 text-res-ink">
              My stations & assignments{' '}
              <span className="type-res-small rounded-full bg-res-surface px-2.5 py-0.5 font-semibold text-res-ink-muted">
                {assignedRoomRows.length}
              </span>
            </h2>
            <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
              Rooms you&apos;ve claimed or been assigned today.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setClaimOpen(true)}
            disabled={!onShift}
            title={onShift ? 'Claim an open room' : 'Clock in first'}
            className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-4 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!onShift && <Clock className="h-3.5 w-3.5" />}
            Claim a room
          </button>
        </div>

        {assignedRoomRows.length === 0 && layout ? (
          <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
            <p className="type-res-h3 text-res-ink">Nothing on your list yet</p>
            <p className="type-res-small mt-1 font-normal text-res-ink-muted">
              Claim an open room above, or check with your supervisor.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {assignedRoomRows.map((row) => {
              const options = STATUS_OPTIONS[row.state] ?? [];
              const role = assignmentRole(row.row);
              const station = isMyStation(row.row);
              const busy = busyUnitId === row.unit._id;
              const status = roomStatusMeta(row.state);
              return (
                <li
                  key={row.row._id}
                  className="rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="type-res-h3 text-res-ink">Room {row.label}</span>
                    {station && (
                      <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
                        My station
                      </span>
                    )}
                  </div>

                  <dl className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="type-res-small font-normal text-res-ink-muted">Role</dt>
                      <dd className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink capitalize">
                        {role || 'Support'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="type-res-small font-normal text-res-ink-muted">Status</dt>
                      <dd
                        className={`type-res-small inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${status.pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </dd>
                    </div>
                  </dl>

                  {options.length > 0 && (
                    <div className="mt-3 rounded-res-sm bg-res-surface p-3">
                      <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        Update status
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((option) => (
                          <button
                            key={option.to}
                            type="button"
                            disabled={busy}
                            onClick={() => changeState(row.unit._id, option.to, undefined)}
                            className="type-res-small cursor-pointer rounded-full bg-res-card px-3.5 py-2 font-semibold text-res-ink shadow-res-low transition-all outline-none hover:text-res-brand hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busy ? 'Saving…' : option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex shrink-0 flex-wrap items-center gap-1.5">
                    {station && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRelease(row.row)}
                        title="Hand this room back"
                        className="type-res-small flex cursor-pointer items-center gap-1 rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <DoorOpen className="h-3.5 w-3.5" /> Release
                      </button>
                    )}
                    {row.state === 'out_of_order_ooo' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openNote(row.unit._id)}
                        className="type-res-small flex cursor-pointer items-center gap-1 rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Wrench className="h-3.5 w-3.5" /> Note
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <h2 className="type-res-h3 mb-3 flex items-center gap-2 text-res-ink">
          <Building2 className="h-4 w-4 text-res-brand" /> Room grid
        </h2>
        {mapLoading ? (
          <div className="h-72 animate-pulse rounded-res-md bg-res-surface" />
        ) : layout ? (
          <RoomGrid units={units} reservationsByUnit={new Map()} className="max-w-5xl" />
        ) : (
          <p className="type-res-small py-8 text-center font-normal text-res-ink-muted">
            No floor plan available.
          </p>
        )}
      </section>

      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <h2 className="type-res-h3 mb-3 flex items-center gap-2 text-res-ink">
          <Wrench className="h-4 w-4 text-res-brand" /> Reported issues{' '}
          <span className="type-res-small rounded-full bg-res-surface px-2.5 py-0.5 font-semibold text-res-ink-muted">
            {outOfOrder}
          </span>
        </h2>
        {assignedRoomRows.filter((r) => r.state === 'out_of_order_ooo').length === 0 ? (
          <p className="type-res-small font-normal text-res-ink-muted">
            No rooms reported right now.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {assignedRoomRows
              .filter((r) => r.state === 'out_of_order_ooo')
              .map((row) => (
                <li
                  key={row.unit._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-res-md border border-res-line bg-res-card p-3.5 shadow-res-low"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full bg-res-surface p-2">
                      <Wrench className="h-4 w-4 text-res-brand" />
                    </span>
                    <div>
                      <p className="type-res-body font-semibold text-res-ink">Room {row.label}</p>
                      <p className="type-res-small font-normal text-res-ink-muted">
                        {maintenance.find((m) => m.unitId === row.unit._id)?.note ??
                          new Date(row.row.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNote(row.unit._id)}
                    className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
                  >
                    {maintenance.find((m) => m.unitId === row.unit._id)?.note
                      ? 'Update note'
                      : 'Add note'}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      <Modal
        isOpen={claimOpen}
        onClose={() => setClaimOpen(false)}
        title="Claim a room"
        subtitle="Take responsibility for an open room today."
        footer={
          <>
            <button
              type="button"
              onClick={() => setClaimOpen(false)}
              className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClaim}
              disabled={!claimUnitId || claiming}
              className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {claiming ? 'Claiming…' : 'Claim room'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="claim-room">
              Open rooms
            </label>
            <select
              id="claim-room"
              value={claimUnitId}
              onChange={(e) => setClaimUnitId(e.target.value)}
              className={inputClass}
            >
              <option value="">Choose a room…</option>
              {freeRooms.map((u) => (
                <option key={u._id} value={u._id}>
                  Room {u.label}
                </option>
              ))}
            </select>
            {freeRooms.length === 0 && (
              <p className="type-res-small mt-1.5 font-normal text-res-ink-muted">
                Every room is covered right now.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="claim-role">
              Your part
            </label>
            <select
              id="claim-role"
              value={claimRole}
              onChange={(e) => setClaimRole(e.target.value as StaffAssignmentRole)}
              className={inputClass}
            >
              <option value="lead">Lead — I own this room</option>
              <option value="support">Support — I help out</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!noteForRoom}
        onClose={() => setNoteForRoom(null)}
        title={`Issue note — Room ${noteForRoom ? unitLabel(noteForRoom, units) : ''}`}
        subtitle="Say what's wrong so maintenance can act on it."
        footer={
          <>
            <button
              type="button"
              onClick={() => setNoteForRoom(null)}
              className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitNote}
              disabled={noteSubmitting || noteDraft.trim().length === 0}
              className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {noteSubmitting ? 'Saving…' : 'Save note'}
            </button>
          </>
        }
      >
        <textarea
          className={`${inputClass} min-h-[96px]`}
          placeholder="e.g. Tap runs brown, AC rattles, stain on curtain…"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          autoFocus
        />
      </Modal>
    </div>
  );
}
