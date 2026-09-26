import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Activity as ActivityIcon, CalendarDays, ChevronDown, Loader2, RefreshCw, User } from 'lucide-react';
import { staffService, type StaffActivityDto, type StaffMember } from '@/services/staff.service';

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

/* ── Plain-word helpers (vocabulary standard: no codes, ids or raw keys) ── */

const isIdLike = (value: unknown) =>
  typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

const prettyWords = (value: string) =>
  value
    .split('_')
    .map((w) => (w.toUpperCase() === 'VIP' || w === 'vip' ? 'VIP' : w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

const prettyRole = (role?: unknown) =>
  typeof role === 'string' && role ? prettyWords(role) : undefined;

const STATE_WORDS: Record<string, string> = {
  occupied: 'Occupied',
  vacant_dirty: 'Dirty',
  cleaning_in_progress: 'Cleaning',
  inspected: 'Inspected',
  vacant_clean: 'Ready',
  out_of_order_ooo: 'Out of order',
};

const stateWord = (state?: unknown) =>
  typeof state === 'string' && state
    ? (STATE_WORDS[state] ?? prettyWords(state))
    : undefined;

const fmtDay = (value?: unknown): string | undefined => {
  if (typeof value !== 'string' || !value) return undefined;
  const day = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(day.getTime())) return undefined;
  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 86400000));
  const key = toDateKey(new Date(day.getTime() + day.getTimezoneOffset() * 60000));
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const fmtMinutes = (value?: unknown): string | undefined => {
  if (typeof value !== 'number' || value < 0) return undefined;
  const total = Math.floor(value);
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const naira = (value?: unknown): string | undefined =>
  typeof value === 'number' ? `₦${value.toLocaleString()}` : undefined;

interface ActorShape {
  name?: string;
  role?: string;
}

const actorOf = (meta: Record<string, unknown>): ActorShape | undefined => {
  const raw = meta.actor;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const { name, role } = raw as Record<string, unknown>;
    if (typeof name === 'string' && name) return { name, role: typeof role === 'string' ? role : undefined };
  }
  return undefined;
};

const coveringOf = (meta: Record<string, unknown>): string | undefined => {
  const raw = meta.responsible;
  if (!Array.isArray(raw)) return undefined;
  const names = raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => {
      const name = typeof r.name === 'string' ? r.name : undefined;
      const role = prettyRole(r.role);
      if (!name) return undefined;
      return role ? `${name} (${role})` : name;
    })
    .filter(Boolean) as string[];
  return names.length ? names.join(', ') : undefined;
};

const kindOf = (meta: Record<string, unknown>, entity?: string): 'Room' | 'Table' => {
  const type = typeof meta.type === 'string' ? meta.type : entity;
  return type === 'room' ? 'Room' : 'Table';
};

/** Prefix the kind unless the label already carries it ("Room A1", not "Room Room A1"). */
const namedKind = (kind: 'Room' | 'Table', label?: unknown): string | undefined => {
  if (typeof label !== 'string' || !label) return undefined;
  return label.toLowerCase().startsWith(kind.toLowerCase()) ? label : `${kind} ${label}`;
};

/* ── Per-action story: title + human detail lines ── */

export interface ActivityStory {
  title: string;
  lines: string[];
}

