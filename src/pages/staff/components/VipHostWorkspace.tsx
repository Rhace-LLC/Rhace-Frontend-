import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  Bell,
  MapPinned,
  RefreshCw,
  ShoppingBag,
  Target,
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
import { inventoryBlueprintService } from '@/services/inventoryBlueprint.service';
import {
  staffService,
  assignmentUnitId,
  type StaffAssignmentDto,
} from '@/services/staff.service';
import type {
  FloorPlanDto,
  FloorPlanLayoutDto,
  InventoryBlueprintDto,
  PhysicalUnitDto,
} from '@/types';
import BoothMap from './BoothMap';
import MyStationsCard from './MyStationsCard';
import { boothSpend, clubStateMeta, minimumSpendFor, spendPct } from '../club';

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Orders still on the floor — a cancelled bill never counts toward the target. */
const OPEN_STATUSES = new Set(['open', 'placed', 'preparing', 'served']);

/** Club plans first — the host only works booths. */
const defaultPlanId = (plans: FloorPlanDto[]) =>
  plans.find((p) => p.vertical === 'club')?._id ?? plans[0]?._id ?? '';

const apiMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

/** A counter tile for the host KPIs. */
function Stat({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  icon: typeof Target;
  tone?: 'default' | 'warn' | 'good';
}) {
  const toneClass =
    tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : '';
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
        </div>
        <Icon
          className={`h-5 w-5 ${
            tone === 'warn'
              ? 'text-amber-500'
              : tone === 'good'
                ? 'text-emerald-500'
                : 'text-[#0A6C6D]'
          }`}
        />
      </CardContent>
    </Card>
  );
}
/**
 * VIP host workspace (club): the booths assigned to me today, a live section
 * map, the minimum-spend tracker that shows each booth's running order value
 * against its blueprint minimum, and a bottle-service order pad. Unit state is
 * read-only here — seating/closing a booth stays with the vendor floor app.
 */
