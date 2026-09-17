import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Building2,
  CalendarClock,
  ConciergeBell,
  Loader2,
  LogIn,
  LogOut,
  Receipt,
} from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder } from '@/features/orders/api/hooks';
import { ordersApi } from '@/features/orders/api/service';
import { OrderBuilder } from '@/features/orders';
import { money } from '@/features/orders/money';
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

/** A counter tile for the desk KPIs. */
function Stat({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  tone?: 'default' | 'warn';
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p
            className={`text-2xl font-bold ${tone === 'warn' && value > 0 ? 'text-amber-600' : ''}`}
          >
            {value}
          </p>
        </div>
        <Icon className={`h-5 w-5 ${tone === 'warn' ? 'text-amber-500' : 'text-[#0A6C6D]'}`} />
      </CardContent>
    </Card>
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
          ? `${r.guestName} checked into ${unitLabel(r.unitId)}`
          : `${r.guestName} checked out`,
      );
      await refresh();
    } catch (error) {
      toast.error(apiMessage(error) || `Failed to ${kind === 'checkIn' ? 'check in' : 'check out'}`);
    } finally {
      setBusyReservationId(null);
    }
  };

  // The room's running tab (order attached to its reservation / booking group).
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
      toast.error('Failed to load the room tab');
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
      toast.success(`Charge posted to ${unitLabel(tabReservation.unitId)}`);
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
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const vertical = layout?.plan.vertical ?? 'hotel';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ConciergeBell className="h-6 w-6 text-[#0A6C6D]" /> Front Desk
          </h1>
          <p className="text-sm text-muted-foreground">
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
          <Button variant="outline" size="sm" onClick={refresh}>
            <Loader2 className="mr-1 hidden h-4 w-4 animate-spin" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Arrivals due" value={dueIn.length} icon={LogIn} />
        <Stat label="In-house" value={inHouse.length} icon={Building2} />
        <Stat label="Due out" value={dueOut.length} icon={LogOut} />
        <Stat label="To clean / OOO" value={dirty + outOfOrder} icon={CalendarClock} tone="warn" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogIn className="h-4 w-4" /> Arrivals today
            <Badge variant="secondary">{dueIn.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dueIn.length === 0 ? (
            <p className="text-sm text-muted-foreground">No arrivals left to check in today.</p>
          ) : (
            <div className="divide-y">
              {dueIn.map((r) => (
                <div
                  key={r._id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {unitLabel(r.unitId)} · {r.guestName}
                      {r.partySize ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {r.partySize} guest{r.partySize === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      In {when(r.start)} → out {when(r.end)}
                      {r.paymentStatus ? ` · ${r.paymentStatus}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#0A6C6D] hover:bg-[#085a5b]"
                    disabled={busyReservationId === r._id}
                    onClick={() => changeReservation('checkIn', r)}
                  >
                    {busyReservationId === r._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <LogIn className="mr-1 h-4 w-4" /> Check in
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" /> Room charges
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={tabReservationId} onValueChange={setTabReservationId}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Choose an in-house room" />
            </SelectTrigger>
            <SelectContent>
              {inHouse.length === 0 ? (
                <SelectItem value="none" disabled>
                  No guests are checked in
                </SelectItem>
              ) : (
                inHouse.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {unitLabel(r.unitId)} · {r.guestName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {tabLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : tabReservation && tabOrder ? (
            <div className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {unitLabel(tabReservation.unitId)} · {tabReservation.guestName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tabOrder.status} · {tabOrder.lines?.length ?? 0} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{money(tabOrder.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid {money(tabOrder.amountPaid)} · balance {money(tabOrder.balance)}
                  </p>
                </div>
              </div>
              {(tabOrder.lines?.length ?? 0) > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {tabOrder.lines?.map((line) => (
                    <li key={line._id} className="flex justify-between">
                      <span>
                        {line.quantity}× {line.name}
                      </span>
                      <span className="text-muted-foreground">{money(line.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                size="sm"
                className="mt-4 bg-[#0A6C6D] hover:bg-[#085a5b]"
                onClick={() => setPadOpen(true)}
              >
                <Receipt className="mr-1 h-4 w-4" /> Add charge
              </Button>
            </div>
          ) : tabReservation ? (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {unitLabel(tabReservation.unitId)} has no tab open yet.
              </p>
              <Button
                size="sm"
                className="mt-3 bg-[#0A6C6D] hover:bg-[#085a5b]"
                onClick={() => setPadOpen(true)}
              >
                <Receipt className="mr-1 h-4 w-4" /> Start a tab
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pick a checked-in room to see its running tab and post a charge to it.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Room grid
            <Badge variant="secondary">{units.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mapLoading ? (
            <Skeleton className="h-72 w-full" />
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
            <p className="py-8 text-center text-sm text-muted-foreground">
              No floor plan available yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={padOpen} onOpenChange={setPadOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Charge to {tabReservation ? unitLabel(tabReservation.unitId) : 'room'}
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