export function describeActivity(entry: StaffActivityDto): ActivityStory {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  const kind = kindOf(meta, entry.entity);
  const actor = actorOf(meta);
  const covering = coveringOf(meta);
  const day = fmtDay(meta.date ?? meta.day);

  switch (entry.action) {
    case 'room_status_change': {
      const to = stateWord(meta.toState);
      const from = stateWord(meta.fromState);
      const unit = namedKind(kind, meta.unitLabel);
      const lines = [
        from && to && from !== to ? `${from} → ${to}` : undefined,
        unit !== kind ? unit : undefined,
        actor ? `Done by ${actor.name}${actor.role ? ` (${prettyRole(actor.role)})` : ''}` : undefined,
        covering ? `Covering: ${covering}` : undefined,
        typeof meta.note === 'string' && meta.note ? `Note: ${meta.note}` : undefined,
      ].filter(Boolean) as string[];
      return { title: to ? `${kind} marked ${to.toLowerCase()}` : `${kind} updated`, lines };
    }

    case 'table_assigned':
    case 'assignment_claimed': {
      const claimed = entry.action === 'assignment_claimed';
      const lines = [
        namedKind(kind, meta.label),
        [prettyRole(meta.role), day].filter(Boolean).join(' · ') || undefined,
        !claimed && meta.actorRole === 'vendor'
          ? 'Assigned by management'
          : !claimed && meta.actorRole === 'admin'
            ? 'Assigned by an admin'
            : undefined,
      ].filter(Boolean) as string[];
      return { title: claimed ? `${kind} claimed` : `${kind} assigned`, lines };
    }

    case 'table_unassigned':
    case 'assignment_released': {
      const reason =
        meta.reason === 'manual'
          ? 'Released by hand'
          : meta.reason === 'deleted'
            ? 'Removed'
            : meta.reason === 'released_self'
              ? 'Released'
              : undefined;
      const lines = [
        [prettyRole(meta.role), day].filter(Boolean).join(' · ') || undefined,
        reason,
      ].filter(Boolean) as string[];
      return { title: `${kind} unassigned`, lines };
    }

    case 'assignment_reassigned': {
      return { title: `${kind} reassigned`, lines: day ? [day] : [] };
    }

    case 'clock_in':
      return { title: 'Clocked in', lines: [] };

    case 'clock_out': {
      const lines = [
        fmtMinutes(meta.minutesWorked) ? `Worked ${fmtMinutes(meta.minutesWorked)}` : undefined,
        typeof meta.shiftsClosed === 'number' && meta.shiftsClosed > 1
          ? `${meta.shiftsClosed} shifts closed`
          : undefined,
        meta.missedClockOutFor ? `Missed clock-out for ${fmtDay(meta.missedClockOutFor) ?? meta.missedClockOutFor}` : undefined,
      ].filter(Boolean) as string[];
      return { title: 'Clocked out', lines };
    }

    case 'check_in':
    case 'check_out': {
      const inOut = entry.action === 'check_in';
      const unit = namedKind(
        meta.kind === 'Room' || meta.kind === 'Table' ? meta.kind : kindOf(meta, entry.entity),
        meta.unitLabel,
      );
      const guest =
        typeof meta.guestName === 'string' && meta.guestName
          ? `${meta.guestName}${typeof meta.partySize === 'number' ? ` (${meta.partySize} guests)` : ''}`
          : undefined;
      const lines = [
        [unit, guest].filter(Boolean).join(' · ') || undefined,
        actor ? `Done by ${actor.name}${actor.role ? ` (${prettyRole(actor.role)})` : ''}` : undefined,
        covering ? `Covering: ${covering}` : undefined,
      ].filter(Boolean) as string[];
      return { title: inOut ? 'Guest checked in' : 'Guest checked out', lines };
    }

    case 'order_created':
      return { title: 'Order placed', lines: orderLines(meta) };
    case 'order_served':
      return { title: 'Order served', lines: orderLines(meta) };
    case 'order_voided':
      return { title: 'Order voided', lines: orderLines(meta) };
    case 'order_status_changed':
      return { title: 'Order updated', lines: orderLines(meta) };
    case 'order_transferred':
      return { title: 'Order handed over', lines: orderLines(meta) };
    case 'item_86':
      return {
        title: 'Item hidden',
        lines: typeof meta.name === 'string' && meta.name ? [meta.name] : [],
      };
    case 'item_ready':
      return {
        title: 'Item ready',
        lines: typeof meta.name === 'string' && meta.name ? [meta.name] : [],
      };
    case 'payment_collected': {
      const lines = [
        [naira(meta.amount), typeof meta.method === 'string' ? prettyWords(meta.method.replace(/^offline_/, '')) : undefined]
          .filter(Boolean)
          .join(' · ') || undefined,
        typeof meta.guestName === 'string' && meta.guestName ? `From ${meta.guestName}` : undefined,
      ].filter(Boolean) as string[];
      return { title: 'Payment collected', lines };
    }
    case 'refund': {
      const lines = [
        [naira(meta.amount), typeof meta.reason === 'string' ? meta.reason : undefined]
          .filter(Boolean)
          .join(' · ') || undefined,
      ].filter(Boolean) as string[];
      return { title: 'Refund issued', lines };
    }

    default: {
      // Unknown future actions: curated known keys only — never raw dumps.
      const lines = orderLines(meta);
      return { title: prettyWords(entry.action), lines };
    }
  }
}