export default function VipHostWorkspace() {
  const { staff } = useAuth();
  const createOrder = useCreateOrder();

  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [layout, setLayout] = useState<FloorPlanLayoutDto | null>(null);
  const [blueprints, setBlueprints] = useState<InventoryBlueprintDto[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignmentDto[]>([]);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);

  // Bottle-service pad
  const [padOpen, setPadOpen] = useState(false);
  const [padUnit, setPadUnit] = useState<PhysicalUnitDto | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [plansRes, assigns, orderRes, blueprintsRes] = await Promise.all([
        floorPlanService.list({ vertical: 'club', limit: 50 }),
        staffService.getAssignments({ date: todayKey() }),
        // Every booth's running total, not just mine: a guest's bill is the
        // booth's spend no matter which host or waiter rang it up.
        ordersApi.list({ limit: 100, withLines: true }),
        // `minimumSpend` lives on the blueprint, not on the unit.
        inventoryBlueprintService.list({ vertical: 'club', includeSystem: true, limit: 100 }),
      ]);
      const docs = plansRes.data?.items ?? [];
      setPlans(docs);
      setPlanId((current) =>
        current && docs.some((d) => d._id === current) ? current : defaultPlanId(docs),
      );
      setAssignments(assigns.docs ?? []);
      setOrders(orderRes.items ?? []);
      setBlueprints(blueprintsRes.data?.items ?? []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load your section');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The vendor's saved layout for the selected club plan (booths + positions).
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
        if (!cancelled) toast.error('Failed to load the section map');
      })
      .finally(() => {
        if (!cancelled) setMapLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const units = useMemo(() => layout?.units ?? [], [layout]);
  const assignedIds = useMemo(
    () => new Set(assignments.map((a) => assignmentUnitId(a.refId))),
    [assignments],
  );

  const minimumSpendByBlueprint = useMemo(() => {
    const map = new Map<string, number>();
    for (const blueprint of blueprints) map.set(blueprint._id, blueprint.minimumSpend ?? 0);
    return map;
  }, [blueprints]);

  /** Running order value per booth — cancelled bills never count. */
  const spendByUnit = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      if (!order.unitId || order.status === 'cancelled') continue;
      map.set(order.unitId, (map.get(order.unitId) ?? 0) + (order.total ?? 0));
    }
    return map;
  }, [orders]);

  /** Booths with a live ticket carrying add-ons / show equipment. */
  const showUnitIds = useMemo(() => {
    const set = new Set<string>();
    for (const order of orders) {
      if (!order.unitId || !OPEN_STATUSES.has(order.status)) continue;
      if ((order.lines ?? []).some((line) => (line.addons ?? []).length > 0)) {
        set.add(order.unitId);
      }
    }
    return set;
  }, [orders]);

  /**
   * Minimum-spend tracker rows. My assigned booths come first; on a night with
   * no roster yet the host still needs the floor, so every booth with a
   * minimum is shown. Booths furthest behind their target sort to the top.
   */
  const trackerRows = useMemo(() => {
    const assigned = units.filter((u) => assignedIds.has(u._id));
    const source = assigned.length > 0 ? assigned : units;
    return source
      .map((unit) => {
        const minimum = minimumSpendFor(unit, minimumSpendByBlueprint);
        const spend = boothSpend(unit, spendByUnit);
        return { unit, minimum, spend, remaining: minimum - spend, met: minimum > 0 && spend >= minimum };
      })
      .filter((row) => row.minimum > 0 || assigned.length > 0)
      .sort((a, b) => {
        const aBehind = a.minimum > 0 && !a.met;
        const bBehind = b.minimum > 0 && !b.met;
        if (aBehind !== bBehind) return aBehind ? -1 : 1;
        return b.remaining - a.remaining;
      });
  }, [units, assignedIds, minimumSpendByBlueprint, spendByUnit]);

  const trailing = useMemo(
    () => trackerRows.filter((r) => r.minimum > 0 && !r.met),
    [trackerRows],
  );

  const totals = useMemo(
    () =>
      trackerRows.reduce(
        (acc, row) => ({ minimum: acc.minimum + row.minimum, spend: acc.spend + row.spend }),
        { minimum: 0, spend: 0 },
      ),
    [trackerRows],
  );

  const liveOrders = useMemo(
    () =>
      orders.filter(
        (order) => OPEN_STATUSES.has(order.status) && Boolean(order.unitId && assignedIds.has(order.unitId)),
      ),
    [orders, assignedIds],
  );

  const unitLabel = (unitId?: string | null) =>
    units.find((u) => u._id === unitId)?.label ?? (unitId ? `Booth ${unitId.slice(-4)}` : '—');

  const openPad = (unit: PhysicalUnitDto) => {
    setPadUnit(unit);
    setPadOpen(true);
  };

  const handleSubmit = async (lines: CreateOrderLineInput[]) => {
    if (!padUnit) return;
    try {
      setSubmitting(true);
      const order = await createOrder.mutateAsync({
        source: 'pos',
        vertical: 'club',
        vendorId: staff?.vendor,
        unitId: padUnit._id,
        // The guest already sits on the booth session, so carry it onto the bill.
        guestName: padUnit.session?.guestName,
        lines,
      });
      toast.success(`Bottle service sent for ${padUnit.label}`);
      setOrders((prev) => [order, ...prev]);
      setPadOpen(false);
      setPadUnit(null);
    } catch (error) {
      toast.error(apiMessage(error) || 'Failed to place the order');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MapPinned className="h-6 w-6 text-[#0A6C6D]" /> VIP Section
          </h1>
          <p className="text-sm text-muted-foreground">
            {assignedIds.size > 0
              ? 'Your assigned booths are highlighted — tap one to send bottle service.'
              : 'No booths assigned to you yet — showing the whole section.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plans.length > 1 && (
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Section" />
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
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <MyStationsCard unitType="table" onChanged={load} />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="My booths" value={assignedIds.size} icon={MapPinned} />
        <Stat
          label="Running spend"
          value={money(totals.spend)}
          icon={ShoppingBag}
          tone="good"
        />
        <Stat
          label="Targets met"
          value={trackerRows.filter((r) => r.met).length}
          icon={Target}
          tone="good"
        />
        <Stat
          label="Under target"
          value={trailing.length}
          icon={AlertTriangle}
          tone="warn"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPinned className="h-4 w-4" /> Section map
            <Badge variant="secondary">{units.length} booths</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mapLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : layout ? (
            <BoothMap
              plan={layout.plan}
              units={units}
              minimumSpendByBlueprint={minimumSpendByBlueprint}
              spendByUnit={spendByUnit}
              assignedIds={assignedIds}
              onOpenBooth={openPad}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No section map available yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" /> Minimum-spend tracker
            <Badge variant={trailing.length ? 'destructive' : 'secondary'}>
              {trailing.length} under
            </Badge>
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {money(totals.spend)} / {money(totals.minimum)}
          </span>
        </CardHeader>
        <CardContent>
          {trackerRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No booths to track yet — assign a section in the Shift Manager.
            </p>
          ) : (
            <ul className="space-y-3">
              {trackerRows.map(({ unit, minimum, spend, met, remaining }) => {
                const meta = clubStateMeta(unit.state);
                const pct = spendPct(spend, minimum);
                return (
                  <li key={unit._id} className="rounded-lg border bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        {unit.label}
                        {assignedIds.has(unit._id) && (
                          <Badge variant="outline" className="text-[10px]">
                            Mine
                          </Badge>
                        )}
                        {showUnitIds.has(unit._id) && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700">
                            <Bell className="h-3 w-3" /> Show / add-on
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {money(spend)}
                          {minimum > 0 && (
                            <span className="text-muted-foreground"> / {money(minimum)}</span>
                          )}
                        </span>
                        {minimum > 0 &&
                          (met ? (
                            <Badge variant="outline" className="text-emerald-700">
                              Target met
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-amber-700">
                              {money(remaining)} to go
                            </Badge>
                          ))}
                        <Button
                          size="sm"
                          className="h-7 bg-[#0A6C6D] px-2 text-xs hover:bg-[#085a5b]"
                          onClick={() => openPad(unit)}
                        >
                          <ShoppingBag className="mr-1 h-3 w-3" /> Order
                        </Button>
                      </div>
                    </div>

                    {minimum > 0 && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${
                            met ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {unit.session?.guestName ? (
                        <>
                          {unit.session.guestName}
                          {unit.session.partySize ? ` · party of ${unit.session.partySize}` : ''}
                          {unit.session.checkedInAt
                            ? ` · seated ${formatTime(unit.session.checkedInAt)}`
                            : ''}
                        </>
                      ) : (
                        `${meta.label} · no guest seated`
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" /> My live orders
            <Badge variant="secondary">{liveOrders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing open on your booths.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {liveOrders.map((order) => (
                <div
                  key={order._id}
                  className="rounded-lg border border-l-4 border-l-[#0A6C6D] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{unitLabel(order.unitId)}</span>
                    <Badge variant={order.status === 'placed' ? 'destructive' : 'secondary'}>
                      {order.status}
                    </Badge>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                    {(order.lines ?? []).slice(0, 4).map((line) => (
                      <li key={line._id}>
                        {line.quantity}× {line.name}
                        {(line.addons ?? []).length > 0
                          ? ` + ${(line.addons ?? []).map((a) => a.name).join(', ')}`
                          : ''}
                      </li>
                    ))}
                    {(order.lines?.length ?? 0) > 4 && (
                      <li>… +{(order.lines?.length ?? 0) - 4} more</li>
                    )}
                  </ul>
                  <p className="mt-2 text-xs font-medium">{money(order.total)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={padOpen} onOpenChange={setPadOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bottle service — {padUnit?.label}</DialogTitle>
          </DialogHeader>
          <OrderBuilder
            vendorId={staff?.vendor}
            vertical="club"
            submitLabel={`Send to ${padUnit?.label ?? 'booth'}`}
            submitting={submitting || createOrder.isPending}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}