import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { money } from '@/features/orders/money';
import { stayService, type StayFolio } from '@/services/stay.service';
import { hotelServiceApi, type HotelServiceItemDto } from '@/services/hotelService.service';

interface Props {
  stayId: string | null;
  stayCreditLimit: number;
  guestName: string;
}

/**
 * Phase 3 front-desk folio panel: ledger entries (draft/posted/voided),
 * balance + available credit, void with reason, manual charge, offline
 * payment, room-charge ordering, and settle & close.
 */
export default function FolioPanel({ stayId, stayCreditLimit, guestName }: Props) {
  const [folio, setFolio] = useState<StayFolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HotelServiceItemDto[]>([]);
  const [pickId, setPickId] = useState('');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payLink, setPayLink] = useState<{ url: string; amount: number } | null>(null);

  const load = useCallback(async () => {
    if (!stayId) {
      setFolio(null);
      return;
    }
    try {
      setLoading(true);
      setFolio(await stayService.folioForStay(stayId));
    } catch {
      toast.error('Could not load the folio.');
    } finally {
      setLoading(false);
    }
  }, [stayId]);

  useEffect(() => {
    void load();
    hotelServiceApi.list('amenity').then(setItems).catch(() => null);
  }, [load]);

  if (!stayId) {
    return (
      <p className="type-res-small font-normal text-res-ink-muted">
        Check the room in to open its folio.
      </p>
    );
  }

  const act = async (fn: () => Promise<unknown>, okMsg: string, errMsg: string) => {
    try {
      setBusy(true);
      await fn();
      toast.success(okMsg);
      await load();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message || errMsg;
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const charge = () => {
    const item = items.find((i) => i._id === pickId);
    if (!item) {
      toast.error('Pick a service to charge.');
      return;
    }
    return act(
      () =>
        stayService.staffCheckout(stayId, {
          items: [{ itemType: 'hotel_service', itemId: item._id, quantity: Math.max(1, qty) }],
          fulfillment: { mode: 'room' },
          guestName,
          idempotencyKey: `desk-${stayId}-${Date.now()}`,
        }),
      `Charged to ${guestName}`,
      'Could not post the charge.',
    );
  };

  const folioId = folio?.folio?._id;
  const balance = folio?.totals?.balance ?? 0;

  return (
    <div className="mt-3 space-y-3 rounded-res-md border border-res-line bg-res-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-res-small font-semibold text-res-ink">
          Folio · {guestName} · limit {money(stayCreditLimit)}
        </p>
        {folio?.folio && (
          <span className="type-res-small rounded-full bg-res-card px-2.5 py-1 font-semibold">
            {folio.folio.status} · due {money(balance)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-res-md bg-res-card" />
      ) : !folio?.folio || folio.entries.length === 0 ? (
        <p className="type-res-small font-normal text-res-ink-muted">No folio entries yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {folio.entries.map((e) => (
            <li
              key={e._id}
              className="type-res-small flex flex-wrap items-center justify-between gap-2 rounded-res-sm bg-res-card px-3 py-2"
            >
              <div className="min-w-0">
                <span className="font-semibold">
                  {e.type} · {money(Math.abs(e.amount))}
                </span>{' '}
                <span className="text-res-ink-muted">
                  {e.status}
                  {e.description ? ` · ${e.description}` : ''}
                </span>
              </div>
              {/* Drafts are outlet orders awaiting acceptance: voiding withdraws them. */}
              {(e.status === 'posted' || e.status === 'draft') &&
                (e.type === 'charge' || e.type === 'adjustment') &&
                folioId && (
                <div className="flex items-center gap-1.5">
                  {voidingId === e._id ? (
                    <>
                      <input
                        value={voidReason}
                        onChange={(ev) => setVoidReason(ev.target.value)}
                        placeholder="Reason"
                        className="type-res-small w-32 rounded-full border border-res-line bg-res-surface px-3 py-1.5 outline-none"
                      />
                      <button
                        type="button"
                        disabled={busy || !voidReason.trim()}
                        onClick={() =>
                          act(
                            () => stayService.voidFolioEntry(folioId, e._id, voidReason.trim()),
                            'Entry voided',
                            'Could not void the entry.',
                          ).finally(() => {
                            setVoidingId(null);
                            setVoidReason('');
                          })
                        }
                        className="type-res-small rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVoidingId(e._id)}
                      className="type-res-small rounded-full bg-res-card px-3 py-1.5 font-semibold text-red-600 shadow-res-low"
                    >
                      Void
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {folioId && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              className="type-res-small min-w-40 flex-1 rounded-full border border-res-line bg-res-card px-3 py-2 outline-none"
            >
              <option value="">Charge an amenity…</option>
              {items.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.name} · {money(i.price)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="type-res-small w-16 rounded-full border border-res-line bg-res-card px-3 py-2 outline-none"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void charge()}
              className="type-res-small rounded-full bg-res-brand px-4 py-2 font-semibold text-res-ink-inverted disabled:opacity-50"
            >
              Post charge
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              className="type-res-small w-28 rounded-full border border-res-line bg-res-card px-3 py-2 outline-none"
            />
            <input
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="Manual charge reason"
              className="type-res-small min-w-40 flex-1 rounded-full border border-res-line bg-res-card px-3 py-2 outline-none"
            />
            <button
              type="button"
              disabled={busy || !manualAmount || !manualDesc.trim()}
              onClick={() =>
                act(
                  () =>
                    stayService.manualFolioEntry(folioId, {
                      amount: Number(manualAmount),
                      description: manualDesc.trim(),
                    }),
                  'Manual charge posted',
                  'Could not post the charge.',
                )
              }
              className="type-res-small rounded-full bg-res-card px-4 py-2 font-semibold shadow-res-low disabled:opacity-50"
            >
              Manual charge
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              className="type-res-small w-28 rounded-full border border-res-line bg-res-card px-3 py-2 outline-none"
            />
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="type-res-small rounded-full border border-res-line bg-res-card px-3 py-2 outline-none"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
              <option value="pos">POS</option>
            </select>
            <button
              type="button"
              disabled={busy || !payAmount}
              onClick={() =>
                act(
                  () =>
                    stayService.folioPayment(folioId, {
                      amount: Number(payAmount),
                      method: payMethod,
                    }),
                  'Payment recorded',
                  'Could not record the payment.',
                )
              }
              className="type-res-small rounded-full bg-res-card px-4 py-2 font-semibold shadow-res-low disabled:opacity-50"
            >
              Record payment
            </button>
            <button
              type="button"
              disabled={busy || balance <= 0}
              title="Paystack link the guest can pay from their phone"
              onClick={() =>
                act(
                  async () => {
                    const link = await stayService.folioPayLink(
                      folioId,
                      payAmount ? Number(payAmount) : undefined,
                    );
                    setPayLink({ url: link.authorization_url, amount: link.amount });
                  },
                  'Payment link ready',
                  'Could not create a payment link.',
                )
              }
              className="type-res-small rounded-full bg-res-card px-4 py-2 font-semibold shadow-res-low disabled:opacity-50"
            >
              Payment link
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act(
                  () => stayService.closeFolio(folioId, false),
                  'Folio closed',
                  balance > 0
                    ? `Outstanding ${money(balance)} — settle first or force close.`
                    : 'Could not close the folio.',
                )
              }
              className="type-res-small rounded-full bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              Settle & close
            </button>
          </div>
          {payLink && (
            <div className="type-res-small flex flex-wrap items-center gap-2 rounded-res-sm bg-res-card px-3 py-2">
              <span className="font-semibold">{money(payLink.amount)} link:</span>
              <a
                href={payLink.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-res-brand underline"
              >
                {payLink.url}
              </a>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(payLink.url);
                  toast.success('Link copied');
                }}
                className="rounded-full bg-res-surface px-3 py-1 font-semibold"
              >
                Copy
              </button>
              <span className="w-full text-res-ink-muted">
                The payment lands on this folio automatically once the guest pays.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
