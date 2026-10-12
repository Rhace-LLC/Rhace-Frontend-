import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { BellRing, Loader2, MapPin, Truck } from 'lucide-react';
import { ordersApi } from '../api/service';
import { money } from '../money';
import { isLinkedStayOrder, type OrderDto } from '../types';

const REJECT_REASONS = ['Kitchen is closed', 'Item unavailable', 'Too busy right now', 'Cannot deliver there'];

const actionClass =
  'type-res-small inline-flex cursor-pointer items-center gap-1 rounded-full px-3.5 py-1.5 font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50';

function secondsLeft(acceptBy: string | null | undefined, now: number): number | null {
  if (!acceptBy) return null;
  const at = new Date(acceptBy).getTime();
  return Number.isNaN(at) ? null : Math.max(0, Math.floor((at - now) / 1000));
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function destination(order: OrderDto): string {
  const label = order.fulfillment?.locationLabel || 'Hotel delivery';
  const at = order.fulfillment?.scheduledFor
    ? ` · for ${new Date(order.fulfillment.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '';
  return `${label}${at}`;
}

interface Props {
  orders: OrderDto[];
  /** Called with the updated order after any action, so the parent can merge it. */
  onChanged: (order: OrderDto) => void;
}

/**
 * Phase 5 outlet lane: room-service orders from linked hotels. Pending
 * orders need Accept/Reject before their deadline (the hotel auto-rejects
 * after it); accepted ones go to the normal ticket flow, then the runner
 * dispatches and delivers them here.
 */
export function InRoomDiningLane({ orders, onChanged }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const lane = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            o.source === 'in_stay' &&
            isLinkedStayOrder(o) &&
            ['awaiting_confirmation', 'ready', 'out_for_delivery'].includes(o.status),
        )
        .sort(
          (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
        ),
    [orders],
  );
  const hasPending = lane.some((o) => o.status === 'awaiting_confirmation');

  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasPending]);

  if (lane.length === 0) return null;

  const run = async (order: OrderDto, action: () => Promise<OrderDto>, success: string) => {
    try {
      setBusy(order._id);
      const updated = await action();
      onChanged({ ...order, ...updated });
      toast.success(success);
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not update the order',
      );
    } finally {
      setBusy(null);
      setRejecting(null);
    }
  };

  return (
    <section className="rounded-res-lg border border-amber-200 bg-amber-50/40 p-4 shadow-res-low">
      <div className="flex items-center gap-2">
        <BellRing className="h-5 w-5 text-amber-700" />
        <h2 className="type-res-h3 text-res-ink">In-room dining</h2>
        <span className="type-res-small rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">
          {lane.length}
        </span>
      </div>
      <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
        Room-service orders from linked hotels. Accept before the timer runs out or the hotel
        returns the order to the guest.
      </p>

      <ul className="mt-3 space-y-2">
        {lane.map((order) => {
          const left = order.status === 'awaiting_confirmation' ? secondsLeft(order.acceptBy, now) : null;
          const urgent = left !== null && left <= 120;
          return (
            <li key={order._id} className="rounded-res-md border border-res-line bg-res-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="type-res-body font-semibold text-res-ink">
                    {order.guestName || 'Guest'} · #{order._id.slice(-6).toUpperCase()}
                  </p>
                  <p className="type-res-small mt-0.5 flex items-center gap-1 font-normal text-res-ink-muted">
                    <MapPin className="h-3 w-3" /> {destination(order)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="type-res-body font-semibold text-res-ink">{money(order.total)}</p>
                  {left !== null && (
                    <p
                      className={`type-res-small font-semibold ${urgent ? 'text-red-600' : 'text-amber-700'}`}
                    >
                      {left > 0 ? `Respond in ${clock(left)}` : 'Timing out…'}
                    </p>
                  )}
                  {order.status !== 'awaiting_confirmation' && (
                    <p className="type-res-small font-semibold text-res-brand">
                      {order.status === 'ready' ? 'Ready to dispatch' : 'Out for delivery'}
                    </p>
                  )}
                </div>
              </div>

              <ul className="mt-2 space-y-0.5">
                {(order.lines ?? []).map((line) => (
                  <li key={line._id} className="type-res-small font-normal text-res-ink">
                    <span className="font-semibold">{line.quantity}×</span> {line.name}
                    {line.notes ? <span className="text-amber-700"> — {line.notes}</span> : null}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {order.status === 'awaiting_confirmation' && rejecting !== order._id && (
                  <>
                    <button
                      type="button"
                      disabled={busy === order._id || left === 0}
                      onClick={() => run(order, () => ordersApi.accept(order._id), 'Order accepted')}
                      className={`${actionClass} bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover`}
                    >
                      {busy === order._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Accept'}
                    </button>
                    <button
                      type="button"
                      disabled={busy === order._id}
                      onClick={() => setRejecting(order._id)}
                      className={`${actionClass} bg-res-surface text-red-600 hover:bg-red-50`}
                    >
                      Reject
                    </button>
                  </>
                )}
                {order.status === 'awaiting_confirmation' && rejecting === order._id && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="type-res-small font-semibold text-res-ink-muted">Reason:</span>
                    {REJECT_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        disabled={busy === order._id}
                        onClick={() =>
                          run(order, () => ordersApi.reject(order._id, reason), 'Order rejected')
                        }
                        className={`${actionClass} bg-red-50 text-red-700 hover:bg-red-100`}
                      >
                        {reason}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRejecting(null)}
                      className={`${actionClass} bg-res-surface text-res-ink`}
                    >
                      Back
                    </button>
                  </div>
                )}
                {order.status === 'ready' && (
                  <button
                    type="button"
                    disabled={busy === order._id}
                    onClick={() =>
                      run(order, () => ordersApi.updateStatus(order._id, 'out_for_delivery'), 'Dispatched')
                    }
                    className={`${actionClass} bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover`}
                  >
                    <Truck className="h-3.5 w-3.5" /> Dispatch
                  </button>
                )}
                {(order.status === 'ready' || order.status === 'out_for_delivery') && (
                  <button
                    type="button"
                    disabled={busy === order._id}
                    onClick={() =>
                      run(order, () => ordersApi.updateStatus(order._id, 'delivered'), 'Marked delivered')
                    }
                    className={`${actionClass} bg-res-surface text-res-ink hover:text-res-brand`}
                  >
                    Delivered
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
