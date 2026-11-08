import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { CircleCheck, Download, MessageSquare } from 'lucide-react';
import {
  EYEBROW,
  FIELD_CLASS,
  FIELD_ON_INSET,
  Field,
  PILL_DANGER,
  PILL_PRIMARY,
  PILL_QUIET,
  SELECT_FIELD_CLASS,
} from '@/components/dashboard/res-ui';
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
import {
  settlementApi,
  type BatchCommentDto,
  type BatchRowDto,
  type SettlementBatchDto,
  type SettlementSide,
} from '@/services/settlement.service';
import { PAYOUT_METHOD_LABEL, day, errorMessage } from './shared';

const ROW_TYPE: Record<BatchRowDto['type'], string> = {
  due_to_partner: 'Order',
  reversal: 'Reversal',
  adjustment: 'Adjustment',
  settled: 'Settled',
  commission: 'Commission',
};

const COMMENT_KIND: Partial<Record<BatchCommentDto['kind'], string>> = {
  created: 'created the batch',
  approved: 'approved it for payout',
  paid: 'recorded the payout',
  disputed: 'disputed it',
  resolved: 'resolved the dispute',
};

function Total({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-res-sm px-3.5 py-3 ${emphasis ? 'bg-res-secondary' : 'bg-res-card'}`}>
      <p className={EYEBROW}>{label}</p>
      <p
        className={`type-res-h3 mt-1 tabular-nums ${emphasis ? 'text-res-brand' : 'text-res-ink'}`}
      >
        {value}
      </p>
    </div>
  );
}

/** One batch, expanded: totals, line items, payout and the hotel ↔ outlet thread. */
export function BatchDetail({
  id,
  side,
  onChanged,
}: {
  id: string;
  side: SettlementSide;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<{ batch: SettlementBatchDto; rows: BatchRowDto[] } | null>(
    null
  );
  const [comment, setComment] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await settlementApi.batch(id));
    } catch {
      toast.error('Could not load the batch.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!detail) {
    return (
      <div className="space-y-2 rounded-res-md bg-res-surface p-4">
        <Skeleton className="h-16 w-full rounded-res-sm" />
        <Skeleton className="h-32 w-full rounded-res-sm" />
      </div>
    );
  }
  const { batch, rows } = detail;
  const cur = batch.currency || 'NGN';

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      setBusy(true);
      await fn();
      toast.success(okMsg);
      setComment('');
      await load();
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not update the batch.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-res-md bg-res-surface p-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Total label="Food & drink" value={money(batch.totals.gross, cur)} />
        <Total label="Hotel commission" value={`−${money(batch.totals.commission, cur)}`} />
        <Total
          label="Reversals & adjustments"
          value={money(batch.totals.reversals + batch.totals.adjustments, cur)}
        />
        <Total
          label={side === 'hotel' ? 'You pay' : 'You receive'}
          value={money(batch.totals.net, cur)}
          emphasis
        />
      </div>

      <div className="max-h-72 overflow-auto rounded-res-sm bg-res-card">
        <table className="w-full min-w-[560px] text-left">
          <thead className="sticky top-0 bg-res-card">
            <tr className="type-res-caption tracking-wider text-res-ink-muted uppercase">
              <th className="px-3.5 py-2.5 font-normal">Date</th>
              <th className="px-3.5 py-2.5 font-normal">Type</th>
              <th className="px-3.5 py-2.5 font-normal">Order</th>
              <th className="px-3.5 py-2.5 text-right font-normal">Food</th>
              <th className="px-3.5 py-2.5 text-right font-normal">Commission</th>
              <th className="px-3.5 py-2.5 text-right font-normal">Net</th>
            </tr>
          </thead>
          <tbody className="type-res-small divide-y divide-res-line text-res-ink">
            {rows.map((r) => (
              <tr key={r._id}>
                <td className="px-3.5 py-2.5 whitespace-nowrap">{day(r.createdAt)}</td>
                <td className="px-3.5 py-2.5">{ROW_TYPE[r.type] ?? r.type.replace(/_/g, ' ')}</td>
                <td className="px-3.5 py-2.5 text-res-ink-muted">
                  {r.orderRef ? `#${r.orderRef}` : (r.note ?? '—')}
                </td>
                <td className="px-3.5 py-2.5 text-right tabular-nums">{money(r.gross, cur)}</td>
                <td className="px-3.5 py-2.5 text-right tabular-nums">
                  {money(r.commission, cur)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-semibold tabular-nums">
                  {money(r.net, cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            settlementApi.downloadStatement(batch).catch(() => toast.error('Download failed.'))
          }
          className={`${PILL_QUIET} bg-res-card`}
        >
          <Download className="size-4" strokeWidth={1.75} aria-hidden />
          Statement (CSV)
        </button>
        {side === 'hotel' && batch.status === 'draft' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => settlementApi.approve(batch._id), 'Batch approved')}
            className={PILL_PRIMARY}
          >
            Approve for payout
          </button>
        )}
      </div>

      {side === 'hotel' && batch.status === 'approved' && (
        <div className="space-y-3 rounded-res-md bg-res-card p-4 shadow-res-low">
          <div>
            <p className="type-res-h3 text-res-ink">
              Record the payout · {money(batch.totals.net, cur)}
            </p>
            <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
              Pay the outlet by bank transfer or cash, then record it here.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <Field label="Method" htmlFor={`payout-method-${batch._id}`}>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id={`payout-method-${batch._id}`} className={SELECT_FIELD_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-res-md">
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reference" htmlFor={`payout-ref-${batch._id}`}>
              <Input
                id={`payout-ref-${batch._id}`}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  method === 'bank_transfer' ? 'Transfer reference (required)' : 'Optional'
                }
                className={FIELD_CLASS}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy || (method === 'bank_transfer' && !reference.trim())}
              onClick={() =>
                run(
                  () =>
                    settlementApi.markPaid(batch._id, {
                      method,
                      reference: reference.trim() || undefined,
                    }),
                  'Payout recorded'
                )
              }
              className={PILL_PRIMARY}
            >
              Mark paid
            </button>
          </div>
        </div>
      )}

      {batch.status === 'paid' && batch.payout?.paidAt && (
        <p className="type-res-small flex items-start gap-2 rounded-res-sm bg-emerald-50 px-3.5 py-3 text-emerald-800">
          <CircleCheck className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span>
            Paid {day(batch.payout.paidAt)} by{' '}
            {PAYOUT_METHOD_LABEL[batch.payout.method ?? ''] ?? batch.payout.method ?? '—'}
            {batch.payout.reference ? ` · ref ${batch.payout.reference}` : ''}
            {batch.payout.recordedByName ? ` · recorded by ${batch.payout.recordedByName}` : ''}
          </span>
        </p>
      )}

      <div>
        <p className={`${EYEBROW} flex items-center gap-1.5`}>
          <MessageSquare className="size-3.5" strokeWidth={1.75} aria-hidden />
          Conversation
        </p>
        {batch.comments.length > 0 && (
          <ol className="mt-2 space-y-2.5 border-l-2 border-res-line pl-4">
            {batch.comments.map((c, i) => (
              <li key={i} className="relative">
                <span
                  aria-hidden
                  className={`absolute top-1.5 -left-[21px] size-2 rounded-full ${
                    c.kind === 'disputed' ? 'bg-red-500' : 'bg-res-brand'
                  }`}
                />
                <p className="type-res-small text-res-ink">
                  <span className="font-semibold">{c.actorName}</span>{' '}
                  <span className="font-normal text-res-ink-muted">
                    ({c.side}){COMMENT_KIND[c.kind] ? ` ${COMMENT_KIND[c.kind]}` : ''}
                  </span>
                </p>
                {c.body && (
                  <p
                    className={`type-res-small font-normal ${c.kind === 'disputed' ? 'text-red-700' : 'text-res-ink'}`}
                  >
                    {c.body}
                  </p>
                )}
                <p className="type-res-caption text-res-ink-muted">
                  {new Date(c.at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
        <Textarea
          aria-label="Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder={
            side === 'partner'
              ? 'Ask a question, or explain what is wrong to dispute'
              : 'Reply, or explain how a dispute was resolved'
          }
          className={`${FIELD_ON_INSET} mt-3 h-auto min-h-16 py-3`}
        />
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {side === 'partner' && batch.status !== 'disputed' && (
            <button
              type="button"
              disabled={busy || !comment.trim()}
              onClick={() =>
                run(() => settlementApi.dispute(batch._id, comment.trim()), 'Dispute raised')
              }
              className={PILL_DANGER}
            >
              Dispute this settlement
            </button>
          )}
          <button
            type="button"
            disabled={busy || !comment.trim()}
            onClick={() =>
              run(() => settlementApi.comment(batch._id, comment.trim()), 'Comment added')
            }
            className={`${PILL_QUIET} bg-res-card`}
          >
            Comment
          </button>
          {side === 'hotel' && batch.status === 'disputed' && (
            <button
              type="button"
              disabled={busy || !comment.trim()}
              onClick={() =>
                run(() => settlementApi.resolve(batch._id, comment.trim()), 'Dispute resolved')
              }
              className={PILL_PRIMARY}
            >
              Resolve dispute
            </button>
          )}
        </div>
        {side === 'hotel' && batch.status === 'disputed' && (
          <p className="type-res-caption mt-2 text-res-ink-muted">
            If money must change, add an adjustment (or void the folio charge). It lands in the next
            batch.
          </p>
        )}
      </div>
    </div>
  );
}
