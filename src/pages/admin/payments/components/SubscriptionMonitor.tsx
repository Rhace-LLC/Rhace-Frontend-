import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  billingService,
  type AdminInvoiceRow,
  type SubscriptionSummaryDto,
  type SupportAction,
  type VendorTimelineDto,
} from '@/services/billing.service';

const naira = (n?: number) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
const day = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }) : '—';
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });
};
const ageDays = (v?: string | null) => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000) : null);

const INVOICE_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  void: 'Void',
  draft: 'Draft',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  past_due: 'Past due',
  lapsed: 'Lapsed',
  cancelled: 'Cancelled (runs to end)',
  none: 'None',
};

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const vendorOf = (row: AdminInvoiceRow) =>
  row.vendor && typeof row.vendor === 'object'
    ? { id: row.vendor._id, name: row.vendor.businessName ?? row.vendor.email ?? row.vendor._id }
    : { id: String(row.vendor ?? ''), name: String(row.vendor ?? '—') };

const Tile = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-xl border bg-white p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-bold">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

/**
 * Subscription monitoring for admins and finance (proposal §2.6). There is
 * no confirmation queue: payments confirm through the provider webhook.
 * This shows income beside the percentage take, the forgone-take estimate,
 * invoices and the venues that need attention. Superadmins also get the
 * capped, reasoned support actions on a venue's timeline.
 */
