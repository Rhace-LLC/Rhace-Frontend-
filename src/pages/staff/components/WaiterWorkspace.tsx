import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Check,
  Flag,
  MapPinned,
  MoreVertical,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder } from '@/features/orders/api/hooks';
import { ordersApi } from '@/features/orders/api/service';
import { useOrderRealtime } from '@/features/orders/realtime';
import type { CreateOrderLineInput, OrderDto } from '@/features/orders/types';
import { OrderBuilder } from '@/features/orders';
import { money } from '@/features/orders/money';
import { Modal } from '@/components/others/RhaceModal';
import RecordOfflinePaymentModal from '@/pages/vendor/shared/payments/RecordOfflinePayment';
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

const ACTIVE_STATUSES = new Set([
  'open',
  'awaiting_confirmation',
  'placed',
  'preparing',
  'ready',
  'served',
]);

/** Fallback refresh while the order socket is disconnected. */
const TABLE_POLL_MS = 30_000;

/** Free → seated → paid; mirrors the state machine, read-only here. */
const stateChip = (state: string) => {
  if (['available', 'vacant_clean', 'inspected'].includes(state)) return 'bg-green-500';
  if (['seated_ordering', 'entrees_served', 'awaiting_check', 'occupied'].includes(state))
    return 'bg-blue-500';
  if (['dirty_bussing', 'vacant_dirty'].includes(state)) return 'bg-amber-500';
  if (['reserved_held', 'reserved_confirmed'].includes(state)) return 'bg-violet-500';
  return 'bg-gray-400';
};

