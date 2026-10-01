import { useState } from 'react';
import { Modal } from '@/components/others/RhaceModal';
import { money, useOrderIntent, type OrderDto } from '../index';

const VENUE_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'bank_transfer', label: 'Transfer' },
  { id: 'pos', label: 'POS' },
];

const intentErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string; paystackError?: string } } })?.response
    ?.data?.paystackError ||
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  fallback;

/**
 * Customer checkout choice: pay online now (Paystack) or pay at the venue
 * (cash/card/transfer/POS). Venue payments stay on the order balance until a
 * waiter or vendor records them via the offline-payment endpoint.
 */
export function OrderPaymentChoiceModal({
  order,
  onClose,
  onPaidAtVenue,
}: {
  order: OrderDto | null;
  onClose: () => void;
  onPaidAtVenue: (order: OrderDto, method: string) => void;
}) {
  const orderIntent = useOrderIntent();
  const [venueMethod, setVenueMethod] = useState('cash');
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;
  const lines = order.lines ?? [];
  const itemCount = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
  // Table/quick orders are placed from the seat — only pre-orders
  // (`reservation`) are made away from the venue.
  const atTable = order.source !== 'reservation';

  const payOnline = async () => {
    setError(null);
    try {
      const intent = await orderIntent.mutateAsync(order._id);
      if (intent?.authorization_url) {
        window.location.href = intent.authorization_url;
        return;
      }
      onClose();
    } catch (err) {
      setError(intentErrorMessage(err, 'Could not start payment.'));
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Pay ${money(order.balance)}`}
      subtitle={`${itemCount} item${itemCount === 1 ? '' : 's'} · ${money(order.total)} total`}
      footer={
        <button
          type="button"
          onClick={onClose}
          disabled={orderIntent.isPending}
          className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand disabled:opacity-50"
        >
          Cancel
        </button>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="type-res-small rounded-res-md bg-res-surface px-4 py-3 font-medium text-res-ink">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={payOnline}
          disabled={orderIntent.isPending}
          className="type-res-body w-full cursor-pointer rounded-full bg-res-brand px-4 py-3 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {orderIntent.isPending ? 'Redirecting…' : `Pay ${money(order.balance)} online now`}
        </button>

        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px flex-1 bg-res-line" />
          <span className="type-res-small font-medium text-res-ink-muted">
            {atTable ? 'or pay at your table' : 'or pay at the venue'}
          </span>
          <span aria-hidden className="h-px flex-1 bg-res-line" />
        </div>

        <div>
          <p className="type-res-small mb-1.5 font-medium text-res-ink-muted">
            How will you pay?
          </p>
          <div className="flex flex-wrap gap-2">
            {VENUE_METHODS.map((method) => {
              const isActive = venueMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setVenueMethod(method.id)}
                  aria-pressed={isActive}
                  className={`type-res-small cursor-pointer rounded-full px-4 py-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                    isActive
                      ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                      : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
                  }`}
                >
                  {method.label}
                </button>
              );
            })}
          </div>
          <p className="type-res-small mt-2 font-normal text-res-ink-muted">
            {atTable
              ? 'Your order is placed now — your waiter will collect payment at your table.'
              : "Your order is placed now — tell your waiter, and they'll record your payment."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onPaidAtVenue(order, venueMethod)}
          disabled={orderIntent.isPending}
          className="type-res-body w-full cursor-pointer rounded-full bg-res-surface px-4 py-3 font-semibold text-res-ink transition-colors hover:text-res-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          I prefer to pay in cash, card or transfer
        </button>
      </div>
    </Modal>
  );
}
