import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { money } from '@/features/orders/money';
import { useVendorEvents } from '@/features/orders/realtime';
import {
  settlementApi,
  type BatchRowDto,
  type OutletRevenueRow,
  type ReconciliationReportDto,
  type SettlementBatchDto,
  type SettlementSide,
} from '@/services/settlement.service';
import { vendorLinkApi, type VendorLinkDto } from '@/services/vendorlink.service';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  disputed: 'bg-red-100 text-red-700',
};

const inputClass = 'rounded-xl border border-slate-200 px-3 py-2 text-sm';
const day = (iso: string) => new Date(iso).toLocaleDateString();
const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

// ─── Batch detail ───────────────────────────────────────────────────────

function BatchDetail({ id, side, onChanged }: { id: string; side: SettlementSide; onChanged: () => void }) {
  const [detail, setDetail] = useState<{ batch: SettlementBatchDto; rows: BatchRowDto[] } | null>(null);
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

  if (!detail) return <div className="h-24 animate-pulse rounded-xl bg-gray-100" />;
  const { batch, rows } = detail;

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
    <div className="space-y-3 rounded-xl bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <p>Food & drink<br /><strong className="text-sm">{money(batch.totals.gross)}</strong></p>
        <p>Hotel commission<br /><strong className="text-sm">−{money(batch.totals.commission)}</strong></p>
        <p>Reversals / adjustments<br /><strong className="text-sm">{money(batch.totals.reversals + batch.totals.adjustments)}</strong></p>
        <p>{side === 'hotel' ? 'You pay' : 'You receive'}<br /><strong className="text-sm">{money(batch.totals.net)}</strong></p>
      </div>

      <div className="max-h-64 overflow-auto rounded-xl bg-white">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-white text-gray-500">
            <tr>
              <th className="px-2 py-1.5">Date</th>
              <th className="px-2 py-1.5">Type</th>
              <th className="px-2 py-1.5">Order</th>
              <th className="px-2 py-1.5 text-right">Food</th>
              <th className="px-2 py-1.5 text-right">Commission</th>
              <th className="px-2 py-1.5 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-slate-100">
                <td className="px-2 py-1.5">{day(r.createdAt)}</td>
                <td className="px-2 py-1.5">{r.type.replace(/_/g, ' ')}</td>
                <td className="px-2 py-1.5">{r.orderRef ? `#${r.orderRef}` : r.note ?? '—'}</td>
                <td className="px-2 py-1.5 text-right">{money(r.gross)}</td>
                <td className="px-2 py-1.5 text-right">{money(r.commission)}</td>
                <td className="px-2 py-1.5 text-right font-semibold">{money(r.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => settlementApi.downloadStatement(batch).catch(() => toast.error('Download failed.'))}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
        >
          Download statement (CSV)
        </button>
        {side === 'hotel' && batch.status === 'draft' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => settlementApi.approve(batch._id), 'Batch approved')}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Approve for payout
          </button>
        )}
      </div>

      {side === 'hotel' && batch.status === 'approved' && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold">Record the payout ({money(batch.totals.net)})</p>
          <p className="text-xs text-gray-500">Pay the outlet by bank transfer or cash, then record it here.</p>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Payout method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
            <input
              aria-label="Payout reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={method === 'bank_transfer' ? 'Transfer reference (required)' : 'Reference (optional)'}
              className={`${inputClass} min-w-0 flex-1`}
            />
            <button
              type="button"
              disabled={busy || (method === 'bank_transfer' && !reference.trim())}
              onClick={() =>
                run(() => settlementApi.markPaid(batch._id, { method, reference: reference.trim() || undefined }), 'Payout recorded')
              }
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Mark paid
            </button>
          </div>
        </div>
      )}
      {batch.status === 'paid' && batch.payout?.paidAt && (
        <p className="text-xs text-green-700">
          Paid {day(batch.payout.paidAt)} by {String(batch.payout.method ?? '').replace('_', ' ')}
          {batch.payout.reference ? ` · ref ${batch.payout.reference}` : ''}
          {batch.payout.recordedByName ? ` · recorded by ${batch.payout.recordedByName}` : ''}
        </p>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500">Conversation</p>
        <ol className="mt-1 space-y-1">
          {batch.comments.map((c, i) => (
            <li key={i} className={`text-xs ${c.kind === 'disputed' ? 'text-red-700' : 'text-gray-700'}`}>
              <span className="text-gray-400">{new Date(c.at).toLocaleString()}</span> · <strong>{c.actorName}</strong>{' '}
              ({c.side}) {c.kind !== 'comment' ? `${c.kind} — ` : ''}
              {c.body}
            </li>
          ))}
        </ol>
        <textarea
          aria-label="Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder={
            side === 'partner' ? 'Ask a question, or explain what is wrong to dispute' : 'Reply, or explain how a dispute was resolved'
          }
          className={`${inputClass} mt-2 w-full`}
        />
        <div className="mt-1 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !comment.trim()}
            onClick={() => run(() => settlementApi.comment(batch._id, comment.trim()), 'Comment added')}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Comment
          </button>
          {side === 'partner' && batch.status !== 'disputed' && (
            <button
              type="button"
              disabled={busy || !comment.trim()}
              onClick={() => run(() => settlementApi.dispute(batch._id, comment.trim()), 'Dispute raised')}
              className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
            >
              Dispute this settlement
            </button>
          )}
          {side === 'hotel' && batch.status === 'disputed' && (
            <button
              type="button"
              disabled={busy || !comment.trim()}
              onClick={() => run(() => settlementApi.resolve(batch._id, comment.trim()), 'Dispute resolved')}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Resolve dispute
            </button>
          )}
        </div>
        {side === 'hotel' && batch.status === 'disputed' && (
          <p className="mt-1 text-[11px] text-gray-500">
            If money must change, add an adjustment below (or void the folio charge) — it lands in the next batch.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────────

function BatchesTab({ side, links }: { side: SettlementSide; links: VendorLinkDto[] }) {
  const [data, setData] = useState<{
    batches: SettlementBatchDto[];
    unbatched: Array<{ vendorLink: string; net: number; rows: number }>;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [adjLink, setAdjLink] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote, setAdjNote] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await settlementApi.batches();
      setData({ batches: res.batches, unbatched: res.unbatched });
    } catch {
      toast.error('Could not load settlements.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useVendorEvents(['settlement:batch', 'settlement:adjustment', 'settlement:reversal'], () => void load());

  const linkName = (id: string) => {
    const l = links.find((x) => x._id === id);
    return l?.outletName || l?.counterpartName || 'Outlet';
  };

  const generate = async () => {
    try {
      const created = await settlementApi.generate();
      toast.success(created.length ? `${created.length} batch(es) created` : 'Nothing to settle yet');
      await load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not create batches.'));
    }
  };

  const adjust = async () => {
    try {
      await settlementApi.adjustment({ linkId: adjLink, amount: Number(adjAmount), note: adjNote.trim() });
      toast.success('Adjustment recorded — it joins the next batch');
      setAdjAmount('');
      setAdjNote('');
      await load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not record the adjustment.'));
    }
  };

  if (!data) return <div className="h-32 animate-pulse rounded-xl bg-gray-100" />;

  return (
    <div className="space-y-4">
      {data.unbatched.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Not yet batched</p>
            {side === 'hotel' && (
              <button type="button" onClick={() => void generate()} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                Settle now
              </button>
            )}
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {data.unbatched.map((u) => (
              <li key={u.vendorLink} className="flex justify-between">
                <span>{linkName(u.vendorLink)} · {u.rows} row(s)</span>
                <strong>{money(u.net)}</strong>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-gray-500">Batches are created nightly per each outlet&apos;s daily/weekly cycle.</p>
        </div>
      )}

      {data.batches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No settlement batches yet. Room-charged outlet orders accrue here once accepted.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.batches.map((b) => (
            <li key={b._id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <button
                type="button"
                onClick={() => setSelected(selected === b._id ? null : b._id)}
                aria-expanded={selected === b._id}
                className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
              >
                <div>
                  <p className="font-semibold">
                    {side === 'hotel' ? b.outletName || b.counterpartName : b.counterpartName} · {money(b.totals.net)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {b.batchNo} · {day(b.periodStart)} – {day(b.periodEnd)} · {b.totals.orders} order(s)
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>{b.status}</span>
              </button>
              {selected === b._id && (
                <div className="mt-3">
                  <BatchDetail id={b._id} side={side} onChanged={() => void load()} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {side === 'hotel' && links.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="font-semibold">Adjustment</p>
          <p className="text-xs text-gray-500">
            Positive = you owe the outlet more; negative = you recover money. It joins that outlet&apos;s next batch.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select aria-label="Outlet" value={adjLink} onChange={(e) => setAdjLink(e.target.value)} className={inputClass}>
              <option value="">Choose outlet…</option>
              {links.map((l) => (
                <option key={l._id} value={l._id}>{l.outletName || l.counterpartName || 'Outlet'}</option>
              ))}
            </select>
            <input aria-label="Adjustment amount" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} inputMode="decimal" placeholder="e.g. -1500" className={inputClass} />
            <input aria-label="Adjustment note" value={adjNote} onChange={(e) => setAdjNote(e.target.value)} placeholder="Why" className={inputClass} />
          </div>
          <button
            type="button"
            disabled={!adjLink || !adjAmount || !adjNote.trim()}
            onClick={() => void adjust()}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Record adjustment
          </button>
        </div>
      )}
    </div>
  );
}

function ReportsTab({ side }: { side: SettlementSide }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<OutletRevenueRow[] | null>(null);
  const [postingDate, setPostingDate] = useState(today);
  const [postings, setPostings] = useState<Awaited<ReturnType<typeof settlementApi.folioPostings>> | null>(null);

  useEffect(() => {
    settlementApi
      .outletRevenue({ from, to: `${to}T23:59:59.999Z` })
      .then((r) => setRows(r.rows))
      .catch(() => toast.error('Could not load the revenue report.'));
  }, [from, to]);

  useEffect(() => {
    if (side !== 'hotel') return;
    settlementApi
      .folioPostings(postingDate)
      .then(setPostings)
      .catch(() => toast.error('Could not load folio postings.'));
  }, [side, postingDate]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{side === 'hotel' ? 'Revenue & commission by outlet' : 'Room-service revenue by hotel'}</p>
          <div className="flex gap-2">
            <input aria-label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            <input aria-label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </div>
        </div>
        {!rows ? (
          <div className="mt-3 h-20 animate-pulse rounded-xl bg-gray-100" />
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No outlet orders in this period.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="py-1.5">{side === 'hotel' ? 'Outlet' : 'Hotel'}</th>
                  <th className="py-1.5 text-right">Orders</th>
                  <th className="py-1.5 text-right">Food & drink</th>
                  <th className="py-1.5 text-right">Commission</th>
                  <th className="py-1.5 text-right">Hotel fees</th>
                  <th className="py-1.5 text-right">Room tab</th>
                  <th className="py-1.5 text-right">Online</th>
                  <th className="py-1.5 text-right">Net to outlet</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.vendorLink} className="border-t border-slate-100">
                    <td className="py-1.5">{side === 'hotel' ? r.outletName || r.counterpartName : r.counterpartName}</td>
                    <td className="py-1.5 text-right">{r.orders}</td>
                    <td className="py-1.5 text-right">{money(r.gross)}</td>
                    <td className="py-1.5 text-right">{money(r.commission)}</td>
                    <td className="py-1.5 text-right">{money(r.hotelFees)}</td>
                    <td className="py-1.5 text-right">{money(r.roomCharged)}</td>
                    <td className="py-1.5 text-right">{money(r.online)}</td>
                    <td className="py-1.5 text-right font-semibold">{money(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {side === 'hotel' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Folio postings</p>
            <input aria-label="Posting date" type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className={inputClass} />
          </div>
          {!postings ? (
            <div className="mt-3 h-16 animate-pulse rounded-xl bg-gray-100" />
          ) : postings.groups.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Nothing posted on this day.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {postings.groups.map((g) => (
                <li key={g.revenueCode} className="flex justify-between">
                  <span className="font-mono text-xs">{g.revenueCode} · {g.count}</span>
                  <strong>{money(g.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ReconciliationTab({ side }: { side: SettlementSide }) {
  const [reports, setReports] = useState<ReconciliationReportDto[] | null>(null);
  const [onlyMismatch, setOnlyMismatch] = useState(false);
  const [runDate, setRunDate] = useState(new Date(Date.now() - 86400000).toISOString().slice(0, 10));

  const load = useCallback(async () => {
    try {
      setReports(await settlementApi.reconciliation({ status: onlyMismatch ? 'mismatch' : undefined }));
    } catch {
      toast.error('Could not load reconciliation reports.');
    }
  }, [onlyMismatch]);

  useEffect(() => {
    void load();
  }, [load]);
  useVendorEvents(['reconciliation:mismatch'], () => void load());

  const run = async () => {
    try {
      const res = await settlementApi.runReconciliation(runDate);
      toast.success(`${res.length} outlet report(s) · ${res.filter((r) => r.status === 'mismatch').length} mismatch(es)`);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not run reconciliation.'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={onlyMismatch} onChange={(e) => setOnlyMismatch(e.target.checked)} />
          Mismatches only
        </label>
        {side === 'hotel' && (
          <>
            <input aria-label="Reconcile date" type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)} className={inputClass} />
            <button type="button" onClick={() => void run()} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
              Re-run day
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Each night, posted room charges, accepted outlet orders and amounts owed to outlets are matched per outlet.
      </p>
      {!reports ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ) : reports.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">No reports yet.</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r._id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {day(r.date)} · {r.outletName || 'Outlet'}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    r.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {r.status === 'ok' ? 'Matched' : `${r.issues.length} issue(s)`}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {r.totals.orders} order(s) · orders {money(r.totals.ordersTotal)} · room charges {money(r.totals.folioPosted)} ·
                owed to outlet {money(r.totals.accruedNet)}
                {r.totals.onlineOrders ? ` · ${r.totals.onlineOrders} paid online` : ''}
              </p>
              {r.issues.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {r.issues.map((i, idx) => (
                    <li key={idx} className="text-xs text-red-700">
                      {i.detail}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Phase 7: hotel ↔ outlet settlements. Hotels see what they owe each outlet
 * (approve, record the offline payout, resolve disputes, adjust); outlets
 * see what they are owed (comment, dispute, download statements).
 */
export default function SettlementsPage() {
  const [side, setSide] = useState<SettlementSide | null>(null);
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [tab, setTab] = useState<'batches' | 'reports' | 'reconciliation'>('batches');

  useEffect(() => {
    settlementApi
      .batches({ status: 'none' })
      .then((r) => setSide(r.side))
      .catch(() => setSide('partner'));
  }, []);

  useEffect(() => {
    if (!side) return;
    (side === 'hotel' ? vendorLinkApi.hotelLinks() : vendorLinkApi.partnerLinks())
      .then((l) => setLinks(l.filter((x) => x.status !== 'revoked' || x.partnerVendor)))
      .catch(() => undefined);
  }, [side]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Settlements"
        subtitle={
          side === 'hotel'
            ? 'What you owe linked outlets for room-charged orders. Pay offline, then record it.'
            : 'What linked hotels owe you for room-charged orders.'
        }
      />
      <div className="flex gap-1.5" role="tablist" aria-label="Settlement views">
        {(
          [
            ['batches', 'Batches'],
            ['reports', 'Reports'],
            ['reconciliation', 'Reconciliation'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {!side ? (
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
      ) : tab === 'batches' ? (
        <BatchesTab side={side} links={links} />
      ) : tab === 'reports' ? (
        <ReportsTab side={side} />
      ) : (
        <ReconciliationTab side={side} />
      )}
    </div>
  );
}