const ORDER_STATUS_STYLE: Record<string, string> = {
  open: 'bg-res-surface text-res-ink-muted',
  awaiting_confirmation: 'bg-amber-50 text-amber-700',
  placed: 'bg-res-secondary text-res-brand',
  preparing: 'bg-res-brand text-res-ink-inverted',
  ready: 'bg-amber-50 text-amber-700',
  served: 'bg-res-secondary text-res-brand',
  completed: 'bg-res-surface text-res-ink-muted',
  cancelled: 'bg-res-surface text-res-ink-muted line-through',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  awaiting_confirmation: 'Awaiting confirmation',
  placed: 'Placed',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const SOURCE_LABEL: Record<string, string> = {
  reservation: 'Pre-order',
  quick_order: 'Table order',
  pos: 'Counter order',
};

const selectClass =
  'rounded-res-sm border border-res-line bg-res-card px-3 py-2.5 type-res-body font-normal text-res-ink shadow-res-low outline-none focus:border-res-brand';

function formatPlacedAt(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

const ageMinutes = (createdAt?: string) =>
  createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000) : 0;

const formatAge = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / (24 * 60))}d ago`;
};

/** Unprocessed orders older than a day — likely no-shows, duplicates, misfires. */
const STALE_MINUTES = 24 * 60;
const isStaleOrder = (order: OrderDto): boolean =>
  ['open', 'awaiting_confirmation', 'placed', 'preparing'].includes(order.status) &&
  ageMinutes(order.createdAt) >= STALE_MINUTES;

export default function WaiterWorkspace() {
  const { staff } = useAuth();
  const myStaffId = staff?._id ?? staff?.id;

  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [layout, setLayout] = useState<FloorPlanLayoutDto | null>(null);
  const [assignments, setAssignments] = useState<StaffAssignmentDto[]>([]);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [venueOrders, setVenueOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  // Phase 5: order events refresh the table orders (coalesced bursts).
  const [liveTick, setLiveTick] = useState(0);
  const { connected: ordersLive } = useOrderRealtime(true, () => setLiveTick((t) => t + 1));
  useEffect(() => {
    if (liveTick === 0) return;
    const timer = setTimeout(() => setTableRefreshKey((k) => k + 1), 250);
    return () => clearTimeout(timer);
  }, [liveTick]);

  const [payOrder, setPayOrder] = useState<OrderDto | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<OrderDto | null>(null);
  const [addTarget, setAddTarget] = useState<OrderDto | null>(null);
  const [addingBusy, setAddingBusy] = useState(false);

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

  const assignedKey = useMemo(() => [...assignedIds].sort().join(','), [assignedIds]);

  // Guest orders (QR quick-order, pre-orders) carry no staffId, so the `mine`
  // lens misses them — the backend `unitIds` filter returns only orders on the
  // waiter's assigned tables. Polled silently so new guest orders appear live.
  useEffect(() => {
    if (!assignedKey) {
      setVenueOrders([]);
      return;
    }
    let cancelled = false;
    const fetchTableOrders = async (silent = false) => {
      try {
        const res = await ordersApi.list({
          limit: 60,
          withLines: true,
          unitIds: assignedKey.split(','),
        });
        if (!cancelled) setVenueOrders(res.items ?? []);
      } catch {
        if (!cancelled && !silent) toast.error('Failed to load table orders');
      }
    };
    fetchTableOrders();
    // Phase 5: live via the order socket; poll only while it is down.
    const timer = ordersLive ? null : setInterval(() => fetchTableOrders(true), TABLE_POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [assignedKey, tableRefreshKey, ordersLive]);

  const refreshAll = () => {
    setTableRefreshKey((k) => k + 1);
    load();
  };

  const [orderTab, setOrderTab] = useState<'active' | 'completed'>('active');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  /**
   * Every order the waiter owns or is responsible for: guest orders land
   * on an order with only `unitId` set, so they arrive via the `unitIds`
   * table filter; POS orders the waiter took themselves match by `mine`.
   */
  const tableOrders = useMemo(() => {
    const seen = new Set<string>();
    const merged: OrderDto[] = [];
    for (const order of [...orders, ...venueOrders]) {
      if (seen.has(order._id)) continue;
      seen.add(order._id);
      if (order.status === 'cancelled') continue;
      const onMyTable = order.unitId ? assignedIds.has(order.unitId) : false;
      const isMine = myStaffId ? order.staffId === myStaffId : false;
      if (onMyTable || isMine) merged.push(order);
    }
    return merged.sort(
      (a, b) =>
        new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
    );
  }, [orders, venueOrders, assignedIds, myStaffId]);

  const activeOrders = useMemo(
    () => tableOrders.filter((o) => ACTIVE_STATUSES.has(o.status)),
    [tableOrders],
  );
  const completedOrders = useMemo(
    () => tableOrders.filter((o) => o.status === 'completed'),
    [tableOrders],
  );
  const visibleOrders = orderTab === 'active' ? activeOrders : completedOrders;

  /**
   * Waiter handoff: confirm a table order (-> placed, kitchen sees it),
   * ready -> served at the table, served -> completed on exit.
   */
  const advanceOrder = async (order: OrderDto, next: 'placed' | 'served' | 'completed') => {
    try {
      setUpdatingOrderId(order._id);
      const updated = await ordersApi.updateStatus(order._id, next);
      const apply = (prev: OrderDto[]) =>
        prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o));
      setOrders(apply);
      setVenueOrders(apply);
      toast.success(
        next === 'placed'
          ? 'Order confirmed — sent to the kitchen'
          : next === 'served'
            ? 'Order marked as served'
            : 'Order completed',
      );
    } catch {
      toast.error('Failed to update order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderDto | null>(null);
  const [cancelling, setCancelling] = useState(false);

  /** Kebab menu is `fixed` so it escapes the table's scroll container. */
  const openMenu = (orderId: string, anchor: HTMLElement) => {
    if (openMenuId === orderId) {
      setOpenMenuId(null);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const width = 224;
    const height = 210;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top =
      rect.bottom + 6 + height > window.innerHeight
        ? Math.max(8, rect.top - height - 6)
        : rect.bottom + 6;
    setMenuPos({ top, left });
    setOpenMenuId(orderId);
  };

  useEffect(() => {
    if (!openMenuId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openMenuId]);

  /**
   * Dead orders (no-show, duplicate, misfire) leave the board via the cancel
   * confirmation modal. Cancelled orders are soft-deleted server-side.
   */
  const cancelTableOrder = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      await ordersApi.cancel(cancelTarget._id);
      const drop = (prev: OrderDto[]) => prev.filter((o) => o._id !== cancelTarget._id);
      setOrders(drop);
      setVenueOrders(drop);
      toast.success('Order cancelled');
      setCancelTarget(null);
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

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

  /** Extra rounds on an existing order: totals recompute and the balance grows. */
  const handleAddLines = async (lines: CreateOrderLineInput[]) => {
    if (!addTarget || !lines.length) return;
    try {
      setAddingBusy(true);
      for (const line of lines) {
        await ordersApi.addLine(addTarget._id, line);
      }
      toast.success('Items added to the order');
      setAddTarget(null);
      setTableRefreshKey((k) => k + 1);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message || 'Failed to add items');
    } finally {
      setAddingBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-64 animate-pulse rounded-full bg-res-surface" />
        <div className="h-72 animate-pulse rounded-res-lg bg-res-card" />
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-res-md bg-res-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="type-res-h2 flex items-center gap-2 text-res-ink">
            <MapPinned className="h-5 w-5 text-res-brand" /> My tables
          </h1>
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">
            Your orders, stations and the floor map.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plans.length > 1 && (
            <select
              aria-label="Floor plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className={`${selectClass} w-48`}
            >
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={refreshAll}
            aria-label="Refresh floor map and orders"
            title="Refresh floor map and orders"
            className="type-res-small cursor-pointer rounded-full bg-res-card p-2.5 font-semibold text-res-ink shadow-res-low transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-res-brand" />
            <h2 className="type-res-h3 text-res-ink">Live orders</h2>
            <span
              className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${
                activeOrders.length
                  ? 'bg-res-brand text-res-ink-inverted'
                  : 'bg-res-surface text-res-ink-muted'
              }`}
            >
              {activeOrders.length}
            </span>
          </div>
          <div
            role="tablist"
            aria-label="Filter orders"
            className="flex gap-1 rounded-res-md bg-res-surface p-1"
          >
            {(
              [
                { id: 'active', label: `Active · ${activeOrders.length}` },
                { id: 'completed', label: `Completed · ${completedOrders.length}` },
              ] as const
            ).map((tab) => {
              const isActive = orderTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setOrderTab(tab.id)}
                  className={`type-res-small cursor-pointer rounded-full px-4 py-2 whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                    isActive
                      ? 'bg-res-card text-res-brand shadow-res-low'
                      : 'text-res-ink-muted hover:text-res-ink'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="type-res-small mt-1 font-normal text-res-ink-muted">
          Orders on your tables — yours and your guests&apos;. Mark them served at the
          table, completed when guests leave.
        </p>

        <div className="mt-4">
          {visibleOrders.length === 0 ? (
            <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
              <p className="type-res-h3 text-res-ink">
                {orderTab === 'active' ? 'No orders on your tables yet' : 'No completed orders yet'}
              </p>
              <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
                {orderTab === 'active'
                  ? 'Guest orders placed on your assigned tables will appear here.'
                  : 'Orders you complete will land on this tab.'}
              </p>
            </div>
          ) : (
            <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
              <table className="w-full min-w-[1020px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-res-line">
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Ticket
                    </th>
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Table
                    </th>
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Placed at
                    </th>
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Items
                    </th>
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Status
                    </th>
                    <th className="type-res-caption px-4 py-3 text-right font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Total
                    </th>
                    <th className="type-res-caption px-4 py-3 text-right font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => {
                    const lines = order.lines ?? [];
                    const itemCount = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
                    const preview = lines
                      .slice(0, 3)
                      .map((l) => `${l.quantity}× ${l.name}`)
                      .join(' · ');
                    const placedByMe = myStaffId ? order.staffId === myStaffId : false;
                    const busy = updatingOrderId === order._id;
                    return (
                      <tr
                        key={order._id}
                        className="border-b border-res-line transition-colors last:border-0 hover:bg-res-surface/60"
                      >
                        <td className="px-4 py-3">
                          <span className="type-res-body block font-semibold text-res-ink">
                            {order.guestName || `Order …${order._id.slice(-6)}`}
                          </span>
                          <span className="type-res-small block font-normal text-res-ink-muted">
                            {SOURCE_LABEL[order.source] ?? order.source} · #
                            {order._id.slice(-6).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="type-res-body font-semibold whitespace-nowrap text-res-ink">
                            {unitLabel(order.unitId)}
                          </span>
                          <span
                            className={`type-res-small mt-1 block w-fit rounded-full px-2 py-0.5 font-semibold whitespace-nowrap ${
                              placedByMe
                                ? 'bg-res-secondary text-res-brand'
                                : 'bg-res-surface text-res-ink-muted'
                            }`}
                          >
                            {placedByMe ? 'Placed by you' : 'Guest order'}
                          </span>
                        </td>
                        <td className="type-res-body px-4 py-3 font-normal whitespace-nowrap text-res-ink-muted">
                          {formatPlacedAt(order.createdAt)}
                          {orderTab === 'active' &&
                            (() => {
                              const minutes = ageMinutes(order.createdAt);
                              const stale = isStaleOrder(order);
                              return (
                                <>
                                  <span className="type-res-small block font-normal text-res-ink-muted">
                                    {formatAge(minutes)}
                                  </span>
                                  {stale && (
                                    <span className="type-res-small mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                                      Stale · no action taken
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="type-res-body block font-medium text-res-ink">
                            {itemCount} item{itemCount === 1 ? '' : 's'}
                          </span>
                          {preview && (
                            <span className="type-res-small block max-w-[280px] truncate font-normal text-res-ink-muted">
                              {preview}
                              {lines.length > 3 ? ` +${lines.length - 3} more` : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${ORDER_STATUS_STYLE[order.status] ?? 'bg-res-surface text-res-ink-muted'}`}
                          >
                            {ORDER_STATUS_LABEL[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="type-res-body font-semibold whitespace-nowrap text-res-ink">
                            {money(order.total)}
                          </span>
                          {order.balance > 0 && (
                            <span className="type-res-small mt-1 inline-block rounded-full bg-res-secondary px-2 py-0.5 font-semibold text-res-brand">
                              {money(order.balance)} due
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => openMenu(order._id, e.currentTarget)}
                            aria-expanded={openMenuId === order._id}
                            aria-label={`Actions for order ${order._id.slice(-6).toUpperCase()}`}
                            className="type-res-small cursor-pointer rounded-full bg-res-surface p-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === order._id && menuPos && (
                            <>
                              <div
                                aria-hidden
                                className="fixed inset-0 z-40 cursor-default"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div
                                role="menu"
                                aria-label="Order actions"
                                style={{ top: menuPos.top, left: menuPos.left }}
                                className="fixed z-50 w-56 rounded-res-md border border-res-line bg-res-card p-1.5 text-left shadow-res-high"
                              >
                                {order.status === 'awaiting_confirmation' && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setConfirmTarget(order);
                                    }}
                                    className="type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand"
                                  >
                                    <Check className="h-4 w-4 text-res-brand" />
                                    Confirm order
                                  </button>
                                )}
                                {order.status === 'ready' && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={busy}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      advanceOrder(order, 'served');
                                    }}
                                    className="type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Check className="h-4 w-4 text-res-brand" />
                                    {busy ? 'Saving…' : 'Mark served'}
                                  </button>
                                )}
                                {order.status === 'served' && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={busy}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      advanceOrder(order, 'completed');
                                    }}
                                    className="type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Flag className="h-4 w-4 text-res-brand" />
                                    {busy ? 'Saving…' : 'Complete order'}
                                  </button>
                                )}
                                {order.balance > 0 && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setPayOrder(order);
                                    }}
                                    className="type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand"
                                  >
                                    <Wallet className="h-4 w-4 text-res-brand" />
                                    Record payment
                                  </button>
                                )}
                                {orderTab === 'active' &&
                                  !['completed', 'cancelled'].includes(order.status) && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      title="Add more items to this order"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setAddTarget(order);
                                      }}
                                      className="type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand"
                                    >
                                      <Plus className="h-4 w-4 text-res-brand" />
                                      Add items
                                    </button>
                                  )}
                                {orderTab === 'active' && order.status !== 'completed' && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    title="Cancel a dead order (no-show, duplicate, misfire)"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setCancelTarget(order);
                                    }}
                                    className="type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-red-700 transition-colors outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Cancel order
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Self-service stations (plan §6.2) — claim/release own slots anytime. */}
      <MyStationsCard unitType="table" onChanged={load} />

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
                className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-card px-3.5 py-2 font-semibold text-res-ink shadow-res-low transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-60"
                title={unit ? 'Open order pad' : a.label || assignmentUnit(a.refId)?.label || assignmentUnitId(a.refId)}
              >
                <span className={`h-2 w-2 rounded-full ${stateChip(unit?.state ?? '')}`} />
                {a.label || unit?.label || assignmentUnit(a.refId)?.label || assignmentUnitId(a.refId)}
                <span className="font-normal text-res-ink-muted">· order</span>
              </button>
            );
          })}
        </div>
      )}

      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <div className="flex items-center gap-2">
          <MapPinned className="h-4 w-4 text-res-brand" />
          <h2 className="type-res-h3 text-res-ink">Floor map</h2>
        </div>
        <p className="type-res-small mt-1 font-normal text-res-ink-muted">
          Your assigned tables are highlighted — tap one to start an order.
        </p>
        <div className="mt-4">
          {mapLoading ? (
            <div className="h-72 animate-pulse rounded-res-md bg-res-surface" />
          ) : layout ? (
            <TableMap
              plan={layout.plan}
              units={layout.units}
              assignedIds={assignedIds}
              onOpenTable={openPad}
            />
          ) : (
            <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
              <p className="type-res-h3 text-res-ink">No floor plan yet</p>
              <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                Tables will appear here once a floor plan is published.
              </p>
            </div>
          )}
        </div>
      </section>

      {confirmTarget &&
        (() => {
          const lines = confirmTarget.lines ?? [];
          const itemCount = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
          const confirming = updatingOrderId === confirmTarget._id;
          return (
            <Modal
              isOpen
              onClose={() => !confirming && setConfirmTarget(null)}
              title={`Confirm order — ${unitLabel(confirmTarget.unitId)}`}
              subtitle={`${confirmTarget.guestName || 'Guest'} · Placed ${formatPlacedAt(confirmTarget.createdAt)}`}
              footer={
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmTarget(null)}
                    disabled={confirming}
                    className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand disabled:opacity-50"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await advanceOrder(confirmTarget, 'placed');
                      setConfirmTarget(null);
                    }}
                    disabled={confirming}
                    className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {confirming ? 'Confirming…' : 'Confirm order'}
                  </button>
                </>
              }
            >
              <div className="space-y-3">
                <p className="type-res-small font-normal text-res-ink-muted">
                  Verify the table and items with the guest — confirming sends this
                  order straight to the kitchen queue.
                </p>
                {lines.length > 0 && (
                  <ul className="rounded-res-md bg-res-surface p-3">
                    {lines.map((line) => (
                      <li
                        key={line._id}
                        className="type-res-body flex justify-between gap-2 border-b border-res-line py-2 font-normal text-res-ink last:border-0 last:pb-0 first:pt-0"
                      >
                        <span className="min-w-0">
                          <span className="font-semibold">{line.quantity} × </span>
                          {line.name}
                        </span>
                        <span className="shrink-0 font-semibold">{money(line.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between border-t border-res-line pt-3">
                  <span className="type-res-small font-medium text-res-ink-muted">
                    {itemCount} item{itemCount === 1 ? '' : 's'} · Total
                  </span>
                  <span className="type-res-h3 text-res-ink">{money(confirmTarget.total)}</span>
                </div>
                {confirmTarget.balance > 0 && (
                  <p className="type-res-small font-medium text-res-brand">
                    {money(confirmTarget.balance)} still to pay — collect it or record it
                    after confirming.
                  </p>
                )}
              </div>
            </Modal>
          );
        })()}

      {cancelTarget && (
        <Modal
          isOpen
          onClose={() => !cancelling && setCancelTarget(null)}
          title="Cancel this order?"
          subtitle={`${cancelTarget.guestName || 'Order'} · ${unitLabel(cancelTarget.unitId)} · ${money(cancelTarget.total)}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand disabled:opacity-50"
              >
                Keep order
              </button>
              <button
                type="button"
                onClick={cancelTableOrder}
                disabled={cancelling}
                className="type-res-small cursor-pointer rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white shadow-res-low transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Yes, cancel order'}
              </button>
            </>
          }
        >
          <p className="type-res-small font-normal text-res-ink-muted">
            This removes the order from your board. Use it for dead orders — no-shows,
            duplicates or misfires. The linked booking, if any, is left untouched.
          </p>
        </Modal>
      )}

      <RecordOfflinePaymentModal
        isOpen={!!payOrder}
        orderId={payOrder?._id}
        bookingLabel={
          payOrder
            ? `${payOrder.guestName || 'Order'} · ${unitLabel(payOrder.unitId)}`
            : undefined
        }
        dueAmount={payOrder?.balance}
        onClose={() => setPayOrder(null)}
        onSuccess={(response) => {
          const updated = (response as { data?: { order?: OrderDto } })?.data?.order;
          if (updated) {
            setOrders((prev) => prev.map((o) => (o._id === updated._id ? { ...o, ...updated } : o)));
            setVenueOrders((prev) =>
              prev.map((o) => (o._id === updated._id ? { ...o, ...updated } : o)),
            );
          }
          toast.success('Payment recorded');
          setPayOrder(null);
          setTableRefreshKey((k) => k + 1);
        }}
      />

      {padOpen && padUnit && (
        <Modal
          isOpen
          onClose={() => {
            setPadOpen(false);
            setPadUnit(null);
          }}
          title={`Order pad — ${padUnit.label}`}
          subtitle="Items go straight to the kitchen queue"
        >
          <OrderBuilder
            vendorId={staff?.vendor}
            vertical={vertical}
            submitLabel={`Place order for ${padUnit?.label ?? 'table'}`}
            submitting={submitting || createOrder.isPending}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}

      {addTarget && (
        <Modal
          isOpen
          onClose={() => !addingBusy && setAddTarget(null)}
          title={`Add to order — ${addTarget.guestName || 'Guest'}`}
          subtitle={`${unitLabel(addTarget.unitId)} · totals update and the balance grows`}
        >
          <OrderBuilder
            vendorId={addTarget.vendor}
            vertical={addTarget.vertical ?? vertical}
            submitLabel="Add to order"
            submitting={addingBusy}
            onSubmit={handleAddLines}
          />
        </Modal>
      )}
    </div>
  );
}
