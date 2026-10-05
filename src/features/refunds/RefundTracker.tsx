import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { money } from '@/features/orders/money';
import { useVendorEvents } from '@/features/orders/realtime';
import {
  refundApi,
  type RefundMethod,
  type RefundSource,
  type RefundTicketDto,
} from '@/services/refund.service';

const SOURCE_LABEL: Record<RefundSource, string> = {
  manual: 'Opened by staff',
  outlet_rejected: 'Restaurant rejected a paid order',
  paid_after_expiry: 'Paid after the order expired',
  folio_credit: 'Room bill in credit',
};

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-700',
};

const TABS = [
  { key: 'open', label: 'To pay' },
  { key: 'completed', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: '', label: 'All' },
] as const;

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

function age(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 48 * 60) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function TicketDetail({
  ticket,
  onChanged,
}: {
  ticket: RefundTicketDto;
  onChanged: (t: RefundTicketDto) => void;
}) {
  const [method, setMethod] = useState<RefundMethod>('cash');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payNote, setPayNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const isOpen = ticket.status === 'open' || ticket.status === 'pending';

  const run = async (fn: () => Promise<RefundTicketDto>, okMsg: string) => {
    try {
      setBusy(true);
      onChanged(await fn());
      toast.success(okMsg);
      setNote('');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not update the ticket.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-3">
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-xs text-gray-500">Pay to</span>
          <br />
          <strong>{ticket.guestName || 'Guest'}</strong>
          {ticket.guestPhone ? ` · ${ticket.guestPhone}` : ''}
          {ticket.guestEmail ? ` · ${ticket.guestEmail}` : ''}
        </p>
        <p>
          <span className="text-xs text-gray-500">Why</span>
          <br />
          {ticket.reason || SOURCE_LABEL[ticket.source]}
        </p>
        {ticket.status === 'completed' && (
          <p className="sm:col-span-2">
            <span className="text-xs text-gray-500">Paid</span>
            <br />
            {money(ticket.amount)} by {String(ticket.method ?? '').replace('_', ' ')}
            {ticket.reference ? ` · ref ${ticket.reference}` : ''}
            {ticket.completedByName ? ` · recorded by ${ticket.completedByName}` : ''}
          </p>
        )}
      </div>

      {isOpen && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold">Record the refund</p>
          <p className="text-xs text-gray-500">
            Pay the guest by cash or bank transfer first, then record it here.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              aria-label="Refund method"
              value={method}
              onChange={(e) => setMethod(e.target.value as RefundMethod)}
              className={inputClass}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
            <input
              aria-label="Transfer reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={method === 'bank_transfer' ? 'Transfer reference (required)' : 'Receipt no. (optional)'}
              className={inputClass}
            />
            <input
              aria-label="Amount paid"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder={`Amount (${money(ticket.amount)})`}
              className={inputClass}
            />
          </div>
          <input
            aria-label="Payout note"
            value={payNote}
            onChange={(e) => setPayNote(e.target.value)}
            placeholder="Note (optional)"
            className={inputClass}
          />
          <button
            type="button"
            disabled={busy || (method === 'bank_transfer' && !reference.trim())}
            onClick={() =>
              run(
                () =>
                  refundApi.complete(ticket._id, {
                    method,
                    reference: reference.trim() || undefined,
                    note: payNote.trim() || undefined,
                    amount: amount ? Number(amount) : undefined,
                  }),
                'Refund recorded',
              )
            }
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Mark refunded
          </button>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500">Activity</p>
        <ol className="mt-1 space-y-1">
          {(ticket.activity ?? []).map((a, i) => (
            <li key={i} className="text-xs text-gray-700">
              <span className="text-gray-400">{new Date(a.at).toLocaleString()}</span> ·{' '}
              <strong>{a.actorName}</strong> {a.action.replace('_', ' ')}
              {a.note ? ` — ${a.note}` : ''}
            </li>
          ))}
        </ol>
        <div className="mt-2 flex gap-2">
          <input
            aria-label="Add a note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (e.g. called the guest)"
            className={inputClass}
          />
          <button
            type="button"
            disabled={busy || !note.trim()}
            onClick={() => run(() => refundApi.note(ticket._id, note.trim()), 'Note added')}
            className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="flex gap-2">
          <input
            aria-label="Cancel reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason to cancel (managers)"
            className={inputClass}
          />
          <button
            type="button"
            disabled={busy || !cancelReason.trim()}
            onClick={() => run(() => refundApi.cancel(ticket._id, cancelReason.trim()), 'Ticket cancelled')}
            className="shrink-0 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
          >
            Cancel ticket
          </button>
        </div>
      )}
    </div>
  );
}

