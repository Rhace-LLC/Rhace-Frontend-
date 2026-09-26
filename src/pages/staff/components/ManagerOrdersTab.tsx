import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Receipt } from 'lucide-react';
import { ordersApi } from '@/features/orders/api/service';
import { money } from '@/features/orders/money';
import { PaymentStatusBadge } from '@/features/reservations';
import type { OrderDto, OrderStatus } from '@/features/orders/types';

const SOURCE_LABEL: Record<string, string> = {
  reservation: 'Pre-order',
  quick_order: 'Table order',
  pos: 'Counter order',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  open: 'Open',
  placed: 'Placed',
  preparing: 'Preparing',
  served: 'Served',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  open: 'bg-res-surface text-res-ink-muted',
  placed: 'bg-res-secondary text-res-brand',
  preparing: 'bg-res-brand text-res-ink-inverted',
  served: 'bg-res-secondary text-res-brand',
  completed: 'bg-res-surface text-res-ink-muted',
  cancelled: 'bg-res-surface text-res-ink-muted line-through',
};

/**
 * Manager orders oversight: every order on this vendor, read-only.
 * Lists through the staff-scoped vendor lens (backend `orderScope`).
 */
export function ManagerOrdersTab() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    ordersApi
      .list({ limit: 50, withLines: true })
      .then((res) => {
        if (!cancelled) setOrders(res.items ?? []);
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
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-res-md bg-res-card p-4 shadow-res-low">
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-res-surface" />
            <div className="mt-3 h-5 w-2/3 animate-pulse rounded-full bg-res-surface" />
            <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-res-surface" />
          </div>
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="rounded-res-md bg-res-surface px-6 py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-res-card shadow-res-low">
          <Receipt className="h-5 w-5 text-res-brand" />
        </div>
        <p className="type-res-h3 text-res-ink">No orders yet</p>
        <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
          Pre-orders and table orders will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {orders.map((order) => {
        const lines = order.lines ?? [];
        const itemCount = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
        return (
          <article
            key={order._id}
            className="flex w-full flex-col rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                  {SOURCE_LABEL[order.source] ?? 'Order'}
                </p>
                <h3 className="type-res-h3 mt-1 text-res-ink">
                  {order.guestName || `Order …${order._id.slice(-6)}`} · {itemCount} item
                  {itemCount === 1 ? '' : 's'}
                </h3>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                <span
                  className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${ORDER_STATUS_STYLE[order.status] ?? 'bg-res-surface text-res-ink-muted'}`}
                >
                  {ORDER_STATUS_LABEL[order.status] ?? order.status}
                </span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>

            {lines.length > 0 && (
              <ul className="mt-3 rounded-res-md bg-res-surface p-3">
                {lines.slice(0, 5).map((line) => (
                  <li
                    key={line._id}
                    className="type-res-body flex justify-between gap-2 border-b border-res-line py-1.5 font-normal text-res-ink last:border-0 last:pb-0 first:pt-0"
                  >
                    <span className="min-w-0 line-clamp-1">
                      <span className="font-semibold">{line.quantity} × </span>
                      {line.name}
                    </span>
                    <span className="shrink-0 font-semibold">{money(line.lineTotal)}</span>
                  </li>
                ))}
                {lines.length > 5 && (
                  <li className="type-res-small pt-1.5 font-medium text-res-ink-muted">
                    +{lines.length - 5} more
                  </li>
                )}
              </ul>
            )}

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-res-line pt-3">
              <p className="type-res-h3 text-res-ink">{money(order.total)}</p>
              {order.balance > 0 ? (
                <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
                  {money(order.balance)} still to pay
                </span>
              ) : (
                <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink-muted">
                  Settled
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
