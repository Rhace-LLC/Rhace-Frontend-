import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { money } from '@/features/orders/money';
import { guestStayApi, type StayLocation } from '@/services/stay.service';
import type { useStayCart, StayCartLine } from '@/features/stay/cart';

type Cart = ReturnType<typeof useStayCart>;

interface Props {
  open: boolean;
  onClose: () => void;
  roomLabel: string;
  creditLimit: number;
  availableCredit: number;
  cart: Cart;
  roomToken: string;
  /** Phase 8: ordering needs a connection. */
  online?: boolean;
  onDone: () => void;
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Guest checkout. The cart may mix hotel services and dishes from linked
 * outlets; the server splits it into one order per fulfilling vendor, adds
 * the hotel's fees and runs the credit check. Paying online is ONE Paystack
 * payment for the whole cart, split between the hotel and each outlet.
 */
const StayCheckoutModal = ({
  open,
  onClose,
  roomLabel,
  availableCredit,
  cart,
  roomToken,
  online = true,
  onDone,
}: Props) => {
  const [paying, setPaying] = useState<'room' | 'online'>('room');
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<StayLocation[]>([]);
  // One key per attempt: a double tap or network retry returns the same result.
  const attemptKey = useRef<string>(uid());

  useEffect(() => {
    if (!open) return;
    attemptKey.current = uid();
    guestStayApi
      .locations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, [open]);

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; lines: StayCartLine[] }>();
    for (const line of cart.lines) {
      const key = line.vendorLink ?? 'hotel';
      if (!map.has(key)) {
        map.set(key, { title: line.vendorLink ? line.outletName || 'Restaurant' : 'Hotel services', lines: [] });
      }
      map.get(key)!.lines.push(line);
    }
    return [...map.entries()];
  }, [cart.lines]);

  const outletLinks = useMemo(
    () => [...new Set(cart.lines.map((l) => l.vendorLink).filter(Boolean) as string[])],
    [cart.lines],
  );

  // Locations an outlet in the cart can deliver to; hotel-only carts can use any.
  const eligibleLocations = useMemo(
    () =>
      outletLinks.length
        ? locations.filter((loc) => outletLinks.every((id) => loc.vendorLinks.includes(id)))
        : locations,
    [locations, outletLinks],
  );

  if (!open) return null;

  const overCredit = cart.subtotal > availableCredit;
  const canRoom = !overCredit && cart.lines.length > 0;
  const canOnline = cart.lines.length > 0;
  const needsLocation = cart.fulfillment.mode === 'location' && cart.hasOutletItems && !cart.fulfillment.zoneId;

  const submit = async () => {
    if (cart.lines.length === 0 || submitting) return;
    if (needsLocation) {
      toast.error('Pick where we should bring your restaurant order.');
      return;
    }
    setSubmitting(true);
    try {
      const zone = locations.find((l) => l._id === cart.fulfillment.zoneId);
      const result = await guestStayApi.checkout({
        items: cart.lines.map((l) => ({
          itemType: l.kind === 'dish' ? 'dish' : 'hotel_service',
          itemId: l.itemId,
          quantity: l.quantity,
          notes: l.notes,
          serviceStart: l.serviceStart,
          ...(l.vendorLink ? { vendorLink: l.vendorLink } : {}),
        })),
        fulfillment: {
          mode: cart.fulfillment.mode,
          ...(cart.fulfillment.mode === 'location'
            ? {
                ...(zone ? { zoneId: zone._id } : {}),
                locationLabel: cart.fulfillment.locationLabel || (zone ? '' : 'Property location'),
              }
            : {}),
          ...(cart.fulfillment.scheduledFor
            ? { scheduledFor: new Date(cart.fulfillment.scheduledFor).toISOString() }
            : {}),
        },
        paymentMethod: paying,
        idempotencyKey: attemptKey.current,
      });
      cart.clear();
      if (paying === 'online') {
        // One split payment covers every order in the cart. If the redirect
        // is abandoned, the tracker offers to pay the cart again.
        const intent = result.cart
          ? await guestStayApi.cartIntent(result.cart, roomToken)
          : await guestStayApi.orderIntent(result.orderId, roomToken);
        window.location.href = intent.authorization_url;
        return;
      }
      const pending = (result.orders ?? []).filter((o) => o.status === 'awaiting_confirmation');
      toast.success(
        pending.length
          ? `Sent to ${pending.map((o) => o.outletName || 'the restaurant').join(' & ')} — we'll confirm shortly`
          : 'Charged to your room',
      );
      onDone();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Checkout failed. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stay-checkout-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl"
      >
        <h2 id="stay-checkout-title" className="text-lg font-bold">Checkout</h2>

        <div className="mt-3 space-y-3">
          {groups.map(([key, group]) => (
            <div key={key}>
              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {group.title}
              </p>
              <div className="space-y-1.5">
                {group.lines.map((l) => (
                  <div key={l.key} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{l.name}</p>
                      <p className="text-xs text-slate-500">{money(l.price)} each</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => cart.updateQty(l.key, l.quantity - 1)}
                        aria-label={`Remove one ${l.name}`}
                        className="h-7 w-7 rounded-full bg-slate-100 font-bold"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold" aria-live="polite">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => cart.updateQty(l.key, l.quantity + 1)}
                        aria-label={`Add one more ${l.name}`}
                        className="h-7 w-7 rounded-full bg-slate-100 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Deliver to</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                ['room', `Room ${roomLabel}`],
                ['location', 'Somewhere else'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => cart.setFulfillment({ ...cart.fulfillment, mode })}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  cart.fulfillment.mode === mode
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {cart.fulfillment.mode === 'location' && (
            <>
              {eligibleLocations.length > 0 ? (
                <select
                  value={cart.fulfillment.zoneId}
                  onChange={(e) => cart.setFulfillment({ ...cart.fulfillment, zoneId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Choose a location…</option>
                  {eligibleLocations.map((loc) => (
                    <option key={loc._id} value={loc._id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              ) : (
                cart.hasOutletItems && (
                  <p className="text-xs text-amber-700">
                    The restaurant only delivers to your room right now.
                  </p>
                )
              )}
              <input
                value={cart.fulfillment.locationLabel}
                onChange={(e) =>
                  cart.setFulfillment({ ...cart.fulfillment, locationLabel: e.target.value })
                }
                placeholder={cart.fulfillment.zoneId ? 'Detail (e.g. Cabana 3)' : 'e.g. Lobby Table 4'}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </>
          )}
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              When (optional)
            </p>
            <input
              type="datetime-local"
              value={cart.fulfillment.scheduledFor}
              onChange={(e) =>
                cart.setFulfillment({ ...cart.fulfillment, scheduledFor: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Payment</p>
          <button
            type="button"
            onClick={() => setPaying('room')}
            disabled={!canRoom}
            className={`w-full rounded-xl border p-3 text-left ${
              paying === 'room' && canRoom ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
            } ${!canRoom ? 'opacity-50' : ''}`}
          >
            <p className="text-sm font-semibold">Charge to Room Tab</p>
            <p className="text-xs text-slate-500">
              {overCredit
                ? `Over your available credit (${money(availableCredit)} left) — pay online or top up at the front desk.`
                : `Available credit: ${money(availableCredit)}`}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPaying('online')}
            disabled={!canOnline}
            className={`w-full rounded-xl border p-3 text-left ${
              paying === 'online' && canOnline ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
            } ${!canOnline ? 'opacity-50' : ''}`}
          >
            <p className="text-sm font-semibold">Pay Online Now</p>
            <p className="text-xs text-slate-500">
              Card, transfer or USSD via Paystack
              {cart.hasOutletItems ? ' — one payment covers the hotel and the restaurant.' : '.'}
            </p>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">Items</p>
          <p className="text-lg font-bold">{money(cart.subtotal)}</p>
        </div>
        <p className="text-right text-[11px] text-slate-400">
          Hotel service charges, if any, are added at checkout.
          {cart.hasOutletItems ? ' Restaurant items are confirmed by the restaurant.' : ''}
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={
              !online ||
              submitting ||
              cart.lines.length === 0 ||
              (paying === 'room' && !canRoom) ||
              (paying === 'online' && !canOnline)
            }
            className="flex-1 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {!online
              ? 'Offline — reconnect to order'
              : submitting
                ? 'Placing…'
                : paying === 'room'
                  ? 'Charge to room'
                  : 'Continue to pay'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StayCheckoutModal;
