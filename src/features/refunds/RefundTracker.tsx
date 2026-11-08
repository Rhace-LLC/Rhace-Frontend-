import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { ChevronDown, CircleCheck, HandCoins, Plus, ReceiptText, Wallet } from 'lucide-react';
import {
  EYEBROW,
  FIELD_CLASS,
  FIELD_ON_INSET,
  Field,
  MODAL_CONTENT_CLASS,
  PILL_DANGER,
  PILL_PRIMARY,
  PILL_QUIET,
  SELECT_FIELD_CLASS,
  SegmentedControl,
  StatTile,
  SurfaceCard,
  TEXT_ACTION,
  TonePill,
  type PillTone,
} from '@/components/dashboard/res-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { money } from '@/features/orders/money';
import { useVendorEvents } from '@/features/orders/realtime';
import {
  refundApi,
  type RefundMethod,
  type RefundSource,
  type RefundStatus,
  type RefundTicketDto,
} from '@/services/refund.service';

const SOURCE_LABEL: Record<RefundSource, string> = {
  manual: 'Opened by staff',
  outlet_rejected: 'Restaurant rejected a paid order',
  paid_after_expiry: 'Paid after the order expired',
  folio_credit: 'Room bill in credit',
};

const STATUS: Record<RefundStatus, { label: string; tone: PillTone }> = {
  open: { label: 'To pay', tone: 'attention' },
  pending: { label: 'To pay', tone: 'attention' },
  completed: { label: 'Paid', tone: 'positive' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  failed: { label: 'Failed', tone: 'danger' },
};

const METHOD_LABEL: Record<RefundMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  other: 'Other',
};

