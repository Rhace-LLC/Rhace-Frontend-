import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { GlassWater, Package, Receipt, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { ordersApi } from '@/features/orders/api/service';
import { money } from '@/features/orders/money';
import { useVendorBottleSets, useVendorDishes, useVendorDrinks } from '@/features/orders';
import { useOrderRealtime } from '@/features/orders/realtime';
import { InRoomDiningLane } from '@/features/orders/components/InRoomDiningLane';
import { floorPlanService } from '@/services/floorPlan.service';
import { staffService, type StaffMember } from '@/services/staff.service';
import { PaymentStatusBadge } from '@/features/reservations';
import { Modal } from '@/components/others/RhaceModal';
import type { OrderDto, OrderItemType, OrderStatus } from '@/features/orders/types';

const SOURCE_LABEL: Record<string, string> = {
  reservation: 'Pre-order',
  quick_order: 'Table order',
  pos: 'Counter order',
  in_stay: 'Room service',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  open: 'Open',
  awaiting_confirmation: 'Awaiting confirmation',
  placed: 'Placed',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  open: 'bg-res-surface text-res-ink-muted',
  awaiting_confirmation: 'bg-amber-50 text-amber-700',
  placed: 'bg-res-secondary text-res-brand',
  preparing: 'bg-res-brand text-res-ink-inverted',
  ready: 'bg-amber-50 text-amber-700',
  served: 'bg-res-secondary text-res-brand',
  out_for_delivery: 'bg-res-brand text-res-ink-inverted',
  delivered: 'bg-res-secondary text-res-brand',
  completed: 'bg-res-surface text-res-ink-muted',
  cancelled: 'bg-res-surface text-res-ink-muted line-through',
  rejected: 'bg-red-50 text-red-700',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'awaiting_confirmation', label: 'Awaiting confirmation' },
  { value: 'placed', label: 'Placed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'served', label: 'Served' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'reservation', label: 'Pre-order' },
  { value: 'quick_order', label: 'Table order' },
  { value: 'pos', label: 'Counter order' },
  { value: 'in_stay', label: 'Room service' },
];

const PAGE_SIZE = 20;

const selectClass =
  'rounded-res-sm border border-res-line bg-res-card px-3 py-2.5 type-res-body font-normal text-res-ink shadow-res-low outline-none focus:border-res-brand';

const actionClass =
  'type-res-small cursor-pointer rounded-full bg-res-surface px-3.5 py-1.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand';

function formatPlacedAt(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** `YYYY-MM-DD` → start-of-day ISO (local). Keeps the backend `from` bound inclusive. */
function startOfDayIso(day: string): string | undefined {
  if (!day) return undefined;
  const date = new Date(`${day}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** `YYYY-MM-DD` → end-of-day ISO (local). Keeps the backend `to` bound inclusive. */
function endOfDayIso(day: string): string | undefined {
  if (!day) return undefined;
  const date = new Date(`${day}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const ITEM_TYPE_LABEL: Record<OrderItemType, string> = {
  dish: 'Dish',
  drink: 'Drink',
  bottle_set: 'Bottle set',
  hotel_service: 'Hotel service',
};

interface CatalogDetail {
  description?: string;
  image?: string;
  category?: string;
  volume?: string;
  contentsNote?: string;
}

function catalogCategoryName(categoryId: unknown): string {
  return (typeof categoryId === 'object' && (categoryId as { name?: string } | null)?.name) || '';
}

function LineVisual({
  itemType,
  image,
  name,
}: {
  itemType?: string;
  image?: string;
  name: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        loading="lazy"
        className="h-16 w-16 shrink-0 rounded-res-sm object-cover"
      />
    );
  }
  const Icon =
    itemType === 'dish' ? UtensilsCrossed : itemType === 'drink' ? GlassWater : Package;
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-res-sm bg-res-surface">
      <Icon className="h-6 w-6 text-res-brand" />
    </div>
  );
}

/**
 * Manager orders oversight: every order on this vendor, read-only.
 * Lists through the staff-scoped vendor lens (backend `orderScope`).
 */
export function ManagerOrdersTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [todayOnly, setTodayOnly] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<OrderDto | null>(null);
  const [unitLabels, setUnitLabels] = useState<Record<string, string>>({});
  const [staffMap, setStaffMap] = useState<Record<string, StaffMember>>({});
  // Phase 5: room-service orders from linked hotels, independent of filters.
  const [laneOrders, setLaneOrders] = useState<OrderDto[]>([]);
  const [liveTick, setLiveTick] = useState(0);
  useOrderRealtime(true, () => setLiveTick((t) => t + 1));
  useEffect(() => {
    if (liveTick === 0) return;
    const timer = setTimeout(() => setRefreshKey((k) => k + 1), 300);
    return () => clearTimeout(timer);
  }, [liveTick]);

  useEffect(() => {
    let cancelled = false;
    ordersApi
      .list({ source: 'in_stay', limit: 60, withLines: true })
      .then((res) => {
        if (!cancelled) setLaneOrders(res.items ?? []);
      })
      .catch(() => {
        // The lane is additive; the main list still loads.
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Waiter names live on the staff roster: map both `_id` and `id` since
  // orders may reference either form in `staffId`.
  useEffect(() => {
    let cancelled = false;
    staffService
      .getStaff({ limit: 200 })
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, StaffMember> = {};
        for (const member of res.docs ?? []) {
          if (member._id) map[member._id] = member;
          if (member.id) map[member.id] = member;
        }
        setStaffMap(map);
      })
      .catch(() => {
        // Waiter names are a nicety; orders still render with an id fallback.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Table names live on the floor-plan units (`PhysicalUnitDto.label`).
  // Load every plan layout once so `unitId` resolves to e.g. "Table T1".
  useEffect(() => {
    let cancelled = false;
    floorPlanService
      .list()
      .then(async (res) => {
        const plans = res.data?.items ?? [];
        const layouts = await Promise.all(plans.map((plan) => floorPlanService.getLayout(plan._id)));
        if (cancelled) return;
        const labels: Record<string, string> = {};
        for (const layout of layouts) {
          for (const unit of layout.data?.units ?? []) {
            if (unit.label) labels[unit._id] = unit.label;
          }
        }
        setUnitLabels(labels);
      })
      .catch(() => {
        // Table labels are a nicety; orders still render with a fallback.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** "Table T1" for a table order; null when the order has no table. */
  const tableLabel = (unitId?: string | null): string | null => {
    if (!unitId) return null;
    const raw = unitLabels[unitId];
    if (raw) return /^table\b/i.test(raw.trim()) ? raw : `Table ${raw}`;
    return `Table ${unitId.slice(-4)}`;
  };

  const dishesQuery = useVendorDishes(selected?.vendor);
  const drinksQuery = useVendorDrinks(selected?.vendor);
  const bottleSetsQuery = useVendorBottleSets(selected?.vendor);

  const catalogMap = useMemo(() => {
    const map = new Map<string, CatalogDetail>();
    for (const dish of dishesQuery.data ?? []) {
      map.set(`dish:${dish._id}`, {
        description: dish.description,
        image: dish.images?.[0] || dish.coverImage || undefined,
        category: catalogCategoryName(dish.categoryId),
      });
    }
    for (const drink of drinksQuery.data ?? []) {
      map.set(`drink:${drink._id}`, {
        description: drink.description,
        image: drink.images?.[0] || undefined,
        category: catalogCategoryName(drink.categoryId),
        volume: drink.volume,
      });
    }
    for (const set of bottleSetsQuery.data ?? []) {
      const contents = (set.items ?? [])
        .slice(0, 3)
        .map((it) => `${it.quantity ? `${it.quantity}× ` : ''}${it.drinkId?.name ?? 'Drink'}`);
      if ((set.items ?? []).length > 3) contents.push(`+${(set.items ?? []).length - 3} more`);
      map.set(`bottle_set:${set._id}`, {
        image: set.image || undefined,
        contentsNote: contents.length ? contents.join(' · ') : undefined,
      });
    }
    return map;
  }, [dishesQuery.data, drinksQuery.data, bottleSetsQuery.data]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const from = todayOnly
      ? (() => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          return start.toISOString();
        })()
      : startOfDayIso(fromDate);
    const to = todayOnly ? new Date().toISOString() : endOfDayIso(toDate);
    ordersApi
      .list({
        page,
        limit: PAGE_SIZE,
        withLines: true,
        status: status || undefined,
        source: source || undefined,
        from,
        to,
      })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.items ?? []);
        setTotal(res.total ?? 0);
        setPages(res.pages ?? 1);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load orders');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, source, todayOnly, fromDate, toDate, refreshKey]);

  const stats = useMemo(() => {
    const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    const outstanding = orders.reduce((sum, o) => sum + (o.balance ?? 0), 0);
    const today = orders.filter((o) => isToday(o.createdAt)).length;
    const active = orders.filter((o) =>
      ['open', 'awaiting_confirmation', 'placed', 'preparing', 'ready', 'served', 'out_for_delivery'].includes(
        o.status,
      ),
    ).length;
    return [
      { label: 'Total orders', value: String(total) },
      { label: `Revenue · page ${page}`, value: money(revenue) },
      { label: 'Outstanding · page', value: money(outstanding) },
      { label: 'Active · page', value: `${active} active · ${today} today` },
    ];
  }, [orders, total, page]);

  const hasDateRange = Boolean(fromDate || toDate);
  const hasFilters = Boolean(status || source || todayOnly || hasDateRange);

  return (
    <div className="space-y-4">
      <InRoomDiningLane
        orders={laneOrders}
        onChanged={(updated) => {
          setLaneOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
          setRefreshKey((k) => k + 1);
        }}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((card) => (
          <div
            key={card.label}
            className="rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low"
          >
            <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              {card.label}
            </p>
            <p className="type-res-h2 mt-1 text-res-ink">
              {isLoading ? <span className="text-res-ink-muted">…</span> : card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            aria-pressed={todayOnly}
            onClick={() => {
              setTodayOnly((v) => !v);
              setPage(1);
            }}
            className={`type-res-small cursor-pointer rounded-full px-4 py-2.5 font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
              todayOnly
                ? 'bg-res-brand text-res-ink-inverted shadow-res-low hover:bg-res-brand-hover'
                : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
            }`}
          >
            For Today
          </button>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by source"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {!todayOnly && (
            <>
              <input
                type="date"
                aria-label="From date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className={selectClass}
              />
              <span aria-hidden className="type-res-small font-medium text-res-ink-muted">
                to
              </span>
              <input
                type="date"
                aria-label="To date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className={selectClass}
              />
            </>
          )}
          <button
            type="button"
            aria-label="Refresh orders"
            title="Refresh orders"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="type-res-small ml-auto cursor-pointer rounded-full bg-res-surface p-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-res-sm bg-res-surface" />
              ))}
            </div>
          ) : !orders.length ? (
            <div className="rounded-res-md bg-res-surface px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-res-card shadow-res-low">
                <Receipt className="h-5 w-5 text-res-brand" />
              </div>
              <p className="type-res-h3 text-res-ink">No orders yet</p>
              <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
                {hasFilters
                  ? todayOnly && !status && !source
                    ? 'No orders placed today yet.'
                    : !todayOnly && hasDateRange && !status && !source
                      ? 'No orders in this date range.'
                      : 'Nothing matches these filters.'
                  : 'Pre-orders and table orders will show up here.'}
              </p>
            </div>
          ) : (
            <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-res-line">
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Order
                    </th>
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Table
                    </th>
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Items
                    </th>
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Placed
                    </th>
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Status
                    </th>
                    <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Payment
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
                  {orders.map((order) => {
                    const lines = order.lines ?? [];
                    const itemCount = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
                    const preview = lines
                      .slice(0, 2)
                      .map((l) => `${l.quantity}× ${l.name}`)
                      .join(' · ');
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
                          {(() => {
                            const table = tableLabel(order.unitId);
                            return table ? (
                              <span className="type-res-body font-semibold whitespace-nowrap text-res-ink">
                                {table}
                              </span>
                            ) : (
                              <span className="type-res-body font-normal text-res-ink-muted">
                                —
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="type-res-body block font-medium text-res-ink">
                            {itemCount} item{itemCount === 1 ? '' : 's'}
                          </span>
                          {preview && (
                            <span className="type-res-small block max-w-[260px] truncate font-normal text-res-ink-muted">
                              {preview}
                              {lines.length > 2 ? ` +${lines.length - 2} more` : ''}
                            </span>
                          )}
                        </td>
                        <td className="type-res-body px-4 py-3 font-normal whitespace-nowrap text-res-ink-muted">
                          {formatPlacedAt(order.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${ORDER_STATUS_STYLE[order.status] ?? 'bg-res-surface text-res-ink-muted'}`}
                          >
                            {ORDER_STATUS_LABEL[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <PaymentStatusBadge status={order.paymentStatus} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="type-res-body block font-semibold text-res-ink">
                            {money(order.total)}
                          </span>
                          {order.balance > 0 && (
                            <span className="type-res-small mt-1 inline-block rounded-full bg-res-secondary px-2 py-0.5 font-semibold text-res-brand">
                              {money(order.balance)} due
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              className={actionClass}
                              onClick={() => setSelected(order)}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isLoading && total > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="type-res-small font-normal text-res-ink-muted">
              Page {page} of {pages} · {total} total
            </span>
            {pages > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors hover:text-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors hover:text-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {selected &&
        (() => {
          const lines = selected.lines ?? [];
          const itemCount = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
          const shortId = selected._id.slice(-6).toUpperCase();
          const guestContact = selected.guestPhone || selected.guestEmail || null;
          const table = tableLabel(selected.unitId);
          return (
            <Modal
              isOpen
              onClose={() => setSelected(null)}
              title={`${selected.guestName || 'Order'} · ${money(selected.total)}`}
              subtitle={`${SOURCE_LABEL[selected.source] ?? selected.source} · ${formatPlacedAt(selected.createdAt)}`}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${ORDER_STATUS_STYLE[selected.status] ?? 'bg-res-surface text-res-ink-muted'}`}
                  >
                    {ORDER_STATUS_LABEL[selected.status] ?? selected.status}
                  </span>
                  <PaymentStatusBadge status={selected.paymentStatus} />
                  <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink-muted">
                    Order #{shortId}
                  </span>
                  <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink-muted">
                    {SOURCE_LABEL[selected.source] ?? selected.source}
                  </span>
                  {table && (
                    <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
                      {table}
                    </span>
                  )}
                </div>

                {guestContact && (
                  <p className="type-res-small rounded-res-sm bg-res-surface px-3 py-2 font-normal text-res-ink-muted">
                    Guest contact: {guestContact}
                  </p>
                )}

                {(() => {
                  const handler = selected.staffId ? staffMap[selected.staffId] : null;
                  if (handler) {
                    const role = String(handler.role ?? '').toLowerCase();
                    const title =
                      role === 'waiter'
                        ? 'Waiter'
                        : role
                          ? role.charAt(0).toUpperCase() + role.slice(1)
                          : 'Staff';
                    return (
                      <p className="type-res-small rounded-res-sm bg-res-surface px-3 py-2 font-normal text-res-ink-muted">
                        {title}:{' '}
                        <span className="font-semibold text-res-ink">{handler.name}</span>
                      </p>
                    );
                  }
                  if (selected.staffId) {
                    return (
                      <p className="type-res-small rounded-res-sm bg-res-surface px-3 py-2 font-normal text-res-ink-muted">
                        Handled by staff …{selected.staffId.slice(-4)}
                      </p>
                    );
                  }
                  return (
                    <p className="type-res-small rounded-res-sm bg-res-surface px-3 py-2 font-normal text-res-ink-muted">
                      No waiter attached — placed by the guest.
                    </p>
                  );
                })()}

                {lines.length === 0 ? (
                  <p className="type-res-small font-normal text-res-ink-muted">
                    No items on this order.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="type-res-small font-semibold tracking-wide text-res-ink-muted uppercase">
                      Items ({itemCount})
                    </p>
                    <ul className="space-y-3">
                      {lines.map((line) => {
                        const detail = catalogMap.get(`${line.itemType}:${line.itemId}`);
                        const description = detail?.description;
                        const image = detail?.image;
                        const category = detail?.category;
                        const volume = detail?.volume;
                        const contentsNote = detail?.contentsNote;
                        return (
                          <li
                            key={line._id}
                            className="rounded-res-md border border-res-line bg-res-card p-3 shadow-res-low"
                          >
                            <div className="flex items-start gap-3">
                              <LineVisual
                                itemType={line.itemType}
                                image={image}
                                name={line.name}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                                    {ITEM_TYPE_LABEL[line.itemType] ?? line.itemType}
                                    {category ? ` · ${category}` : ''}
                                  </p>
                                  {volume && (
                                    <span className="type-res-caption rounded-full bg-res-surface px-2 py-0.5 font-semibold text-res-ink-muted">
                                      {volume}
                                    </span>
                                  )}
                                  {line.prepStatus && line.prepStatus !== 'queued' && (
                                    <span className="type-res-caption rounded-full bg-res-secondary px-2 py-0.5 font-semibold text-res-brand capitalize">
                                      {line.prepStatus}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-start justify-between gap-2">
                                  <h4 className="type-res-body font-semibold text-res-ink">
                                    {line.name}
                                  </h4>
                                  <span className="type-res-body shrink-0 font-semibold text-res-ink">
                                    {money(line.lineTotal)}
                                  </span>
                                </div>
                                {(description || contentsNote) && (
                                  <p className="type-res-small mt-0.5 line-clamp-2 font-normal text-res-ink-muted">
                                    {description || contentsNote}
                                  </p>
                                )}
                                <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                                  {line.quantity} × {money(line.unitPrice)}
                                </p>
                                {line.notes && (
                                  <p className="type-res-small mt-1 font-normal text-res-ink-muted italic">
                                    Note: {line.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {line.addons?.length > 0 && (
                              <div className="mt-2.5 border-t border-res-line pt-2.5">
                                <ul className="space-y-1">
                                  {line.addons.map((addon, i) => (
                                    <li
                                      key={`${line._id}-addon-${i}`}
                                      className="type-res-small flex justify-between gap-2 font-normal text-res-ink-muted"
                                    >
                                      <span>
                                        + {addon.name}
                                        {addon.quantity > 1 ? ` × ${addon.quantity}` : ''}
                                      </span>
                                      <span className="shrink-0 font-medium text-res-ink">
                                        {money(addon.unitPrice * (addon.quantity ?? 1))}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="rounded-res-md bg-res-surface p-4">
                  <p className="type-res-small font-semibold tracking-wide text-res-ink-muted uppercase">
                    Bill
                  </p>
                  <dl className="type-res-small mt-2 space-y-1.5 font-normal text-res-ink-muted">
                    <div className="flex justify-between gap-2">
                      <dt>Subtotal</dt>
                      <dd className="font-medium text-res-ink">{money(selected.subtotal)}</dd>
                    </div>
                    {selected.discount > 0 && (
                      <div className="flex justify-between gap-2">
                        <dt>Discount</dt>
                        <dd className="font-medium text-res-ink">
                          −{money(selected.discount)}
                        </dd>
                      </div>
                    )}
                    {selected.serviceFee > 0 && (
                      <div className="flex justify-between gap-2">
                        <dt>Service fee</dt>
                        <dd className="font-medium text-res-ink">
                          {money(selected.serviceFee)}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 border-t border-res-line pt-2">
                      <dt className="font-semibold text-res-ink">Total</dt>
                      <dd className="type-res-body font-semibold text-res-ink">
                        {money(selected.total)}
                      </dd>
                    </div>
                    {selected.amountPaid > 0 && (
                      <div className="flex justify-between gap-2">
                        <dt>Paid</dt>
                        <dd className="font-medium text-res-ink">
                          {money(selected.amountPaid)}
                        </dd>
                      </div>
                    )}
                    {selected.minimumDepositCredit > 0 && (
                      <div className="flex justify-between gap-2">
                        <dt>Deposit credit</dt>
                        <dd className="font-medium text-res-ink">
                          −{money(selected.minimumDepositCredit)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-2 flex items-center justify-between border-t border-res-line pt-3">
                    <span className="type-res-small font-medium text-res-ink-muted">
                      Still to pay
                    </span>
                    <span className="type-res-h3 text-res-ink">{money(selected.balance)}</span>
                  </div>
                </div>

                {selected.notes && (
                  <p className="type-res-small rounded-res-sm bg-res-surface px-3 py-2 font-normal text-res-ink-muted">
                    Order note: {selected.notes}
                  </p>
                )}
              </div>
            </Modal>
          );
        })()}
    </div>
  );
}