const SubscriptionMonitor = () => {
  const { admin } = useAuth();
  const isSuperadmin = admin?.role === 'superadmin';

  const [months, setMonths] = useState(6);
  const [summary, setSummary] = useState<SubscriptionSummaryDto | null>(null);
  const [invoices, setInvoices] = useState<AdminInvoiceRow[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState('pending_payment');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timelineVendor, setTimelineVendor] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await billingService.adminSummary(months);
      setSummary(res.data);
    } catch {
      toast.error('Unable to load subscription income.');
    }
  }, [months]);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await billingService.adminInvoices({
        status: invoiceStatus || undefined,
        kind: 'invoice',
        page,
        limit: 10,
      });
      setInvoices(res.data);
      setPages(Math.max(1, res.pagination.pages));
      setTotal(res.pagination.total);
    } catch {
      toast.error('Unable to load subscription invoices.');
    }
  }, [invoiceStatus, page]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadSummary(), loadInvoices()]);
    setLoading(false);
  }, [loadSummary, loadInvoices]);

  useEffect(() => {
    void loadSummary().finally(() => setLoading(false));
  }, [loadSummary]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const subscribers = summary
    ? (summary.statuses.active ?? 0) + (summary.statuses.past_due ?? 0) + (summary.statuses.cancelled ?? 0)
    : 0;

  return (
    <div className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
      <div className="p-6 border-b flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">Vendor subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            Subscription fees beside the percentage take. NGN only; payments confirm automatically through the
            provider.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
            aria-label="Period"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {summary && (
        <div className="p-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Platform income"
              value={naira(summary.totals.platformIncome)}
              hint="Subscription fees + percentage take"
            />
            <Tile
              label="Subscription fees"
              value={naira(summary.totals.subscriptionIncome)}
              hint={`${subscribers} subscribed venue${subscribers === 1 ? '' : 's'}`}
            />
            <Tile label="Percentage take" value={naira(summary.totals.percentageTake)} hint="NGN payments, gross share" />
            <Tile
              label="Forgone take (estimate)"
              value={naira(summary.totals.forgoneTakeEstimate)}
              hint={`0% payments × today's ${summary.platformPercentage}% rate`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {(['active', 'past_due', 'cancelled', 'lapsed'] as const).map((s) => (
              <div key={s} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
                <span className="text-muted-foreground">{STATUS_LABEL[s]}</span>
                <span className="font-semibold">{summary.statuses[s] ?? 0}</span>
              </div>
            ))}
          </div>

          {/* Month by month */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-2.5">Month</th>
                  <th className="px-4 py-2.5">Subscription fees</th>
                  <th className="px-4 py-2.5">Percentage take</th>
                  <th className="px-4 py-2.5">0% volume</th>
                  <th className="px-4 py-2.5">Forgone take (est.)</th>
                  <th className="px-4 py-2.5">Net vs. all-percentage</th>
                </tr>
              </thead>
              <tbody>
                {summary.months.map((m) => {
                  const net = m.subscriptionIncome - m.forgoneTakeEstimate;
                  return (
                    <tr key={m.month} className="border-t">
                      <td className="px-4 py-2.5 whitespace-nowrap">{monthLabel(m.month)}</td>
                      <td className="px-4 py-2.5">
                        {naira(m.subscriptionIncome)}
                        {m.invoicesPaid > 0 && (
                          <span className="text-xs text-muted-foreground"> · {m.invoicesPaid} paid</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">{naira(m.percentageTake)}</td>
                      <td className="px-4 py-2.5">
                        {naira(m.subscriptionVolume)}
                        {m.subscriptionPayments > 0 && (
                          <span className="text-xs text-muted-foreground"> · {m.subscriptionPayments}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">{naira(m.forgoneTakeEstimate)}</td>
                      <td className={`px-4 py-2.5 font-medium ${net < 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {net < 0 ? '−' : '+'}
                        {naira(Math.abs(net))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              Net = subscription fees − forgone take. The estimate uses gross share at today&apos;s rate; the pilot
              stop/go review should use the net-of-fee worksheet.
            </p>
          </div>

          {summary.byVertical.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {summary.byVertical.map((v) => (
                <div key={v.vertical} className="rounded-lg border p-4 text-sm">
                  <p className="font-semibold capitalize">{v.vertical}</p>
                  <p className="mt-2 flex justify-between">
                    <span className="text-muted-foreground">Subscription fees</span>
                    {naira(v.subscriptionIncome)}
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Percentage take</span>
                    {naira(v.percentageTake)}
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Forgone (est.)</span>
                    {naira(v.forgoneTakeEstimate)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Attention */}
          {(summary.attention.length > 0 || summary.pendingInvoices.count > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
              <p className="flex items-center gap-2 font-semibold text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                Needs attention
              </p>
              {summary.pendingInvoices.count > 0 && (
                <p className="text-amber-900">
                  {summary.pendingInvoices.count} unpaid invoice{summary.pendingInvoices.count === 1 ? '' : 's'} (
                  {naira(summary.pendingInvoices.amount)} still to pay), oldest {summary.pendingInvoices.oldestAgeDays ?? 0}{' '}
                  days{summary.pendingInvoices.withFailedPayments > 0 &&
                    `; ${summary.pendingInvoices.withFailedPayments} with failed payment attempts`}.
                </p>
              )}
              {summary.attention.map((a) => (
                <button
                  key={a.vendorId}
                  type="button"
                  onClick={() => setTimelineVendor(a.vendorId)}
                  className="flex w-full flex-wrap justify-between gap-2 rounded-md bg-white px-3 py-2 text-left hover:bg-amber-100"
                >
                  <span className="font-medium">{a.businessName || a.vendorId}</span>
                  <span className="text-muted-foreground">
                    {STATUS_LABEL[a.status] ?? a.status} · period ended {day(a.currentPeriodEnd)}
                    {a.graceUntil ? ` · grace to ${day(a.graceUntil)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invoices */}
      <div className="border-t">
        <div className="px-6 pt-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Invoices ({total})</h3>
          <select
            value={invoiceStatus}
            onChange={(e) => {
              setInvoiceStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
            aria-label="Invoice status"
          >
            <option value="pending_payment">Awaiting payment</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
            <option value="">All</option>
          </select>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Venue</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Covers / due</th>
                <th className="px-5 py-3">Age</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                    No invoices in this view.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => {
                const v = vendorOf(inv);
                return (
                  <tr key={inv._id} className="border-t">
                    <td className="px-5 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        className="text-left font-medium hover:underline"
                        onClick={() => setTimelineVendor(v.id)}
                      >
                        {v.name}
                      </button>
                    </td>
                    <td className="px-5 py-3">{inv.planSnapshot?.name ?? '—'}</td>
                    <td className="px-5 py-3">{naira(inv.totalDue)}</td>
                    <td className="px-5 py-3">
                      {INVOICE_LABEL[inv.status] ?? inv.status}
                      {(inv.failedAttempts ?? 0) > 0 && inv.status === 'pending_payment' && (
                        <span className="block text-xs text-red-600">
                          {inv.failedAttempts} failed{inv.lastFailureReason ? ` · ${inv.lastFailureReason}` : ''}
                        </span>
                      )}
                      {(inv.amountReceived ?? 0) > 0 && inv.status === 'pending_payment' && (
                        <span className="block text-xs text-muted-foreground">{naira(inv.amountReceived)} paid so far</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {inv.periodStart ? `${day(inv.periodStart)} – ${day(inv.periodEnd)}` : `due ${day(inv.dueDate)}`}
                    </td>
                    <td className="px-5 py-3">{ageDays(inv.createdAt) ?? '—'}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-muted-foreground">
              {page} / {pages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      <VendorTimelineDialog
        vendorId={timelineVendor}
        canAct={isSuperadmin}
        onClose={() => setTimelineVendor(null)}
        onChanged={() => void refresh()}
      />
    </div>
  );
};

/** One venue's billing ledger plus the capped support actions. */
const VendorTimelineDialog = ({
  vendorId,
  canAct,
  onClose,
  onChanged,
}: {
  vendorId: string | null;
  canAct: boolean;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const [data, setData] = useState<VendorTimelineDto | null>(null);
  const [action, setAction] = useState<SupportAction>('extend');
  const [days, setDays] = useState('7');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vendorId) return;
    try {
      const res = await billingService.adminVendorTimeline(vendorId);
      setData(res.data);
    } catch {
      toast.error('Unable to load this venue’s billing.');
    }
  }, [vendorId]);

  useEffect(() => {
    setData(null);
    setReason('');
    setAction('extend');
    setDays('7');
    void load();
  }, [load]);

  const pendingInvoice = data?.rows.find((r) => r.kind === 'invoice' && r.status === 'pending_payment');
  const billing = data?.vendor.billing;

  const run = async () => {
    if (!vendorId || !reason.trim()) return;
    setBusy(true);
    try {
      await billingService.adminSupportAction(vendorId, {
        action,
        reason: reason.trim(),
        days: action === 'extend' ? Math.min(Math.max(Number(days) || 1, 1), 7) : undefined,
        invoiceId: action === 'activate' ? pendingInvoice?._id : undefined,
      });
      toast.success('Done. The action is recorded in the audit log.');
      setReason('');
      await load();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, 'Action failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!vendorId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.vendor.businessName ?? 'Venue billing'}</DialogTitle>
          <DialogDescription>{data?.vendor.email}</DialogDescription>
        </DialogHeader>

        {!data ? (
          <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <div className="space-y-5 text-sm">
            <div className="grid gap-3 sm:grid-cols-4">
              <Tile label="Model" value={billing?.model === 'subscription' ? 'Subscription' : 'Percentage'} />
              <Tile label="Status" value={STATUS_LABEL[billing?.status ?? 'none'] ?? String(billing?.status)} />
              <Tile label="Paid until" value={day(billing?.currentPeriodEnd)} hint={billing?.graceUntil ? `Grace to ${day(billing.graceUntil)}` : undefined} />
              <Tile label="Credit" value={naira(data.availableCredit)} hint={billing?.autoRenew === false ? 'Auto-renew off' : 'Auto-renew on'} />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-left text-xs">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Received</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Confirmed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r._id} className="border-t align-top">
                      <td className="px-3 py-2">
                        {r.kind === 'credit' ? (
                          <span className="text-emerald-700">Credit</span>
                        ) : (
                          <span className="font-mono text-xs">{r.invoiceNumber}</span>
                        )}
                        {r.cancelReason && <p className="text-xs text-muted-foreground">Cancelled: {r.cancelReason}</p>}
                      </td>
                      <td className="px-3 py-2">{INVOICE_LABEL[r.status] ?? r.status}</td>
                      <td className="px-3 py-2">{naira(r.totalDue)}</td>
                      <td className="px-3 py-2">
                        {r.kind === 'credit' ? `${naira(r.appliedAmount)} used` : naira(r.amountReceived)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.periodStart ? `${day(r.periodStart)} – ${day(r.periodEnd)}` : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {day(r.confirmedAt)}
                        {r.confirmedBy && <p className="text-xs text-muted-foreground">manual</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canAct && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="font-semibold">Support action</p>
                <p className="text-xs text-muted-foreground">
                  For support cases only — payments confirm automatically. Every action needs a reason and is audited.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['extend', 'Extend period'],
                      ['cancel', 'Cancel at period end'],
                      ...(pendingInvoice ? [['activate', `Activate ${pendingInvoice.invoiceNumber}`]] : []),
                    ] as [SupportAction, string][]
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={action === value ? 'default' : 'outline'}
                      onClick={() => setAction(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                {action === 'extend' && (
                  <div className="max-w-[160px]">
                    <Label htmlFor="extend-days">Days (max 7)</Label>
                    <Input
                      id="extend-days"
                      type="number"
                      min={1}
                      max={7}
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    />
                  </div>
                )}
                {action === 'activate' && (
                  <p className="text-xs text-amber-700">
                    Marks the invoice paid without a provider confirmation. Use only when the payment is verified
                    in the provider dashboard.
                  </p>
                )}
                <div>
                  <Label htmlFor="support-reason">Reason</Label>
                  <Textarea
                    id="support-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Ticket #1234 — card declined twice due to bank outage"
                    rows={2}
                  />
                </div>
                <Button size="sm" onClick={() => void run()} disabled={busy || !reason.trim()}>
                  {busy ? 'Working…' : 'Apply'}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionMonitor;
