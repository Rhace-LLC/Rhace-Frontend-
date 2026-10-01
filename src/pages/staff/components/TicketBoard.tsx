import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Bell,
  Check,
  ChefHat,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  StickyNote,
} from 'lucide-react';
import { ordersApi } from '@/features/orders/api/service';
import type { OrderDto, OrderItemType, OrderLineDto } from '@/features/orders/types';

const POLL_MS = 20_000;

const SOURCE_LABEL: Record<string, string> = {
  reservation: 'Pre-order',
  quick_order: 'Table order',
  pos: 'Counter order',
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

const ageMinutes = (createdAt?: string) =>
  createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000) : 0;

function formatPlacedAt(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/** Ticket age severity: fresh, ageing, late. */
const ageChipClass = (minutes: number) =>
  minutes >= 20
    ? 'bg-red-50 text-red-700'
    : minutes >= 10
      ? 'bg-amber-50 text-amber-700'
      : 'bg-res-surface text-res-ink-muted';

/** Unconfirmed table orders stay invisible until the waiter confirms them. */
const isOpenTicket = (status: string) =>
  !['awaiting_confirmation', 'served', 'completed', 'cancelled'].includes(status);

const lineState = (line: OrderLineDto) => line.prepStatus ?? 'queued';

export interface TicketBoardProps {
  title: string;
  /** Line kinds this station owns; anything else belongs to another station. */
  itemTypes: OrderItemType[];
  /** Highlight tickets carrying add-ons / show items (cellar dispatch). */
  addOnAlert?: boolean;
}

/**
 * Shared ticket queue for the KDS, bar and cellar workspaces. One row per
 * order, colour-coded by ticket age, bumped line by line, and it refetches on
 * an interval so a station sees new tickets without a manual refresh.
 */
export default function TicketBoard({ title, itemTypes, addOnAlert = false }: TicketBoardProps) {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFullscreenRef = useRef(false);

  const itemTypesKey = itemTypes.join(',');

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setIsRefreshing(true);
        const res = await ordersApi.list({ limit: 60, withLines: true });
        setOrders(res.items ?? []);
      } catch {
        if (!silent) toast.error('Failed to load the ticket queue');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const kinds = useMemo(() => itemTypesKey.split(',') as OrderItemType[], [itemTypesKey]);

  /** Only the lines this station is responsible for. */
  const stationLines = useCallback(
    (order: OrderDto) => (order.lines ?? []).filter((line) => kinds.includes(line.itemType)),
    [kinds],
  );

  const tickets = useMemo(
    () =>
      orders
        .filter((order) => isOpenTicket(order.status))
        .map((order) => ({ order, lines: stationLines(order) }))
        .filter(
          ({ lines }) => lines.length > 0 && lines.some((line) => lineState(line) !== 'ready'),
        )
        .sort(
          (a, b) =>
            new Date(a.order.createdAt ?? 0).getTime() - new Date(b.order.createdAt ?? 0).getTime(),
        ),
    [orders, stationLines],
  );

  const replaceOrder = (updated: OrderDto) =>
    setOrders((prev) => prev.map((order) => (order._id === updated._id ? updated : order)));

  const bump = async (order: OrderDto, line: OrderLineDto, next: 'preparing' | 'ready') => {
    try {
      setBusyLine(line._id);
      const updated = await ordersApi.bumpLine(order._id, line._id, next);
      replaceOrder(updated);
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to bump the ticket',
      );
    } finally {
      setBusyLine(null);
    }
  };

  /** Bump everything still outstanding on one ticket. */
  const bumpAll = async (order: OrderDto, lines: OrderLineDto[]) => {
    try {
      setBusyLine(order._id);
      let latest: OrderDto | null = null;
      for (const line of lines) {
        if (lineState(line) === 'ready') continue;
        latest = await ordersApi.bumpLine(order._id, line._id, 'ready');
      }
      if (latest) replaceOrder(latest);
      toast.success('Ticket bumped');
    } catch {
      toast.error('Failed to bump the ticket');
    } finally {
      setBusyLine(null);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (isFullscreenRef.current) {
        await document.exitFullscreen();
        isFullscreenRef.current = false;
        setIsFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        isFullscreenRef.current = true;
        setIsFullscreen(true);
      }
    } catch {
      // Browsers can refuse (e.g. not user-initiated); keep the plain layout.
      toast.error('Fullscreen is not available');
    }
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', () => {
      const active = Boolean(document.fullscreenElement);
      isFullscreenRef.current = active;
      setIsFullscreen(active);
    });
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-res-sm bg-res-surface" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-res-brand" />
            <h1 className="type-res-h2 text-res-ink">{title}</h1>
            <span
              className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${
                tickets.length
                  ? 'bg-res-brand text-res-ink-inverted'
                  : 'bg-res-surface text-res-ink-muted'
              }`}
            >
              {tickets.length} open
            </span>
          </div>
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">
            {tickets.length > 0
              ? `Oldest ticket waiting ${ageMinutes(tickets[0].order.createdAt)} min · auto-refreshes`
              : 'New tickets appear here automatically.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            disabled={isRefreshing}
            aria-label="Refresh tickets"
            title="Refresh tickets"
            className="type-res-small cursor-pointer rounded-full bg-res-surface p-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="type-res-small cursor-pointer rounded-full bg-res-surface p-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {tickets.length === 0 ? (
          <div className="rounded-res-md bg-res-surface px-6 py-12 text-center">
            <p className="type-res-h3 text-res-ink">Queue clear</p>
            <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
              Nothing in the queue. New tickets appear here automatically.
            </p>
          </div>
        ) : (
          <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="border-b border-res-line">
                  <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                    Ticket
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(({ order, lines }) => {
                  const minutes = ageMinutes(order.createdAt);
                  const hasAddOns =
                    addOnAlert && lines.some((line) => (line.addons ?? []).length > 0);
                  return (
                    <tr
                      key={order._id}
                      className="border-b border-res-line align-top transition-colors last:border-0 hover:bg-res-surface/60"
                    >
                      <td className="px-4 py-3">
                        <span className="type-res-body block font-semibold text-res-ink">
                          {order.guestName || `Order …${order._id.slice(-6)}`}
                        </span>
                        <span className="type-res-small block font-normal text-res-ink-muted">
                          {SOURCE_LABEL[order.source] ?? order.source} · #
                          {order._id.slice(-6).toUpperCase()}
                        </span>
                        {order.notes && (
                          <span className="type-res-small mt-1 block font-normal text-res-ink-muted italic">
                            {order.notes}
                          </span>
                        )}
                        {hasAddOns && (
                          <span className="type-res-small mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                            <Bell className="h-3 w-3" /> Add-ons / show equipment needed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="type-res-body block font-normal text-res-ink-muted">
                          {formatPlacedAt(order.createdAt)}
                        </span>
                        <span
                          className={`type-res-small mt-1 inline-block rounded-full px-2 py-0.5 font-semibold ${ageChipClass(minutes)}`}
                        >
                          {minutes} min{minutes >= 20 ? ' · Late' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ul className="max-w-[420px] space-y-2">
                          {lines.map((line) => {
                            const state = lineState(line);
                            return (
                              <li
                                key={line._id}
                                className="rounded-res-sm border border-res-line bg-res-card p-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="type-res-body min-w-0 font-medium text-res-ink">
                                    <span className="font-semibold">{line.quantity}× </span>
                                    {line.name}
                                  </span>
                                  {state === 'ready' ? (
                                    <span className="type-res-small inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                      <Check className="h-3 w-3" /> ready
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={busyLine === line._id}
                                      onClick={() =>
                                        bump(
                                          order,
                                          line,
                                          state === 'preparing' ? 'ready' : 'preparing',
                                        )
                                      }
                                      className="type-res-small shrink-0 cursor-pointer rounded-full bg-res-brand px-3.5 py-1.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {busyLine === line._id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : state === 'preparing' ? (
                                        'Ready'
                                      ) : (
                                        'Start'
                                      )}
                                    </button>
                                  )}
                                </div>
                                {(line.addons ?? []).length > 0 && (
                                  <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                                    + {line.addons.map((addon) => addon.name).join(', ')}
                                  </p>
                                )}
                                {line.notes && (
                                  <p className="type-res-small mt-1 flex items-center gap-1 font-medium text-amber-700">
                                    <StickyNote className="h-3 w-3 shrink-0" /> {line.notes}
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap capitalize ${ORDER_STATUS_STYLE[order.status] ?? 'bg-res-surface text-res-ink-muted'}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busyLine === order._id}
                          onClick={() => bumpAll(order, lines)}
                          className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyLine === order._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Bump ticket'
                          )}
                        </button>
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
  );
}
