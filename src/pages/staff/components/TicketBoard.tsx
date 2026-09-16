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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ordersApi } from '@/features/orders/api/service';
import type { OrderDto, OrderItemType, OrderLineDto } from '@/features/orders/types';

const POLL_MS = 20_000;

const ageMinutes = (createdAt?: string) =>
  createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000) : 0;

/** Ticket age severity: fresh, ageing, late. */
const ageTone = (minutes: number) =>
  minutes >= 20
    ? { border: 'border-l-red-500', chip: 'destructive' as const }
    : minutes >= 10
      ? { border: 'border-l-amber-500', chip: 'secondary' as const }
      : { border: 'border-l-green-500', chip: 'outline' as const };

const isOpenTicket = (status: string) => !['served', 'completed', 'cancelled'].includes(status);

const lineState = (line: OrderLineDto) => line.prepStatus ?? 'queued';

export interface TicketBoardProps {
  title: string;
  /** Line kinds this station owns; anything else belongs to another station. */
  itemTypes: OrderItemType[];
  /** Highlight tickets carrying add-ons / show items (cellar dispatch). */
  addOnAlert?: boolean;
}

/**
 * Shared ticket queue for the KDS, bar and cellar workspaces. Colour-coded by
 * ticket age, bumped line by line, and it refetches on an interval so a station
 * sees new tickets without a manual refresh.
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-[#0A6C6D]" />
          <h1 className={isFullscreen ? 'text-3xl font-bold' : 'text-2xl font-bold'}>{title}</h1>
          <Badge variant={tickets.length ? 'default' : 'secondary'}>{tickets.length} open</Badge>
          {tickets.length > 0 && (
            <span className="text-xs text-muted-foreground">
              oldest {ageMinutes(tickets[0].order.createdAt)} min
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          Nothing in the queue. New tickets appear here automatically.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map(({ order, lines }) => {
            const minutes = ageMinutes(order.createdAt);
            const tone = ageTone(minutes);
            const hasAddOns = addOnAlert && lines.some((line) => (line.addons ?? []).length > 0);
            return (
              <div
                key={order._id}
                className={`flex flex-col rounded-xl border border-l-4 bg-white p-4 shadow-sm ${tone.border}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {order.guestName || `Order ${order._id.slice(-6)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.status} · {order.lines?.length ?? lines.length} line(s)
                      {order.notes ? ` · ${order.notes}` : ''}
                    </p>
                  </div>
                  <Badge variant={tone.chip}>{minutes} min</Badge>
                </div>

                {hasAddOns && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                    <Bell className="w-3 h-3" /> Add-ons / show equipment needed
                  </div>
                )}

                <ul className="mt-3 flex-1 space-y-2">
                  {lines.map((line) => {
                    const state = lineState(line);
                    return (
                      <li key={line._id} className="rounded-lg border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">
                            {line.quantity}× {line.name}
                          </span>
                          {state === 'ready' ? (
                            <Badge variant="outline" className="gap-1 text-green-700">
                              <Check className="w-3 h-3" /> ready
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 bg-[#0A6C6D] hover:bg-[#085a5b]"
                              disabled={busyLine === line._id}
                              onClick={() =>
                                bump(order, line, state === 'preparing' ? 'ready' : 'preparing')
                              }
                            >
                              {busyLine === line._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : state === 'preparing' ? (
                                'Ready'
                              ) : (
                                'Start'
                              )}
                            </Button>
                          )}
                        </div>
                        {(line.addons ?? []).length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            + {line.addons.map((addon) => addon.name).join(', ')}
                          </p>
                        )}
                        {line.notes && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                            <StickyNote className="w-3 h-3" /> {line.notes}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={busyLine === order._id}
                  onClick={() => bumpAll(order, lines)}
                >
                  {busyLine === order._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Bump ticket'
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