const FILTERS = [
  { value: 'open', label: 'To pay' },
  { value: 'completed', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
] as const;
type Filter = (typeof FILTERS)[number]['value'];

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

function age(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 48 * 60) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

const initials = (name?: string) =>
  (name || 'Guest')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

const ACTIVITY_LABEL: Record<string, string> = {
  opened: 'opened the ticket',
  note: 'added a note',
  amount_changed: 'changed the amount',
  completed: 'recorded the refund',
  cancelled: 'cancelled the ticket',
  reopened: 'reopened the ticket',
};

// ─── Ticket detail ─────────────────────────────────────────────────────────

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className={EYEBROW}>{label}</p>
      <div className="type-res-body mt-1 break-words text-res-ink">{children}</div>
    </div>
  );
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
  const [payNote, setPayNote] = useState('');
  const [note, setNote] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const isOpen = ticket.status === 'open' || ticket.status === 'pending';
  const id = ticket._id;

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

  const needsReference = method === 'bank_transfer' && !reference.trim();

  return (
    <div className="space-y-4 rounded-res-md bg-res-surface p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Fact label="Pay to">
          <span className="font-semibold">{ticket.guestName || 'Guest'}</span>
          {(ticket.guestPhone || ticket.guestEmail) && (
            <span className="type-res-small block font-normal text-res-ink-muted">
              {[ticket.guestPhone, ticket.guestEmail].filter(Boolean).join(' · ')}
            </span>
          )}
        </Fact>
        <Fact label="Why">{ticket.reason || SOURCE_LABEL[ticket.source]}</Fact>
        {ticket.status === 'completed' && (
          <Fact label="Paid">
            {money(ticket.amount)} by {METHOD_LABEL[ticket.method ?? 'other'] ?? ticket.method}
            {ticket.reference ? ` · ref ${ticket.reference}` : ''}
            {ticket.completedByName && (
              <span className="type-res-small block font-normal text-res-ink-muted">
                Recorded by {ticket.completedByName}
              </span>
            )}
          </Fact>
        )}
        {ticket.status === 'cancelled' && ticket.cancelledReason && (
          <Fact label="Cancelled because">{ticket.cancelledReason}</Fact>
        )}
      </div>

      {isOpen && (
        <div className="space-y-3 rounded-res-md bg-res-card p-4 shadow-res-low">
          <div>
            <p className="type-res-h3 text-res-ink">Record the refund</p>
            <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
              Pay the guest by cash or bank transfer first, then record it here.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Method" htmlFor={`method-${id}`}>
              <Select value={method} onValueChange={(v) => setMethod(v as RefundMethod)}>
                <SelectTrigger id={`method-${id}`} className={SELECT_FIELD_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-res-md">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={method === 'bank_transfer' ? 'Transfer reference' : 'Receipt no.'}
              htmlFor={`ref-${id}`}
            >
              <Input
                id={`ref-${id}`}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={method === 'bank_transfer' ? 'Required' : 'Optional'}
                className={FIELD_CLASS}
              />
            </Field>
            <Field label="Amount paid" htmlFor={`amount-${id}`}>
              <Input
                id={`amount-${id}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder={money(ticket.amount)}
                className={FIELD_CLASS}
              />
            </Field>
          </div>
          <Field label="Note" htmlFor={`paynote-${id}`}>
            <Input
              id={`paynote-${id}`}
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Optional"
              className={FIELD_CLASS}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-res-caption text-res-ink-muted">
              Leave the amount empty if you paid the full {money(ticket.amount)}.
            </p>
            <button
              type="button"
              disabled={busy || needsReference}
              onClick={() =>
                run(
                  () =>
                    refundApi.complete(id, {
                      method,
                      reference: reference.trim() || undefined,
                      note: payNote.trim() || undefined,
                      amount: amount ? Number(amount) : undefined,
                    }),
                  'Refund recorded'
                )
              }
              className={PILL_PRIMARY}
            >
              <CircleCheck className="size-4" strokeWidth={1.75} aria-hidden />
              Mark refunded
            </button>
          </div>
        </div>
      )}

      <div>
        <p className={EYEBROW}>Activity</p>
        {(ticket.activity ?? []).length > 0 && (
          <ol className="mt-2 space-y-2.5 border-l-2 border-res-line pl-4">
            {(ticket.activity ?? []).map((a, i) => (
              <li key={i} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-res-brand"
                />
                <p className="type-res-small text-res-ink">
                  <span className="font-semibold">{a.actorName}</span>{' '}
                  <span className="font-normal">{ACTIVITY_LABEL[a.action] ?? a.action}</span>
                </p>
                {a.note && (
                  <p className="type-res-small font-normal text-res-ink-muted">{a.note}</p>
                )}
                <p className="type-res-caption text-res-ink-muted">
                  {new Date(a.at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-3 flex gap-2">
          <Input
            aria-label="Add a note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (e.g. called the guest)"
            className={FIELD_ON_INSET}
          />
          <button
            type="button"
            disabled={busy || !note.trim()}
            onClick={() => run(() => refundApi.note(id, note.trim()), 'Note added')}
            className={`${PILL_QUIET} shrink-0 bg-res-card`}
          >
            Add
          </button>
        </div>
      </div>

      {isOpen &&
        (cancelling ? (
          <div className="space-y-2 rounded-res-md bg-red-50/60 p-3">
            <Field label="Reason to cancel" htmlFor={`cancel-${id}`} hint="Managers only.">
              <Input
                id={`cancel-${id}`}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Guest chose a credit on their next stay"
                className={FIELD_ON_INSET}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setCancelling(false)} className={TEXT_ACTION}>
                Keep ticket
              </button>
              <button
                type="button"
                disabled={busy || !cancelReason.trim()}
                onClick={() =>
                  run(() => refundApi.cancel(id, cancelReason.trim()), 'Ticket cancelled')
                }
                className={PILL_DANGER}
              >
                Cancel ticket
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCancelling(true)}
              className={`${TEXT_ACTION} hover:text-red-600`}
            >
              Cancel this ticket…
            </button>
          </div>
        ))}
    </div>
  );
}

// ─── Open a ticket ─────────────────────────────────────────────────────────

function OpenTicketDialog({
  open,
  onOpenChange,
  initialOrderId,
  onOpened,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialOrderId?: string;
  onOpened: () => void;
}) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={MODAL_CONTENT_CLASS}>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="type-res-h3 text-res-ink">Open a refund ticket</DialogTitle>
          <DialogDescription className="type-res-small font-normal text-res-ink-muted">
            Track money owed back to a guest until it has been paid.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" htmlFor="refund-amount">
              <Input
                id="refund-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 12500"
                className={FIELD_CLASS}
              />
            </Field>
            <Field label="Order id" htmlFor="refund-order">
              <Input
                id="refund-order"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Optional"
                className={FIELD_CLASS}
              />
            </Field>
            <Field label="Guest name" htmlFor="refund-guest">
              <Input
                id="refund-guest"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className={FIELD_CLASS}
              />
            </Field>
            <Field label="Guest phone" htmlFor="refund-phone">
              <Input
                id="refund-phone"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                inputMode="tel"
                className={FIELD_CLASS}
              />
            </Field>
          </div>
          <Field label="Why is this refund owed?" htmlFor="refund-reason">
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={`${FIELD_CLASS} h-auto min-h-20 py-3`}
            />
          </Field>
        </div>
        <DialogFooter className="gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={PILL_QUIET}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !amount || !reason.trim()}
            onClick={() => void submit()}
            className={PILL_PRIMARY}
          >
            Open ticket
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tracker ───────────────────────────────────────────────────────────────

/**
 * Refund tracker: every refund owed by (or on the stays of) this vendor.
 * Tickets open automatically when money is owed back; staff pay the guest
 * offline (cash / bank transfer) and record it. Live via `refund:*` events.
 * `compact` is the front-desk card: no summary tiles, shorter list.
 */
export function RefundTracker({
  compact = false,
  initialOrderId,
}: {
  compact?: boolean;
  initialOrderId?: string;
}) {
  const [filter, setFilter] = useState<Filter>('open');
  const [tickets, setTickets] = useState<RefundTicketDto[]>([]);
  const [openStats, setOpenStats] = useState({ count: 0, amount: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(Boolean(initialOrderId));

  const load = useCallback(async () => {
    try {
      const res = await refundApi.list({
        status: filter === 'all' ? undefined : filter,
        limit: compact ? 10 : 100,
      });
      setTickets(res.docs ?? []);
      setOpenStats(res.open ?? { count: 0, amount: 0 });
    } catch {
      toast.error('Could not load refund tickets.');
    } finally {
      setLoading(false);
    }
  }, [filter, compact]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useVendorEvents(['refund:opened', 'refund:updated'], (event) => {
    if (event === 'refund:opened') toast.info('A new refund ticket was opened');
    void load();
  });

  const openButton = (
    <button type="button" onClick={() => setFormOpen(true)} className={PILL_PRIMARY}>
      <Plus className="size-4" strokeWidth={1.75} aria-hidden />
      Open a ticket
    </button>
  );

  const list = loading ? (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-res-md" />
      ))}
    </div>
  ) : tickets.length === 0 ? (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-res-surface text-res-brand">
        <HandCoins className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="type-res-body text-res-ink">
        {filter === 'open' ? 'Nothing owed to guests' : 'No tickets here'}
      </p>
      <p className="type-res-small max-w-xs font-normal text-res-ink-muted">
        {filter === 'open'
          ? 'Tickets open automatically when a guest is owed money back.'
          : 'Try another filter.'}
      </p>
    </div>
  ) : (
    <ul className="divide-y divide-res-line">
      {tickets.map((t) => {
        const expanded = selected === t._id;
        const status = STATUS[t.status] ?? { label: t.status, tone: 'neutral' as const };
        return (
          <li key={t._id} className="py-1.5">
            <button
              type="button"
              onClick={() => setSelected(expanded ? null : t._id)}
              aria-expanded={expanded}
              className="flex w-full cursor-pointer items-center gap-3 rounded-res-md px-2 py-2.5 text-left transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand"
            >
              <span
                aria-hidden
                className="type-res-small flex size-10 shrink-0 items-center justify-center rounded-full bg-res-secondary font-semibold text-res-brand"
              >
                {initials(t.guestName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="type-res-body block truncate font-semibold text-res-ink">
                  {t.guestName || 'Guest'}
                </span>
                <span className="type-res-caption block truncate text-res-ink-muted">
                  {t.ticketNo ?? t._id.slice(-6)} · {SOURCE_LABEL[t.source] ?? t.source} ·{' '}
                  {age(t.createdAt)}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="type-res-body font-semibold text-res-ink tabular-nums">
                  {money(t.amount)}
                </span>
                <TonePill tone={status.tone}>{status.label}</TonePill>
              </span>
              <ChevronDown
                aria-hidden
                strokeWidth={1.75}
                className={`size-4 shrink-0 text-res-ink-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            {expanded && (
              <div className="mt-2 mb-1">
                <TicketDetail
                  ticket={t}
                  onChanged={(updated) => {
                    setTickets((prev) =>
                      prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x))
                    );
                    void load();
                  }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const filterControl = (
    <SegmentedControl label="Refund status" value={filter} onChange={setFilter} options={FILTERS} />
  );

  const dialog = (
    <OpenTicketDialog
      open={formOpen}
      onOpenChange={setFormOpen}
      initialOrderId={initialOrderId}
      onOpened={() => {
        setFormOpen(false);
        setFilter('open');
        void load();
      }}
    />
  );

  if (compact) {
    return (
      <SurfaceCard className="space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-res-h3 text-res-ink">Refund tickets</h2>
            <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
              {openStats.count
                ? `${openStats.count} to pay · ${money(openStats.amount)} owed to guests`
                : 'Nothing owed to guests right now'}
            </p>
          </div>
          {openButton}
        </div>
        {filterControl}
        {list}
        {dialog}
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Tickets to pay"
          value={openStats.count}
          tone={openStats.count ? 'attention' : 'neutral'}
          icon={<ReceiptText className="size-5" strokeWidth={1.75} aria-hidden />}
        />
        <StatTile
          label="Owed to guests"
          value={money(openStats.amount)}
          tone={openStats.amount ? 'attention' : 'neutral'}
          icon={<Wallet className="size-5" strokeWidth={1.75} aria-hidden />}
        />
      </div>

      <SurfaceCard className="space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="type-res-h3 text-res-ink">Refund tickets</h2>
            <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
              Open a ticket to see who to pay and record the refund.
            </p>
          </div>
          {openButton}
        </div>
        {filterControl}
        {list}
      </SurfaceCard>
      {dialog}
    </div>
  );
}
