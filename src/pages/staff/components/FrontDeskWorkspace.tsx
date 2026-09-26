import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Building2,
  CalendarClock,
  ChevronDown,
  ConciergeBell,
  Loader2,
  LogIn,
  LogOut,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder } from '@/features/orders/api/hooks';
import { ordersApi } from '@/features/orders/api/service';
import { OrderBuilder } from '@/features/orders';
import { money } from '@/features/orders/money';
import { paymentLabel } from '@/features/reservations';
import type { CreateOrderLineInput, OrderDto } from '@/features/orders/types';
import { floorPlanService } from '@/services/floorPlan.service';
import { unitReservationService } from '@/services/unitReservation.service';
import type { FloorPlanDto, FloorPlanLayoutDto, UnitReservationDto } from '@/types';
import RoomGrid from './RoomGrid';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

const when = (value?: string) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/** Hotel plans first — the desk only works rooms. */
const defaultPlanId = (plans: FloorPlanDto[]) =>
  plans.find((p) => p.vertical === 'hotel')?._id ?? plans[0]?._id ?? '';

const apiMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

/** A counter tile for the desk numbers. */
function Stat({
  label,
  value,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low">
      <div className="flex items-center justify-between gap-2">
        <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
          {label}
        </p>
        <span className="rounded-full bg-res-surface p-1.5">
          <Icon className="h-4 w-4 text-res-brand" />
        </span>
      </div>
      <p className={`type-res-h2 mt-1 ${highlight && value > 0 ? 'text-res-brand' : 'text-res-ink'}`}>
        {value}
      </p>
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  ariaLabel,
  className,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-full bg-res-card py-2.5 pr-9 pl-4 type-res-small font-semibold text-res-ink shadow-res-low outline-none focus-visible:ring-2 focus-visible:ring-res-brand"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-res-ink-muted" />
    </span>
  );
}

