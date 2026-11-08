import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ChevronDown, Landmark, Plus, Store } from 'lucide-react';
import {
  FIELD_CLASS,
  Field,
  MODAL_CONTENT_CLASS,
  PILL_PRIMARY,
  PILL_QUIET,
  SELECT_FIELD_CLASS,
  SegmentedControl,
  SurfaceCard,
  TonePill,
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
import { money } from '@/features/orders/money';
import {
  settlementApi,
  type BatchStatus,
  type SettlementSide,
} from '@/services/settlement.service';
import type { VendorLinkDto } from '@/services/vendorlink.service';
import { BatchDetail } from './BatchDetail';
import { BATCH_STATUS, CARD_PAD, day, errorMessage, type BatchesData } from './shared';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'paid', label: 'Paid' },
] as const;
type Filter = (typeof FILTERS)[number]['value'];

const OPEN: BatchStatus[] = ['draft', 'approved'];

function AdjustmentDialog({
  open,
  onOpenChange,
  links,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: VendorLinkDto[];
  onSaved: () => void;
}) {
  const [linkId, setLinkId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    try {
      setBusy(true);
      await settlementApi.adjustment({ linkId, amount: Number(amount), note: note.trim() });
      toast.success('Adjustment recorded. It joins the next batch.');
      setAmount('');
      setNote('');
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not record the adjustment.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={MODAL_CONTENT_CLASS}>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="type-res-h3 text-res-ink">Add an adjustment</DialogTitle>
          <DialogDescription className="type-res-small font-normal text-res-ink-muted">
            It joins that outlet&apos;s next batch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Outlet" htmlFor="adj-outlet">
            <Select value={linkId} onValueChange={setLinkId}>
              <SelectTrigger id="adj-outlet" className={SELECT_FIELD_CLASS}>
                <SelectValue placeholder="Choose outlet" />
              </SelectTrigger>
              <SelectContent className="rounded-res-md">
                {links.map((l) => (
                  <SelectItem key={l._id} value={l._id}>
                    {l.outletName || l.counterpartName || 'Outlet'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Amount"
            htmlFor="adj-amount"
            hint="Positive: you owe the outlet more. Negative: you recover money."
          >
            <Input
              id="adj-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. -1500"
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Why" htmlFor="adj-note">
            <Input
              id="adj-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Wrong price on order #1042"
              className={FIELD_CLASS}
            />
          </Field>
        </div>
        <DialogFooter className="gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={PILL_QUIET}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !linkId || !amount || Number.isNaN(Number(amount)) || !note.trim()}
            onClick={() => void save()}
            className={PILL_PRIMARY}
          >
            Record adjustment
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Unbatched amounts, the batch list (expandable), and hotel-side adjustments. */
export function BatchesView({
  side,
  links,
  data,
  reload,
}: {
  side: SettlementSide;
  links: VendorLinkDto[];
  data: BatchesData;
  reload: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const linkName = (id: string) => {
    const l = links.find((x) => x._id === id);
    return l?.outletName || l?.counterpartName || 'Outlet';
  };

  const shown = useMemo(
    () =>
      data.batches.filter((b) =>
        filter === 'all' ? true : filter === 'open' ? OPEN.includes(b.status) : b.status === filter
      ),
    [data.batches, filter]
  );

  const generate = async () => {
    try {
      setGenerating(true);
      const created = await settlementApi.generate();
      toast.success(
        created.length ? `${created.length} batch(es) created` : 'Nothing to settle yet'
      );
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not create batches.'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      {data.unbatched.length > 0 && (
        <SurfaceCard className={CARD_PAD}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="type-res-h3 text-res-ink">Not yet batched</h2>
              <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
                Batches are created nightly on each outlet&apos;s daily or weekly cycle.
              </p>
            </div>
            {side === 'hotel' && (
              <button
                type="button"
                disabled={generating}
                onClick={() => void generate()}
                className={PILL_PRIMARY}
              >
                Settle now
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {data.unbatched.map((u) => (
              <li
                key={u.vendorLink}
                className="flex items-center gap-3 rounded-res-md bg-res-surface px-4 py-3"
              >
                <Store
                  className="size-4 shrink-0 text-res-ink-muted"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="type-res-body block truncate text-res-ink">
                    {linkName(u.vendorLink)}
                  </span>
                  <span className="type-res-caption text-res-ink-muted">
                    {u.rows} item{u.rows === 1 ? '' : 's'} waiting
                  </span>
                </span>
                <span className="type-res-body font-semibold text-res-ink tabular-nums">
                  {money(u.net)}
                </span>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      )}

      <SurfaceCard className={CARD_PAD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-res-h3 text-res-ink">Settlement batches</h2>
            <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
              {side === 'hotel'
                ? 'Approve each batch, pay the outlet offline, then record the payout.'
                : 'Check each batch. Comment or dispute if something is wrong.'}
            </p>
          </div>
          {side === 'hotel' && links.length > 0 && (
            <button type="button" onClick={() => setAdjustOpen(true)} className={PILL_QUIET}>
              <Plus className="size-4" strokeWidth={1.75} aria-hidden />
              Add adjustment
            </button>
          )}
        </div>

        {data.batches.length > 0 && (
          <SegmentedControl
            label="Batch status"
            value={filter}
            onChange={setFilter}
            options={FILTERS}
          />
        )}

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-res-surface text-res-brand">
              <Landmark className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="type-res-body text-res-ink">
              {data.batches.length ? 'No batches with this status' : 'No settlement batches yet'}
            </p>
            <p className="type-res-small max-w-xs font-normal text-res-ink-muted">
              {data.batches.length
                ? 'Try another filter.'
                : 'Room-charged outlet orders build up here once accepted.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-res-line">
            {shown.map((b) => {
              const expanded = selected === b._id;
              const status = BATCH_STATUS[b.status];
              const name =
                (side === 'hotel' ? b.outletName || b.counterpartName : b.counterpartName) ||
                'Outlet';
              return (
                <li key={b._id} className="py-1.5">
                  <button
                    type="button"
                    onClick={() => setSelected(expanded ? null : b._id)}
                    aria-expanded={expanded}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-res-md px-2 py-2.5 text-left transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand"
                  >
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-res-secondary text-res-brand"
                    >
                      <Store className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="type-res-body block truncate font-semibold text-res-ink">
                        {name}
                      </span>
                      <span className="type-res-caption block truncate text-res-ink-muted">
                        {b.batchNo} · {day(b.periodStart)} – {day(b.periodEnd)} · {b.totals.orders}{' '}
                        order{b.totals.orders === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="type-res-body font-semibold text-res-ink tabular-nums">
                        {money(b.totals.net, b.currency || 'NGN')}
                      </span>
                      <TonePill tone={status?.tone ?? 'neutral'}>
                        {status?.label ?? b.status}
                      </TonePill>
                    </span>
                    <ChevronDown
                      aria-hidden
                      strokeWidth={1.75}
                      className={`size-4 shrink-0 text-res-ink-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {expanded && (
                    <div className="mt-2 mb-1">
                      <BatchDetail id={b._id} side={side} onChanged={() => void reload()} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SurfaceCard>

      {side === 'hotel' && (
        <AdjustmentDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          links={links}
          onSaved={() => {
            setAdjustOpen(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}