/** Shared curated lines for order-ish payloads; skips ids, objects and nulls. */
function orderLines(meta: Record<string, unknown>): string[] {
  const amount =
    naira(meta.amount ?? meta.total ?? meta.price) ??
    (typeof meta.lineTotal === 'number' ? naira(meta.lineTotal) : undefined);
  const lines = [
    typeof meta.name === 'string' && meta.name ? meta.name : undefined,
    typeof meta.label === 'string' && meta.label ? meta.label : undefined,
    [amount, typeof meta.status === 'string' ? prettyWords(meta.status) : undefined]
      .filter(Boolean)
      .join(' · ') || undefined,
  ].filter(Boolean) as string[];
  return lines;
}

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
      <div className="space-y-5">
        <div className="h-20 w-full animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
        <div className="h-96 w-full animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex items-center gap-2 rounded-full bg-res-surface px-4 py-2.5 sm:w-56">
            <CalendarDays className="h-4 w-4 shrink-0 text-res-ink-muted" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Activity date"
              className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none"
            />
          </label>
          <span className="relative inline-flex items-center sm:w-56">
            <User className="pointer-events-none absolute left-4 h-4 w-4 text-res-ink-muted" />
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              aria-label="Filter by team member"
              className="w-full cursor-pointer appearance-none rounded-full bg-res-surface py-2.5 pr-9 pl-10 type-res-small font-semibold text-res-ink outline-none focus-visible:ring-2 focus-visible:ring-res-brand"
            >
              <option value="all">Everyone</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-res-ink-muted" />
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-surface px-4 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
      </section>

      {/* Feed */}
      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <h2 className="type-res-h3 text-res-ink">
          Activity ·{' '}
          {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </h2>
        <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
          What the team did, in plain words.
        </p>

        <div className="mt-4">
          {activity.length === 0 ? (
            <div className="rounded-res-md bg-res-surface px-6 py-12 text-center">
              <p className="type-res-h3 text-res-ink">Nothing recorded</p>
              <p className="type-res-small mx-auto mt-1 max-w-xs font-normal text-res-ink-muted">
                No team events on this day. Pick another date or member.
              </p>
            </div>
          ) : (
            <ul className="relative space-y-2.5 pl-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-0.5 before:rounded-full before:bg-res-line">
              {activity.map((entry) => {
                const story = describeActivity(entry);
                return (
                  <li key={entry._id} className="relative">
                    <span className="absolute top-4 -left-5 h-2.5 w-2.5 rounded-full bg-res-brand ring-4 ring-res-card" />
                    <div className="rounded-res-md border border-res-line bg-res-card p-3.5 shadow-res-low">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="type-res-body font-semibold text-res-ink">
                          {story.title}{' '}
                          <span className="font-normal text-res-ink-muted">
                            · {activityName(entry.staff, entry.staffName)}
                          </span>
                        </p>
                        <span className="type-res-small shrink-0 font-medium text-res-ink-muted tabular-nums">
                          {new Date(entry.at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {story.lines.length > 0 && (
                        <ul className="type-res-small mt-1.5 space-y-0.5 font-normal text-res-ink-muted">
                          {story.lines.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