export default function FrontDeskWorkspace() {
  const { staff } = useAuth();
  const createOrder = useCreateOrder();

  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [layout, setLayout] = useState<FloorPlanLayoutDto | null>(null);
  const [arrivals, setArrivals] = useState<UnitReservationDto[]>([]);
  const [inHouse, setInHouse] = useState<UnitReservationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [busyReservationId, setBusyReservationId] = useState<string | null>(null);
  // Bumping this re-reads the layout after a state-changing desk action.
  const [layoutNonce, setLayoutNonce] = useState(0);

  // Room-charge console
  const [tabReservationId, setTabReservationId] = useState('');
  const [tabOrder, setTabOrder] = useState<OrderDto | null>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [plansRes, arrivalsRes, inHouseRes] = await Promise.all([
        floorPlanService.list(),
        // Arrivals = reservations whose stay starts today.
        unitReservationService.list({ from: startOfToday(), to: endOfToday(), limit: 100 }),
        // In-house = reservations the desk has already checked in.
        unitReservationService.list({ status: 'active', limit: 100 }),
      ]);
      const docs = plansRes.data?.items ?? [];
      setPlans(docs);
      setPlanId((current) =>
        current && docs.some((d) => d._id === current) ? current : defaultPlanId(docs),
      );
      setArrivals(arrivalsRes.data?.items ?? []);
      setInHouse(inHouseRes.data?.items ?? []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load the front desk board');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
  }, [planId, layoutNonce]);

  const refresh = useCallback(async () => {
    await load();
    setLayoutNonce((n) => n + 1);
  }, [load]);

  const units = useMemo(() => layout?.units ?? [], [layout]);

  const unitLabel = useCallback(
    (unitId?: string | null) =>
      units.find((u) => u._id === unitId)?.label ?? (unitId ? `Room ${unitId.slice(-4)}` : '—'),
    [units],
  );

  /** The reservation that currently holds each room: in-house beats a due arrival. */
  const reservationsByUnit = useMemo(() => {
    const map = new Map<string, UnitReservationDto>();
    for (const r of [...arrivals, ...inHouse]) {
      if (!r.unitId) continue;
      const existing = map.get(r.unitId);
      if (!existing || r.status === 'active') map.set(r.unitId, r);
    }
    return map;
  }, [arrivals, inHouse]);

  const dueIn = useMemo(
    () => arrivals.filter((r) => r.status === 'upcoming'),
    [arrivals],
  );
  const dueOut = useMemo(() => {
    const end = new Date(endOfToday()).getTime();
    return inHouse.filter((r) => !r.end || new Date(r.end).getTime() <= end);
  }, [inHouse]);
  const outOfOrder = units.filter((u) => u.state === 'out_of_order_ooo').length;
  const dirty = units.filter((u) =>
    ['vacant_dirty', 'cleaning_in_progress'].includes(u.state),
  ).length;

  const changeReservation = async (kind: 'checkIn' | 'checkOut', r: UnitReservationDto) => {
    try {
      setBusyReservationId(r._id);
      if (kind === 'checkIn') await unitReservationService.checkIn(r._id);
      else await unitReservationService.checkOut(r._id);
      toast.success(
        kind === 'checkIn'
          ? `${r.guestName} checked into Room ${unitLabel(r.unitId)}`
          : `${r.guestName} checked out`,
      );
      await refresh();
    } catch (error) {
      toast.error(apiMessage(error) || `Failed to ${kind === 'checkIn' ? 'check in' : 'check out'}`);
    } finally {
      setBusyReservationId(null);
    }
  };

  // The room's running bill (order attached to its reservation / booking group).
  const loadTab = useCallback(async (reservationId: string) => {
    if (!reservationId) {
      setTabOrder(null);
      return;
    }
    try {
      setTabLoading(true);
      const res = await ordersApi.getByReservation(reservationId);
      setTabOrder(res.order ?? null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load the room bill');
      setTabOrder(null);
    } finally {
      setTabLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTab(tabReservationId);
  }, [tabReservationId, loadTab]);

  const tabReservation = useMemo(
    () => inHouse.find((r) => r._id === tabReservationId) ?? null,
    [inHouse, tabReservationId],
  );

  const handleCharge = async (lines: CreateOrderLineInput[]) => {
    if (!tabReservation) return;
    try {
      setSubmitting(true);
      await createOrder.mutateAsync({
        source: 'reservation',
        vendorId: staff?.vendor,
        reservation: tabReservation._id,
        bookingGroup: tabReservation.bookingGroup ?? undefined,
        unitId: tabReservation.unitId ?? undefined,
        guestName: tabReservation.guestName,
        guestPhone: tabReservation.guestPhone,
        guestEmail: tabReservation.guestEmail,
        vertical: layout?.plan.vertical,
        lines,
      });
      toast.success(`Charge posted to Room ${unitLabel(tabReservation.unitId)}`);
      setPadOpen(false);
      await loadTab(tabReservation._id);
    } catch (error) {
      toast.error(apiMessage(error) || 'Failed to post the charge');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-64 animate-pulse rounded-res-md bg-res-card shadow-res-low" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-res-md bg-res-card shadow-res-low" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
      </div>
    );
  }

  const vertical = layout?.plan.vertical ?? 'hotel';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="type-res-h2 flex items-center gap-2 text-res-ink">
            <ConciergeBell className="h-5 w-5 text-res-brand" /> Front desk
          </h1>
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            · arrivals, in-house rooms and room charges
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plans.length > 1 && (
            <NativeSelect value={planId} onChange={setPlanId} ariaLabel="Floor plan">
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          )}
          <button
            type="button"
            onClick={refresh}
            className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-card px-4 py-2.5 font-semibold text-res-ink shadow-res-low transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Arrivals due" value={dueIn.length} icon={LogIn} />
        <Stat label="In-house" value={inHouse.length} icon={Building2} />
        <Stat label="Due out" value={dueOut.length} icon={LogOut} />
        <Stat label="Not ready" value={dirty + outOfOrder} icon={CalendarClock} highlight />
      </div>

      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <h2 className="type-res-h3 mb-3 flex items-center gap-2 text-res-ink">
          <LogIn className="h-4 w-4 text-res-brand" /> Arrivals today{' '}
          <span className="type-res-small rounded-full bg-res-surface px-2.5 py-0.5 font-semibold text-res-ink-muted">
            {dueIn.length}
          </span>
        </h2>
        {dueIn.length === 0 ? (
          <p className="type-res-small font-normal text-res-ink-muted">
            No arrivals left to check in today.
          </p>
        ) : (
          <ul className="divide-y divide-res-line">
            {dueIn.map((r) => (
              <li
                key={r._id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="type-res-body font-semibold text-res-ink">
                    Room {unitLabel(r.unitId)} · {r.guestName}
                    {r.partySize ? (
                      <span className="type-res-small ml-2 font-normal text-res-ink-muted">
                        {r.partySize} guest{r.partySize === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </p>
                  <p className="type-res-small font-normal text-res-ink-muted">
                    In {when(r.start)} → out {when(r.end)}
                    {r.paymentStatus ? ` · ${paymentLabel(r.paymentStatus)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyReservationId === r._id}
                  onClick={() => changeReservation('checkIn', r)}
                  className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyReservationId === r._id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogIn className="h-3.5 w-3.5" />
                  )}
                  Check in
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <h2 className="type-res-h3 mb-3 flex items-center gap-2 text-res-ink">
          <Receipt className="h-4 w-4 text-res-brand" /> Room charges
        </h2>
        <NativeSelect
          value={tabReservationId}
          onChange={setTabReservationId}
          ariaLabel="Choose an in-house room"
          className="w-full sm:w-80"
          placeholder="Choose an in-house room"
        >
          {inHouse.length === 0 ? (
            <option value="" disabled>
              No guests are checked in
            </option>
          ) : (
            inHouse.map((r) => (
              <option key={r._id} value={r._id}>
                Room {unitLabel(r.unitId)} · {r.guestName}
              </option>
            ))
          )}
        </NativeSelect>

        <div className="mt-3">
          {tabLoading ? (
            <div className="h-32 animate-pulse rounded-res-md bg-res-surface" />
          ) : tabReservation && tabOrder ? (
            <div className="rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="type-res-body font-semibold text-res-ink">
                    Room {unitLabel(tabReservation.unitId)} · {tabReservation.guestName}
                  </p>
                  <p className="type-res-small font-normal text-res-ink-muted">
                    {tabOrder.status} · {tabOrder.lines?.length ?? 0} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="type-res-h3 text-res-ink">{money(tabOrder.total)}</p>
                  <p className="type-res-small font-normal text-res-ink-muted">
                    Paid {money(tabOrder.amountPaid)} · still to pay {money(tabOrder.balance)}
                  </p>
                </div>
              </div>
              {(tabOrder.lines?.length ?? 0) > 0 && (
                <ul className="mt-3 space-y-1 rounded-res-md bg-res-surface p-3">
                  {tabOrder.lines?.map((line) => (
                    <li
                      key={line._id}
                      className="type-res-body flex justify-between gap-2 font-normal text-res-ink"
                    >
                      <span>
                        {line.quantity}× {line.name}
                      </span>
                      <span className="font-semibold">{money(line.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setPadOpen(true)}
                className="type-res-small mt-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                <Receipt className="h-3.5 w-3.5" /> Add charge
              </button>
            </div>
          ) : tabReservation ? (
            <div className="rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low">
              <p className="type-res-small font-normal text-res-ink-muted">
                Room {unitLabel(tabReservation.unitId)} has no bill open yet.
              </p>
              <button
                type="button"
                onClick={() => setPadOpen(true)}
                className="type-res-small mt-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                <Receipt className="h-3.5 w-3.5" /> Start a bill
              </button>
            </div>
          ) : (
            <p className="type-res-small font-normal text-res-ink-muted">
              Pick a checked-in room to see its running bill and post a charge to it.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <h2 className="type-res-h3 mb-3 flex items-center gap-2 text-res-ink">
          <Building2 className="h-4 w-4 text-res-brand" /> Room grid{' '}
          <span className="type-res-small rounded-full bg-res-surface px-2.5 py-0.5 font-semibold text-res-ink-muted">
            {units.length}
          </span>
        </h2>
        {mapLoading ? (
          <div className="h-72 animate-pulse rounded-res-md bg-res-surface" />
        ) : layout ? (
          <RoomGrid
            units={units}
            reservationsByUnit={reservationsByUnit}
            busyReservationId={busyReservationId}
            onCheckIn={(r) => changeReservation('checkIn', r)}
            onCheckOut={(r) => changeReservation('checkOut', r)}
            onOpenTab={(r) => {
              setTabReservationId(r._id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <p className="type-res-small py-8 text-center font-normal text-res-ink-muted">
            No floor plan available yet.
          </p>
        )}
      </section>

      <Dialog open={padOpen} onOpenChange={setPadOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-res-lg border-res-line bg-res-card shadow-res-high">
          <DialogHeader>
            <DialogTitle className="type-res-h3 text-res-ink">
              Charge to {tabReservation ? `Room ${unitLabel(tabReservation.unitId)}` : 'room'}
            </DialogTitle>
          </DialogHeader>
          <OrderBuilder
            vendorId={staff?.vendor}
            vertical={vertical}
            submitLabel="Post to room"
            submitting={submitting || createOrder.isPending}
            onSubmit={handleCharge}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
