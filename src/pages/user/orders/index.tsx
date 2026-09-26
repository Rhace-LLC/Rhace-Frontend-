import { Link } from 'react-router';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import {
  money,
  useMyOrders,
  useOrderIntent,
  type OrderDto,
  type OrderStatus,
} from '@/features/orders';
import { PaymentStatusBadge } from '@/features/reservations';
import { useState } from 'react';

const SOURCE_LABEL: Record<string, string> = {
  reservation: 'Pre-order',
  quick_order: 'Table order',
  pos: 'Counter order',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  open: 'Open',
  placed: 'Placed',
  preparing: 'Being prepared',
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

function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${ORDER_STATUS_STYLE[status] ?? 'bg-res-surface text-res-ink-muted'}`}
    >
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function OrderCard({ order, onPay }: { order: OrderDto; onPay: (order: OrderDto) => void }) {
  const lines = order.lines ?? [];
  return (
    <article className="flex w-full flex-col rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
            {SOURCE_LABEL[order.source] ?? 'Order'}
            {order.createdAt ? ` · ${new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
          </p>
          <h3 className="type-res-h3 mt-1 text-res-ink">
            {lines.length
              ? `${lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0)} item${lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0) === 1 ? '' : 's'}`
              : 'Order'}
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <OrderStatusPill status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {lines.length > 0 && (
        <ul className="mt-3 rounded-res-md bg-res-surface p-3">
          {lines.map((line) => (
            <li
              key={line._id}
              className="type-res-body flex justify-between gap-2 border-b border-res-line py-2 font-normal text-res-ink last:border-0 last:pb-0 first:pt-0"
            >
              <span className="min-w-0">
                <span className="font-semibold">{line.quantity} × </span>
                <span className="line-clamp-1">{line.name}</span>
                {line.addons?.length > 0 && (
                  <span className="type-res-small block font-normal text-res-ink-muted">
                    + {line.addons.map((a) => a.name).join(', ')}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-semibold">{money(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-res-line pt-3">
        <div className="flex items-baseline gap-2">
          <p className="type-res-h3 text-res-ink">{money(order.total)}</p>
          {order.balance > 0 && (
            <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
              {money(order.balance)} still to pay
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {order.reservation && (
            <Link
              to={`/bookings/${order.reservation}`}
              className="type-res-small rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors hover:text-res-brand"
            >
              View booking
            </Link>
          )}
          {order.balance > 0 && (
            <button
              type="button"
              onClick={() => onPay(order)}
              className="type-res-small cursor-pointer rounded-full bg-res-brand px-4 py-2 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
            >
              Pay now
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

const UserOrdersPage = () => {
  const [status, setStatus] = useState('');
  const ordersQuery = useMyOrders(status ? { status } : undefined);
  const orderIntent = useOrderIntent();

  const items = ordersQuery.data?.items ?? [];

  const handlePay = async (order: OrderDto) => {
    try {
      const intent = await orderIntent.mutateAsync(order._id);
      if (intent?.authorization_url) window.location.href = intent.authorization_url;
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string; paystackError?: string } } })?.response
          ?.data?.paystackError ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not start payment.';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-res-surface">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto mb-[120px] max-w-7xl space-y-5 px-4 pt-4 pb-8 md:mt-[85px] md:mb-8 md:space-y-6 md:px-6 md:py-8 lg:px-8">
        <div>
          <h1 className="type-res-h2 text-res-ink">My orders</h1>
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">
            Every pre-order and table order in one place.
          </p>
        </div>

        <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
          <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
            <div
              role="tablist"
              aria-label="Filter orders by status"
              className="flex w-full gap-1 rounded-res-md bg-res-surface p-1 sm:w-max sm:rounded-full"
            >
              {[
                { id: '', label: 'All' },
                { id: 'placed', label: 'Placed' },
                { id: 'preparing', label: 'Being prepared' },
                { id: 'served', label: 'Served' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => {
                const isActive = status === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setStatus(tab.id)}
                    className={`type-res-body flex-1 cursor-pointer rounded-full px-4 py-2 whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-res-brand sm:flex-none ${
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

          <div className="mt-4">
            {ordersQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-res-md bg-res-card p-4 shadow-res-low">
                    <div className="h-4 w-1/3 animate-pulse rounded-full bg-res-surface" />
                    <div className="mt-3 h-5 w-2/3 animate-pulse rounded-full bg-res-surface" />
                    <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-res-surface" />
                  </div>
                ))}
              </div>
            ) : !items.length ? (
              <div className="rounded-res-md bg-res-card px-6 py-12 text-center shadow-res-low">
                <p className="type-res-h3 text-res-ink">No orders yet</p>
                <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
                  Pre-order food or drinks with your next booking and it will show up here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {items.map((order) => (
                  <OrderCard key={order._id} order={order} onPay={handlePay} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default UserOrdersPage;
