import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, Clock, Info, Lock, RefreshCcw, ReceiptText } from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  billingService,
  type BillingInvoiceDto,
  type BillingStatusDto,
  type SubscriptionPlanDto,
} from '@/services/billing.service';

/**
 * Billing & plan (shared by the hotel, restaurant and club sidebars).
 *
 * The vendor chooses how the platform earns from them: the per-transaction
 * percentage (default) or a monthly subscription that keeps 100% of each NGN
 * payment minus the processing fee. Every subscription payment is an
 * ordinary checkout that activates automatically once the provider confirms
 * it. Only the venue account can subscribe, pay or cancel; staff see a
 * read-only view.
 */

const naira = (value?: number) =>
  `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

const day = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Lagos',
      })
    : '—';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local-card estimate used only when a venue has no fee history: 1.5% + ₦100, capped at ₦2,000 per payment. */
const FALLBACK_FEE_RATE = 0.015;

const INVOICE_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  void: 'Void',
  draft: 'Draft',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  past_due: 'Payment overdue',
  lapsed: 'Ended',
  cancelled: 'Ends at period end',
  none: 'Not subscribed',
};

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

/** Where the provider sends the vendor after checkout. */
const returnUrl = (invoiceId: string) => {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('invoice', invoiceId);
  return url.toString();
};

const Section = ({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) => (
  <section className="rounded-res-lg border border-res-line bg-res-card shadow-res-low p-5 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h2 className="font-semibold text-lg text-res-ink">{title}</h2>
      {aside}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

const DetailCell = ({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) => (
  <div className="rounded-xl bg-res-surface p-4">
    <p className="text-xs text-res-ink-muted">{label}</p>
    <p className="mt-1 font-semibold text-res-ink">{value}</p>
    {hint && <p className="mt-1 text-xs text-res-ink-muted">{hint}</p>}
  </div>
);

const BillingPage = () => {
  const [status, setStatus] = useState<BillingStatusDto | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [volumeInput, setVolumeInput] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    const [s, p] = await Promise.all([billingService.mySubscription(), billingService.listPlans()]);
    setStatus(s.data);
    setPlans(p.data);
    setSelectedPlan((prev) => prev ?? p.data[0]?._id ?? null);
    setVolumeInput((prev) => (prev !== '' ? prev : s.data.preview.avgMonthlyVolume > 0 ? String(Math.round(s.data.preview.avgMonthlyVolume)) : ''));
    return s.data;
  }, []);

  useEffect(() => {
    const returnedInvoice = new URLSearchParams(window.location.search).get('invoice');
    let attempts = 0;

    // After checkout the webhook usually lands within seconds; poll briefly
    // until the invoice shows as paid, then tidy the URL.
    const poll = async () => {
      try {
        const data = await fetchAll();
        setLoadError(false);
        if (!returnedInvoice) return;
        // A new subscription returns as `invoice=new` (its id isn't known
        // when checkout starts): done once the venue is subscribed.
        const done =
          returnedInvoice === 'new'
            ? data.subscribedCurrent
            : data.invoices.find((i) => i.id === returnedInvoice)?.status === 'paid';
        if (done) {
          toast.success('Payment confirmed — your subscription is active.');
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
        attempts += 1;
        if (attempts < 6) {
          pollRef.current = setTimeout(() => void poll(), 5000);
        } else {
          toast.info('Still confirming your payment. This page will show it once the provider confirms.');
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    if (returnedInvoice) toast.info('Confirming your payment…');
    void poll();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [fetchAll]);

  const billing = status?.billing ?? null;
  const subscribed = status?.subscribedCurrent ?? false;
  const canManage = status?.canManage ?? false;
  const plan = plans.find((p) => p._id === selectedPlan) ?? null;
  const pending = useMemo(
    () => (status?.invoices ?? []).filter((i) => i.status === 'pending_payment'),
    [status?.invoices]
  );

  // Re-subscribe cooldown after a cancelled or ended subscription.
  const cooldownUntil = useMemo(() => {
    // Mirrors the server rule: counted from the last paid period's end.
    if (subscribed || !billing?.currentPeriodEnd) return null;
    const days = plan?.cooldownDays ?? 60;
    const until = new Date(new Date(billing.currentPeriodEnd).getTime() + days * DAY_MS);
    return until.getTime() > Date.now() ? until : null;
  }, [subscribed, billing, plan?.cooldownDays]);

  /**
   * Honest comparison (proposal Appendix A): today the vendor pays p × volume;
   * on a subscription they pay the plan price plus the processing fees they
   * now bear. Never the plan price alone.
   */
  const comparison = useMemo(() => {
    if (!status || !plan) return null;
    const volume = Number(volumeInput);
    if (!Number.isFinite(volume) || volume <= 0) return null;
    const p = status.preview.platformPercentage / 100;
    const history = status.preview.avgMonthlyVolume > 0;
    const feeRate = history ? status.preview.avgMonthlyFees / status.preview.avgMonthlyVolume : FALLBACK_FEE_RATE;
    const percentageCost = volume * p;
    const fees = volume * feeRate;
    const subscriptionCost = plan.amount + fees;
    const breakEven = p - feeRate > 0 ? plan.amount / (p - feeRate) : null;
    return { volume, percentageCost, fees, feeRate, subscriptionCost, breakEven, history, saving: percentageCost - subscriptionCost };
  }, [status, plan, volumeInput]);

  const subscribe = async () => {
    if (!plan) return;
    setWorking('subscribe');
    try {
      const res = await billingService.subscribe(plan._id, returnUrl('new'));
      if (!res.data.checkoutUrl) {
        // Credit covered the whole first invoice: already active.
        toast.success('Your subscription is active, paid from your credit balance.');
        setWorking(null);
        await fetchAll();
        return;
      }
      toast.success(`Invoice ${res.data.invoiceNumber} created. Opening checkout…`);
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start your subscription. Please try again.'));
      setWorking(null);
    }
  };

  const payPending = async (invoice: BillingInvoiceDto) => {
    setWorking(invoice.id);
    try {
      const res = await billingService.payInvoice(invoice.id, returnUrl(invoice.id));
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start payment. Please try again.'));
      setWorking(null);
    }
  };

  const confirmInvoice = async (invoice: BillingInvoiceDto) => {
    setWorking(invoice.id);
    try {
      const res = await billingService.confirmInvoice(invoice.id);
      if (res.data.paid) {
        toast.success('Payment confirmed — your subscription is active.');
        await fetchAll();
      } else {
        toast.info('Payment not yet confirmed by Paystack. You can pay now or check again later.');
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Could not check the payment status. Please try again.'));
    } finally {
      setWorking(null);
    }
  };

  const cancel = async () => {
    setWorking('cancel');
    try {
      await billingService.cancel(cancelReason.trim() || undefined);
      toast.success(`Subscription cancelled. It stays active until ${day(billing?.currentPeriodEnd)}.`);
      setCancelOpen(false);
      setCancelReason('');
      await fetchAll();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not cancel. Please try again.'));
    } finally {
      setWorking(null);
    }
  };

  const header = (
    <DashboardPageHeader
      title="Billing & plan"
      subtitle="Choose how the platform earns from your sales: a percentage of each payment, or a flat monthly fee."
    />
  );

  if (loading) {
    return (
      <div className="md:p-6 py-2 mb-14 space-y-5">
        {header}
        <div className="rounded-res-lg border border-res-line bg-res-card p-6 animate-pulse h-40" />
        <div className="rounded-res-lg border border-res-line bg-res-card p-6 animate-pulse h-64" />
      </div>
    );
  }

  if (!status || loadError) {
    return (
      <div className="md:p-6 py-2 mb-14 space-y-5">
        {header}
        <div className="rounded-res-lg border border-res-line bg-res-card p-6 text-sm text-res-ink-muted">
          Could not load your billing details. Refresh the page to try again.
        </div>
      </div>
    );
  }

  const onSubscription = billing?.model === 'subscription' && subscribed;
  const inGrace =
    onSubscription &&
    !!billing?.graceUntil &&
    (!billing.currentPeriodEnd || new Date(billing.currentPeriodEnd).getTime() <= Date.now());
  const renewing = onSubscription && billing?.autoRenew !== false && billing?.status !== 'cancelled';
  const showSubscribe = !subscribed && pending.length === 0;

  return (
    <div className="md:p-6 py-2 mb-14 space-y-5">
      {header}

      {!canManage && (
        <div className="flex items-start gap-3 rounded-xl border border-res-line bg-res-surface p-4 text-sm text-res-ink-muted">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          You can view billing, but only the venue owner account can subscribe, pay or cancel.
        </div>
      )}

      {/* Current plan */}
      <Section
        title="Current plan"
        aside={
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              onSubscription
                ? inGrace
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {onSubscription
              ? inGrace
                ? 'Grace period'
                : STATUS_LABEL[billing?.status ?? 'active'] ?? 'Active'
              : 'Pay per transaction'}
          </span>
        }
      >
        {onSubscription ? (
          <>
            <p className="text-sm text-res-ink">
              You keep <strong>100% of each NGN payment</strong>, minus the card or transfer processing fee.
              Payments in other currencies use the standard platform rate.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailCell label="Paid until" value={day(billing?.currentPeriodEnd)} />
              {inGrace && (
                <DetailCell
                  label="Grace ends"
                  value={day(billing?.graceUntil)}
                  hint="Pay the open invoice before this date to keep 0%."
                />
              )}
              {status.commitmentEnd && (
                <DetailCell
                  label="Minimum term ends"
                  value={day(status.commitmentEnd)}
                  hint="The first term is prepaid and not refundable."
                />
              )}
              <DetailCell
                label="Renewal"
                value={renewing ? 'Renews monthly' : 'Will not renew'}
                hint={
                  renewing
                    ? 'An invoice is issued 7 days before the period ends.'
                    : `Back to the platform percentage after ${day(billing?.currentPeriodEnd)}.`
                }
              />
            </div>
            {canManage && renewing && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="mt-4 text-sm font-semibold text-red-600 hover:underline underline-offset-2"
              >
                Cancel subscription
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-res-ink">
              The platform keeps <strong>{status.preview.platformPercentage}%</strong> of each payment you receive.
              Processing fees are not taken from your share.
            </p>
            {billing?.status === 'lapsed' && (
              <p className="mt-2 text-sm text-amber-700">
                Your subscription ended on {day(billing.currentPeriodEnd)} because the renewal was not paid.
              </p>
            )}
          </>
        )}
      </Section>

      {/* Open invoices */}
      {pending.length > 0 && (
        <Section title="Invoices awaiting payment">
          <div className="space-y-3">
            {pending.map((inv) => {
              const stillToPay = inv.payable;
              const paidSoFar = inv.amountReceived || 0;
              return (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-res-line p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-res-ink">
                      {inv.planName ?? 'Subscription'} · {inv.monthsCovered} month{inv.monthsCovered === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-res-ink-muted mt-1">
                      <span className="font-mono">{inv.invoiceNumber}</span> · Total {naira(inv.totalDue)}
                      {inv.creditApplied > 0 && ` · Credit applied ${naira(inv.creditApplied)}`}
                      {paidSoFar > 0 && ` · Paid ${naira(paidSoFar)}`} · Due {day(inv.dueDate)}
                    </p>
                    {inv.failedAttempts > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Last payment attempt failed{inv.lastFailureReason ? `: ${inv.lastFailureReason}` : ''}. You can
                        try again.
                      </p>
                    )}
                  </div>
                  {canManage ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={working === inv.id}
                        onClick={() => void payPending(inv)}
                        className="rounded-full bg-res-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {working === inv.id ? 'Opening checkout…' : `Pay ${naira(stillToPay)} now`}
                      </button>
                      <button
                        type="button"
                        disabled={working === inv.id}
                        onClick={() => void confirmInvoice(inv)}
                        className="rounded-full border border-res-line px-4 py-2.5 text-sm font-semibold text-res-ink disabled:opacity-60 hover:bg-res-surface"
                      >
                        {working === inv.id ? 'Checking…' : 'Check status'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-res-ink-muted">Still to pay {naira(stillToPay)}</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-res-ink-muted">
            Payments go through the usual checkout and activate automatically once confirmed, usually within a minute.
          </p>
        </Section>
      )}

      {/* Subscribe */}
      {showSubscribe && (
        <Section title="Monthly subscription">
          {!status.eligible ? (
            <div className="flex items-start gap-3 rounded-xl bg-res-surface p-4 text-sm text-res-ink-muted">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              Subscriptions are not open to your venue yet. You stay on the platform percentage, and nothing changes
              until you choose otherwise.
            </div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-res-ink-muted">No subscription plans are available for your venue yet.</p>
          ) : (
            <>
              <p className="text-sm text-res-ink">
                Pay a flat monthly fee and keep <strong>100% of each NGN payment, minus the processing fee</strong>.
                The processing fee moves to your side, so the comparison below includes it.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {plans.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setSelectedPlan(p._id)}
                    className={`text-left rounded-xl border p-4 transition-colors ${
                      selectedPlan === p._id
                        ? 'border-res-brand ring-2 ring-res-brand/20'
                        : 'border-res-line hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-res-ink">{p.name}</p>
                    <p className="mt-1 text-2xl font-bold text-res-ink">
                      {naira(p.amount)}
                      <span className="text-sm font-normal text-res-ink-muted"> / month</span>
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-res-ink-muted">
                      <li>
                        First {p.minTermMonths} months paid upfront: {naira(p.amount * p.minTermMonths)}
                      </li>
                      <li>Then monthly, cancel any time before renewal</li>
                      <li>
                        {p.graceDays}-day grace on a late renewal · {p.cooldownDays}-day wait to rejoin after leaving
                      </li>
                    </ul>
                  </button>
                ))}
              </div>

              {/* Comparison */}
              <div className="mt-5 rounded-xl border border-res-line p-4">
                <p className="font-semibold text-res-ink">Compare your monthly cost</p>
                <p className="text-xs text-res-ink-muted mt-1">
                  {status.preview.paymentCount > 0
                    ? `Pre-filled with your average over the last ${status.preview.windowDays} days. Change it to try other amounts.`
                    : 'Enter your expected monthly sales in naira.'}
                </p>
                <label className="mt-3 block text-xs text-res-ink-muted" htmlFor="billing-volume">
                  Monthly NGN sales
                </label>
                <input
                  id="billing-volume"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={volumeInput}
                  onChange={(e) => setVolumeInput(e.target.value)}
                  placeholder="e.g. 500000"
                  className="mt-1 w-full max-w-xs rounded-lg border border-res-line px-3 py-2 text-sm"
                />
                {comparison && plan && (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <DetailCell
                        label={`Percentage (${status.preview.platformPercentage}%)`}
                        value={naira(comparison.percentageCost)}
                        hint="Platform share of your sales. Processing fees are not taken from your share."
                      />
                      <DetailCell
                        label={`Subscription (${plan.name})`}
                        value={naira(comparison.subscriptionCost)}
                        hint={`${naira(plan.amount)} fee + about ${naira(comparison.fees)} processing fees (${(comparison.feeRate * 100).toFixed(2)}%${comparison.history ? ', from your own payments' : ', local-card estimate'}).`}
                      />
                    </div>
                    <p
                      className={`mt-3 text-sm font-medium ${
                        comparison.saving > 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {comparison.saving > 0
                        ? `The subscription would cost about ${naira(comparison.saving)} less per month at this level.`
                        : `The percentage would cost about ${naira(-comparison.saving)} less per month at this level.`}
                      {comparison.breakEven !== null &&
                        ` The two cost the same at about ${naira(comparison.breakEven)} in monthly sales.`}
                    </p>
                    <p className="mt-2 text-xs text-res-ink-muted">
                      International cards cost more to process, and fees vary with your mix of cards and transfers. In a
                      cart with other venues, your share always uses your own plan.
                    </p>
                  </>
                )}
              </div>

              {cooldownUntil ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl bg-res-surface p-4 text-sm text-res-ink-muted">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                  You can subscribe again from {day(cooldownUntil.toISOString())}.
                </div>
              ) : canManage && plan ? (
                <div className="mt-5 space-y-4">
                  <label className="flex items-start gap-3 text-sm text-res-ink cursor-pointer">
                    <Checkbox
                      checked={accepted}
                      onCheckedChange={(v) => setAccepted(v === true)}
                      className="mt-0.5"
                    />
                    <span>
                      I agree to the subscription terms (version {status.termsVersion}): the first{' '}
                      {plan.minTermMonths} months ({naira(plan.amount * plan.minTermMonths)}) are paid upfront and are{' '}
                      <strong>not refundable</strong> if I leave early; renewals are monthly at {naira(plan.amount)}, and
                      any price change is announced at least 30 days ahead; processing fees on my payments are deducted from my
                      share; if a renewal goes unpaid, I move back to the platform percentage after any grace period.
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!accepted || working === 'subscribe'}
                    onClick={() => void subscribe()}
                    className="rounded-full bg-res-brand px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {working === 'subscribe'
                      ? 'Opening checkout…'
                      : `Subscribe and pay ${naira(plan.amount * plan.minTermMonths)}`}
                  </button>
                  {status.availableCredit > 0 && (
                    <p className="text-xs text-res-ink-muted">
                      Your credit of {naira(status.availableCredit)} is applied automatically at checkout.
                    </p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </Section>
      )}

      {/* History */}
      <Section
        title="Billing history"
        aside={
          status.availableCredit > 0 ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Credit {naira(status.availableCredit)}
            </span>
          ) : undefined
        }
      >
        {status.invoices.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-res-ink-muted">
            <ReceiptText className="h-5 w-5" />
            <span>No invoices yet. Your subscription invoices will show up here.</span>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 md:mx-0">
            <table className="min-w-full text-sm">
              <thead className="bg-res-surface text-left text-xs text-res-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Invoice</th>
                  <th className="px-4 py-2.5 font-medium">Plan</th>
                  <th className="px-4 py-2.5 font-medium">Covers</th>
                  <th className="px-4 py-2.5 font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium">Paid</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {status.invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-res-line">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{inv.planName ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {inv.periodStart ? `${day(inv.periodStart)} – ${day(inv.periodEnd)}` : `${inv.monthsCovered} mo`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{naira(inv.totalDue)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {inv.status === 'paid'
                        ? `${naira(inv.amountReceived + (inv.creditApplied || 0))} · ${day(inv.confirmedAt)}`
                        : inv.amountReceived > 0
                          ? `${naira(inv.amountReceived)} so far`
                          : '—'}
                      {inv.lagCreditDays > 0 && (
                        <span className="block text-xs text-emerald-700">+{inv.lagCreditDays} days for our delay</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : inv.status === 'pending_payment'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {inv.status === 'paid' && <CheckCircle2 className="h-3 w-3" />}
                        {INVOICE_LABEL[inv.status] ?? inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {status.availableCredit > 0 && (
          <p className="mt-3 text-xs text-res-ink-muted">
            Credit comes from overpayments and is applied automatically to your next invoice.
          </p>
        )}
      </Section>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Your subscription stays active until <strong>{day(billing?.currentPeriodEnd)}</strong> and will not
                  renew. There are no refunds for the time already paid.
                </p>
                <p>
                  After that date the platform percentage applies again. You can subscribe again after the waiting
                  period ({plan?.cooldownDays ?? 60} days).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Why are you leaving? (optional)"
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working === 'cancel'}>Keep subscription</AlertDialogCancel>
            <button
              type="button"
              disabled={working === 'cancel'}
              onClick={() => void cancel()}
              className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {working === 'cancel' ? 'Cancelling…' : 'Cancel subscription'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingPage;
