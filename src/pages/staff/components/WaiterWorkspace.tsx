import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2, MapPinned, ShoppingBag } from 'lucide-react';
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
import type { CreateOrderLineInput, OrderDto } from '@/features/orders/types';
import { OrderBuilder } from '@/features/orders';
import { money } from '@/features/orders/money';
import { floorPlanService } from '@/services/floorPlan.service';
import {
  staffService,
  assignmentUnit,
  assignmentUnitId,
  type StaffAssignmentDto,
} from '@/services/staff.service';
import type { FloorPlanDto, FloorPlanLayoutDto, PhysicalUnitDto } from '@/types';
import TableMap from './TableMap';
import MyStationsCard from './MyStationsCard';

const todayKey = () => new Date().toISOString().slice(0, 10);

const ACTIVE_STATUSES = new Set(['open', 'placed', 'preparing', 'served']);

/** Free → seated → paid; mirrors the state machine, read-only here. */
const stateChip = (state: string) => {
  if (['available', 'vacant_clean', 'inspected'].includes(state)) return 'bg-green-500';
  if (['seated_ordering', 'entrees_served', 'awaiting_check', 'occupied'].includes(state))
    return 'bg-blue-500';
  if (['dirty_bussing', 'vacant_dirty'].includes(state)) return 'bg-amber-500';
  if (['reserved_held', 'reserved_confirmed'].includes(state)) return 'bg-violet-500';
  return 'bg-gray-400';
};

export default function WaiterWorkspace() {
  const { staff } = useAuth();

  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [layout, setLayout] = useState<FloorPlanLayoutDto | null>(null);
  const [assignments, setAssignments] = useState<StaffAssignmentDto[]>([]);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);

  // Order pad
  const [padOpen, setPadOpen] = useState(false);
  const [padUnit, setPadUnit] = useState<PhysicalUnitDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const createOrder = useCreateOrder();

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [plansRes, assigns, mine] = await Promise.all([
        floorPlanService.list(),
        staffService.getAssignments({ date: todayKey() }),
        ordersApi.list({ limit: 50, withLines: true, mine: true }),
      ]);
      const docs = plansRes.data?.items ?? [];
      setPlans(docs);
      setPlanId((current) =>
        current && docs.some((d) => d._id === current) ? current : (docs[0]?._id ?? ''),
      );
      setAssignments(assigns.docs ?? []);
      setOrders(mine.items ?? []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load your tables');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The vendor's saved layout for the selected plan (entities + positions).
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
        if (!cancelled) toast.error('Failed to load the floor plan');
      })
      .finally(() => {
        if (!cancelled) setMapLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const assignedIds = useMemo(
    () => new Set(assignments.map((a) => assignmentUnitId(a.refId))),
    [assignments],
  );
  const active = useMemo(
    () => orders.filter((o) => ACTIVE_STATUSES.has(o.status)),
    [orders],
  );
  const vertical = layout?.plan?.vertical ?? 'restaurant';

  const unitLabel = (unitId?: string | null) =>
    layout?.units.find((u) => u._id === unitId)?.label ??
    (unitId ? `Table ${unitId.slice(-4)}` : '—');

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
        vendorId: staff?.vendor,
        unitId: padUnit._id,
        lines,
      });
      toast.success(`Order placed for ${padUnit.label}`);
      setOrders((prev) => [order, ...prev]);
      setPadOpen(false);
      setPadUnit(null);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message || 'Failed to place the order');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MapPinned className="h-6 w-6 text-[#0A6C6D]" /> Floor map
          </h1>
          <p className="text-sm text-muted-foreground">
            Your assigned tables are highlighted — tap one to start an order.
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

      {/* Self-service stations (plan §6.2) — claim/release own slots anytime. */}
      <MyStationsCard unitType="table" onChanged={load} />

      <Card>
        <CardContent className="pt-6">
          {mapLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : layout ? (
            <TableMap
              plan={layout.plan}
              units={layout.units}
              assignedIds={assignedIds}
              onOpenTable={openPad}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No floor plan available yet.
            </p>
          )}
        </CardContent>
      </Card>

      {assignments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assignments.map((a) => {
            const unit = layout?.units.find((u) => u._id === assignmentUnitId(a.refId));
            return (
              <button
                key={a._id}
                type="button"
                onClick={() => unit && openPad(unit)}
                disabled={!unit}
                className="flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-[#0A6C6D]/5 disabled:opacity-60"
                title={unit ? 'Open order pad' : a.label || assignmentUnit(a.refId)?.label || assignmentUnitId(a.refId)}
              >
                <span className={`h-2 w-2 rounded-full ${stateChip(unit?.state ?? '')}`} />
                {a.label || unit?.label || assignmentUnit(a.refId)?.label || assignmentUnitId(a.refId)}
                <span className="text-xs text-muted-foreground">· order</span>
              </button>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" /> My live orders
            <Badge variant="secondary">{active.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders on your tables yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {active.map((order) => (
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
            <DialogTitle>Order pad — {padUnit?.label}</DialogTitle>
          </DialogHeader>
          <OrderBuilder
            vendorId={staff?.vendor}
            vertical={vertical}
            submitLabel={`Place order for ${padUnit?.label ?? 'table'}`}
            submitting={submitting || createOrder.isPending}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