function OpenTicketForm({ initialOrderId, onOpened }: { initialOrderId?: string; onOpened: () => void }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [orderId, setOrderId] = useState(initialOrderId ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    try {
      setBusy(true);
      await refundApi.open({
        amount: Number(amount),
        reason: reason.trim(),
        orderId: orderId.trim() || undefined,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
      });
      toast.success('Refund ticket opened');
      setAmount('');
      setReason('');
      setGuestName('');
      setGuestPhone('');
      setOrderId('');
      onOpened();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not open the ticket.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="font-semibold">Open a refund ticket</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount" className={inputClass} />
        <input aria-label="Order id" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order id (optional)" className={inputClass} />
        <input aria-label="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" className={inputClass} />
        <input aria-label="Guest phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Guest phone" className={inputClass} />
      </div>
      <input aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this refund owed?" className={inputClass} />
      <button
        type="button"
        disabled={busy || !amount || !reason.trim()}
        onClick={() => void submit()}
        className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Open ticket
      </button>
    </div>
  );
}

/**
 * Refund tracker: every refund owed by (or on the stays of) this vendor.
 * Tickets open automatically when money is owed back; staff pay the guest
 * offline (cash / bank transfer) and record it. Live via `refund:*` events.
 */
export function RefundTracker({ compact = false, initialOrderId }: { compact?: boolean; initialOrderId?: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('open');
  const [tickets, setTickets] = useState<RefundTicketDto[]>([]);
  const [openStats, setOpenStats] = useState({ count: 0, amount: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(Boolean(initialOrderId));

  const load = useCallback(async () => {
    try {
      const res = await refundApi.list({ status: tab || undefined, limit: compact ? 10 : 100 });
      setTickets(res.docs ?? []);
      setOpenStats(res.open ?? { count: 0, amount: 0 });
    } catch {
      toast.error('Could not load refund tickets.');
    } finally {
      setLoading(false);
    }
  }, [tab, compact]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useVendorEvents(['refund:opened', 'refund:updated'], (event) => {
    if (event === 'refund:opened') toast.info('A new refund ticket was opened');
    void load();
  });

  const shown = useMemo(() => tickets, [tickets]);

  return (
    <section className={compact ? 'space-y-3 rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5' : 'space-y-4'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={compact ? 'type-res-h3 text-res-ink' : 'text-lg font-bold'}>Refund tickets</p>
          <p className="text-xs text-gray-500">
            {openStats.count
              ? `${openStats.count} to pay · ${money(openStats.amount)} owed to guests`
              : 'Nothing owed to guests right now'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
        >
          {showForm ? 'Close' : 'Open a ticket'}
        </button>
      </div>

      {showForm && (
        <OpenTicketForm
          initialOrderId={initialOrderId}
          onOpened={() => {
            setShowForm(false);
            setTab('open');
            void load();
          }}
        />
      )}

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Refund status">
        {TABS.map((t) => (
          <button
            key={t.key || 'all'}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No tickets here.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((t) => (
            <li key={t._id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <button
                type="button"
                onClick={() => setSelected(selected === t._id ? null : t._id)}
                aria-expanded={selected === t._id}
                className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {t.guestName || 'Guest'} · {money(t.amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t.ticketNo ?? t._id.slice(-6)} · {SOURCE_LABEL[t.source] ?? t.source} · {age(t.createdAt)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[t.status] ?? ''}`}>
                  {t.status === 'pending' ? 'open' : t.status}
                </span>
              </button>
              {selected === t._id && (
                <div className="mt-3">
                  <TicketDetail
                    ticket={t}
                    onChanged={(updated) => {
                      setTickets((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
                      void load();
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
