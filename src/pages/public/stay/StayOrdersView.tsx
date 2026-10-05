import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { money } from '@/features/orders/money';
import { ORDER_STATUS_TEXT, type OrderDto } from '@/features/orders/types';
import { guestStayApi } from '@/services/stay.service';

/** Guest-facing wording for each step. */
const GUEST_STATUS: Partial<Record<OrderDto['status'], string>> = {
  open: 'Waiting for payment',
  awaiting_confirmation: 'Waiting for the restaurant to confirm',
  placed: 'Confirmed',
  preparing: 'Being prepared',
  ready: 'Ready — on its way soon',
  out_for_delivery: 'On its way to you',
  delivered: 'Delivered',
  rejected: 'Not accepted',
};

const STEPS: Array<OrderDto['status']> = ['placed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

function stepIndex(status: OrderDto['status']): number {
  if (status === 'served' || status === 'completed') return STEPS.length - 1;
  return STEPS.indexOf(status);
}

/**
 * Guest order tracker: hotel services and linked-outlet orders, live via
 * the stay socket (`refreshKey` bumps on every order/folio event).
 */
const StayOrdersView = ({
  roomToken,
  onPaid,
  refreshKey = 0,
}: {
  roomToken: string;
  onPaid: () => void;
  refreshKey?: number;
}) => {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setOrders(await guestStayApi.orders());
    } catch {
      toast.error('Could not load your orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [refreshKey]);

  const payOnline = async (order: OrderDto) => {
    try {
      setPayingId(order._id);
      // Phase 6: an unpaid cart is paid as one split payment.
      const intent =
        order.cart && order.status === 'open'
          ? await guestStayApi.cartIntent(order.cart, roomToken)
          : await guestStayApi.orderIntent(order._id, roomToken);
      window.location.href = intent.authorization_url;
    } catch {
      toast.error('Could not start the online payment.');
      setPayingId(null);
    }
  };

  if (loading) return <p className="py-8 text-center text-sm text-slate-400">Loading…</p>;
  if (orders.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No orders yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {orders.map((o) => {
        const outstanding = Math.max(0, (o.total ?? 0) - (o.minimumDepositCredit ?? 0) - (o.amountPaid ?? 0));
        const step = stepIndex(o.status);
        const closed = o.status === 'rejected' || o.status === 'cancelled';
        return (
          <li key={o._id} className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{o.outletName || 'Hotel services'}</p>
              <p className={`text-sm font-bold ${closed ? 'text-slate-400 line-through' : ''}`}>
                {money(o.total)}
              </p>
            </div>
            <p
              className={`mt-0.5 text-xs font-semibold ${
                o.status === 'rejected' ? 'text-red-600' : 'text-slate-700'
              }`}
            >
              {GUEST_STATUS[o.status] ?? ORDER_STATUS_TEXT[o.status] ?? o.status}
            </p>
            {o.status === 'rejected' && (
              <p className="text-xs text-slate-500">
                {o.rejectReason || 'The restaurant could not take this order.'}{' '}
                {o.settlementMethod === 'online' && (o.amountPaid ?? 0) > 0
                  ? `A refund of ${money(o.amountPaid)} has been opened — the front desk will pay it back by cash or transfer.`
                  : 'Nothing was charged.'}
              </p>
            )}
            {!closed && step >= 0 && (
              <div className="mt-2 flex gap-1">
                {STEPS.map((s, i) => (
                  <span
                    key={s}
                    className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-slate-900' : 'bg-slate-200'}`}
                  />
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {(o.lines?.length ?? 0)} item(s)
              {o.fulfillment?.locationLabel ? ` · ${o.fulfillment.locationLabel}` : o.notes ? ` · ${o.notes}` : ''}
            </p>
            {(o.lines?.length ?? 0) > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {o.lines?.map((l) => (
                  <li key={l._id} className="flex justify-between text-xs text-slate-600">
                    <span>
                      {l.quantity}× {l.name}
                    </span>
                    <span>{money(l.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            )}
            {outstanding > 0 && !closed && o.settlementMethod === 'online' && (
              <button
                type="button"
                disabled={payingId === o._id}
                onClick={() => payOnline(o)}
                className="mt-2 w-full rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {o.cart && o.status === 'open' ? 'Complete payment' : `Pay ${money(outstanding)} online`}
              </button>
            )}
            {(o.fees ?? []).length > 0 && (
              <p className="mt-1 text-[11px] text-slate-400">
                Includes {(o.fees ?? []).map((f) => `${f.label} ${money(f.amount)}`).join(', ')}
              </p>
            )}
            {outstanding > 0 && !closed && o.settlementMethod !== 'online' && (
              <p className="mt-1 text-xs text-slate-400">On your room tab · {money(o.balance)} due</p>
            )}
          </li>
        );
      })}
      <button
        type="button"
        onClick={() => {
          void load();
          onPaid();
        }}
        className="w-full rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500"
      >
        Refresh status
      </button>
    </ul>
  );
};

export default StayOrdersView;
