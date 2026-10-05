import { Link } from 'react-router';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import { Modal } from '@/components/others/RhaceModal';
import {
  money,
  OrderBuilder,
  OrderPaymentChoiceModal,
  ordersApi,
  useMyOrders,
  useVendorBottleSets,
  useVendorDishes,
  useVendorDrinks,
  type CreateOrderLineInput,
  type OrderDto,
  type OrderItemType,
  type OrderStatus,
} from '@/features/orders';
import { PaymentStatusBadge } from '@/features/reservations';
import { userService } from '@/services/user.service';
import { useEffect, useMemo, useState } from 'react';
import { GlassWater, Package, UtensilsCrossed } from 'lucide-react';

const SOURCE_LABEL: Record<string, string> = {
  reservation: 'Pre-order',
  quick_order: 'Table order',
  pos: 'Counter order',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  open: 'Open',
  awaiting_confirmation: 'Awaiting confirmation',
  placed: 'Placed',
  preparing: 'Being prepared',
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

function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${ORDER_STATUS_STYLE[status] ?? 'bg-res-surface text-res-ink-muted'}`}
    >
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function formatPlacedAt(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
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

function OrderCard({
  order,
  onPay,
  onView,
}: {
  order: OrderDto;
  onPay: (order: OrderDto) => void;
  onView: (order: OrderDto) => void;
}) {
  const lines = order.lines ?? [];
  const itemCount = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
  const preview = lines.slice(0, 2).map((l) => l.name).join(' · ');
  const placedAt = formatPlacedAt(order.createdAt);
  return (
    <article className="flex w-full flex-col rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
            {SOURCE_LABEL[order.source] ?? 'Order'}
          </p>
          <h3 className="type-res-h3 mt-1 text-res-ink">
            {itemCount ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Order'}
          </h3>
          {placedAt && (
            <p className="type-res-small mt-1 font-normal text-res-ink-muted">
              Placed {placedAt}
            </p>
          )}
          {preview && (
            <p className="type-res-small mt-0.5 line-clamp-1 font-normal text-res-ink-muted">
              {preview}
              {lines.length > 2 ? ` +${lines.length - 2} more` : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <OrderStatusPill status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {order.reservation && (
        <p className="type-res-small mt-3 rounded-res-sm bg-res-surface px-3 py-2 font-medium text-res-ink-muted">
          This order is linked to your booking.
        </p>
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
          <button
            type="button"
            onClick={() => onView(order)}
            className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors hover:text-res-brand"
          >
            View details
          </button>
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

function OrderDetailsModal({
  order,
  onClose,
  onPay,
  onUpdated,
}: {
  order: OrderDto | null;
  onClose: () => void;
  onPay: (order: OrderDto) => void;
  onUpdated: (order: OrderDto) => void;
}) {
  const vendorId = order?.vendor;
  const dishesQuery = useVendorDishes(vendorId);
  const drinksQuery = useVendorDrinks(vendorId);
  const bottleSetsQuery = useVendorBottleSets(vendorId);

  // Add-more-items mode: same menu, submitted onto this order.
  const [adding, setAdding] = useState(false);
  const [menuVertical, setMenuVertical] = useState<string | undefined>(order?.vertical);
  const [menuLoading, setMenuLoading] = useState(false);
  const [addingBusy, setAddingBusy] = useState(false);

  // Vendor type drives the menu (dishes vs bottle sets); quick orders often
  // carry no `vertical`, so resolve it from the venue when add mode opens.
  useEffect(() => {
    if (!adding || menuVertical || !order) return;
    let active = true;
    setMenuLoading(true);
    userService
      .getVendor(order.vendor)
      .then((body) => {
        const venue = ((body as { data?: unknown })?.data ?? body) as {
          vendorType?: string;
        };
        if (active) setMenuVertical(venue?.vendorType?.toLowerCase());
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setMenuLoading(false);
      });
    return () => {
      active = false;
    };
  }, [adding, menuVertical, order]);

  const openAdding = () => {
    setMenuVertical(order?.vertical);
    setAdding(true);
  };

  const handleAdd = async (newLines: CreateOrderLineInput[]) => {
    if (!order || !newLines.length) return;
    try {
      setAddingBusy(true);
      for (const line of newLines) {
        await ordersApi.addLine(order._id, line);
      }
      const updated = await ordersApi.get(order._id);
      setAdding(false);
      onUpdated(updated);
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not add items.',
      );
    } finally {
      setAddingBusy(false);
    }
  };

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

  if (!order) return null;
  const lines = order.lines ?? [];
  const placedAt = formatPlacedAt(order.createdAt);
  const itemCount = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
  const shortId = order._id.slice(-6).toUpperCase();
  const editable = !['completed', 'cancelled'].includes(order.status);
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${SOURCE_LABEL[order.source] ?? 'Order'} · ${money(order.total)}`}
      subtitle={`${itemCount} item${itemCount === 1 ? '' : 's'}${placedAt ? ` · Placed ${placedAt}` : ''}`}
      footer={
        <>
          {order.reservation && (
            <Link
              to={`/bookings/${order.reservation}`}
              className="type-res-small rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
            >
              See booking
            </Link>
          )}
          {order.balance > 0 && (
            <button
              type="button"
              onClick={() => onPay(order)}
              className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
            >
              Pay {money(order.balance)} now
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <OrderStatusPill status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
          <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink-muted">
            Order #{shortId}
          </span>
          <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink-muted">
            {SOURCE_LABEL[order.source] ?? order.source}
          </span>
        </div>

        {order.reservation && (
          <p className="type-res-small rounded-res-md bg-res-secondary px-4 py-2.5 font-medium text-res-brand">
            This order is linked to your booking.
          </p>
        )}

        {adding ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAdding(false)}
              disabled={addingBusy}
              className="type-res-small font-semibold text-res-ink-muted transition-colors hover:text-res-brand disabled:opacity-50"
            >
              ← Back to order
            </button>
            {menuLoading ? (
              <div className="h-64 animate-pulse rounded-res-lg bg-res-surface" />
            ) : (
              <OrderBuilder
                vendorId={order.vendor}
                vertical={menuVertical}
                submitLabel="Add to order"
                submitting={addingBusy}
                onSubmit={handleAdd}
              />
            )}
          </div>
        ) : (
          <>
            {lines.length === 0 ? (
          <p className="type-res-small font-normal text-res-ink-muted">No items on this order.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="type-res-small font-semibold tracking-wide text-res-ink-muted uppercase">
                Items ({itemCount})
              </p>
              {editable && (
                <button
                  type="button"
                  onClick={openAdding}
                  className="type-res-small cursor-pointer rounded-full bg-res-surface px-3.5 py-1.5 font-semibold text-res-ink transition-colors hover:text-res-brand"
                >
                  + Add more
                </button>
              )}
            </div>
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
                      <LineVisual itemType={line.itemType} image={image} name={line.name} />
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
                          <h4 className="type-res-body font-semibold text-res-ink">{line.name}</h4>
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
              <dd className="font-medium text-res-ink">{money(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between gap-2">
                <dt>Discount</dt>
                <dd className="font-medium text-res-ink">−{money(order.discount)}</dd>
              </div>
            )}
            {order.serviceFee > 0 && (
              <div className="flex justify-between gap-2">
                <dt>Service fee</dt>
                <dd className="font-medium text-res-ink">{money(order.serviceFee)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2 border-t border-res-line pt-2">
              <dt className="font-semibold text-res-ink">Total</dt>
              <dd className="type-res-body font-semibold text-res-ink">{money(order.total)}</dd>
            </div>
            {order.amountPaid > 0 && (
              <div className="flex justify-between gap-2">
                <dt>Paid</dt>
                <dd className="font-medium text-res-ink">{money(order.amountPaid)}</dd>
              </div>
            )}
            {order.minimumDepositCredit > 0 && (
              <div className="flex justify-between gap-2">
                <dt>Deposit credit</dt>
                <dd className="font-medium text-res-ink">
                  −{money(order.minimumDepositCredit)}
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-2 flex items-center justify-between border-t border-res-line pt-3">
            <span className="type-res-small font-medium text-res-ink-muted">Still to pay</span>
            <span className="type-res-h3 text-res-ink">{money(order.balance)}</span>
          </div>
        </div>

        {order.notes && (
          <p className="type-res-small rounded-res-sm bg-res-surface px-3 py-2 font-normal text-res-ink-muted">
            Order note: {order.notes}
          </p>
        )}
          </>
        )}
      </div>
    </Modal>
  );
}

const UserOrdersPage = () => {
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<OrderDto | null>(null);
  const ordersQuery = useMyOrders(status ? { status } : undefined);

  const items = ordersQuery.data?.items ?? [];
  const [payOrder, setPayOrder] = useState<OrderDto | null>(null);

  const handlePay = (order: OrderDto) => setPayOrder(order);

  const handlePaidAtVenue = (order: OrderDto) => {
    setPayOrder(null);
    toast.success(
      order.source === 'reservation'
        ? 'Noted — you can settle with your waiter at the venue.'
        : 'Noted — your waiter will collect payment at your table.',
    );
  };

  /** Fresh order after the guest adds items: refresh + collect new balance. */
  const handleUpdated = (updated: OrderDto) => {
    setSelected(updated);
    ordersQuery.refetch();
    if (updated.balance > 0) {
      setPayOrder(updated);
    } else {
      toast.success('Items added to your order');
    }
  };

  return (
    <div className="min-h-screen bg-res-surface">
      <Header />
      <div aria-hidden className="h-[96px] md:hidden" />
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
                { id: 'awaiting_confirmation', label: 'Awaiting confirmation' },
                { id: 'placed', label: 'Placed' },
                { id: 'preparing', label: 'Being prepared' },
                { id: 'ready', label: 'Ready' },
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
                  <OrderCard key={order._id} order={order} onPay={handlePay} onView={setSelected} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>

      <OrderDetailsModal
        order={selected}
        onClose={() => setSelected(null)}
        onPay={handlePay}
        onUpdated={handleUpdated}
      />
      <OrderPaymentChoiceModal
        order={payOrder}
        onClose={() => setPayOrder(null)}
        onPaidAtVenue={handlePaidAtVenue}
      />
    </div>
  );
};

export default UserOrdersPage;
