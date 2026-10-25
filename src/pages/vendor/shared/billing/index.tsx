import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, ChevronDown, Clock, Eye, Loader2, ReceiptText } from 'lucide-react';
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
 * Billing (shared by the hotel, restaurant and club sidebars): which plan the
 * venue is on, anything due, plan options when they can switch, and invoices.
 * Only the venue account can subscribe, pay or cancel; staff get a view-only page.
 */

const naira = (value?: number) => `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const day = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
    : '—';

const DAY_MS = 24 * 60 * 60 * 1000;

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

/** Where the provider sends the vendor after checkout. */
const returnUrl = (invoiceId: string) => {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('invoice', invoiceId);
  return url.toString();
};

const INVOICE_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700' },
  pending_payment: { label: 'Due', className: 'bg-amber-50 text-amber-700' },
  void: { label: 'Void', className: 'bg-res-surface text-res-ink-muted' },
  draft: { label: 'Draft', className: 'bg-res-surface text-res-ink-muted' },
};

// ─── Building blocks ────────────────────────────────────────────────────

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-res-lg bg-res-card p-5 shadow-res-low md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="type-res-h3 text-res-ink">{title}</h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-res-md bg-white/10 px-4 py-3">
      <p className="type-res-caption text-white/70">{label}</p>
      <p className="type-res-body mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  busy,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="type-res-small inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

const BillingPage = () => {
  const [status, setStatus] = useState<BillingStatusDto | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    const [s, p] = await Promise.all([billingService.mySubscription(), billingService.listPlans()]);
    setStatus(s.data);
    setPlans(p.data);
    setSelectedPlan((prev) => prev ?? p.data[0]?._id ?? null);
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
          toast.success('Payment confirmed. Your plan is active.');
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
        attempts += 1;
        if (attempts < 6) {
          pollRef.current = setTimeout(() => void poll(), 5000);
        } else {
          toast.info('Still confirming your payment. It will show here once confirmed.');
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
  const pending = useMemo(() => (status?.invoices ?? []).filter((i) => i.status === 'pending_payment'), [status?.invoices]);

  // Re-subscribe wait after a cancelled or ended subscription (mirrors the server rule).
  const cooldownUntil = useMemo(() => {
    if (subscribed || !billing?.currentPeriodEnd) return null;
    const until = new Date(new Date(billing.currentPeriodEnd).getTime() + (plan?.cooldownDays ?? 60) * DAY_MS);
    return until.getTime() > Date.now() ? until : null;
  }, [subscribed, billing, plan?.cooldownDays]);

  /**
   * One-line estimate from the venue's own history: percentage cost vs the
   * plan price plus the processing fees the venue would then pay.
   */
  const estimate = useMemo(() => {
    if (!status || !plan) return null;
    const { avgMonthlyVolume, avgMonthlyFees, platformPercentage } = status.preview;
    if (avgMonthlyVolume <= 0) return null;
    const today = avgMonthlyVolume * (platformPercentage / 100);
    const onPlan = plan.amount + avgMonthlyFees;
    return { volume: avgMonthlyVolume, saving: today - onPlan };
  }, [status, plan]);

  const subscribe = async () => {
    if (!plan) return;
    setWorking('subscribe');
    try {
      const res = await billingService.subscribe(plan._id, returnUrl('new'));
      if (!res.data.checkoutUrl) {
        toast.success('Your plan is active, paid from your credit.');
        setWorking(null);
        await fetchAll();
        return;
      }
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start your subscription. Please try again.'));
      setWorking(null);
    }
  };

  const payPending = async (invoice: BillingInvoiceDto) => {
    setWorking(`pay-${invoice.id}`);
    try {
      const res = await billingService.payInvoice(invoice.id, returnUrl(invoice.id));
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start payment. Please try again.'));
      setWorking(null);
    }
  };

  const confirmInvoice = async (invoice: BillingInvoiceDto) => {
    setWorking(`check-${invoice.id}`);
    try {
      const res = await billingService.confirmInvoice(invoice.id);
      if (res.data.paid) {
        toast.success('Payment confirmed. Your plan is active.');
        await fetchAll();
      } else {
        toast.info('Not confirmed yet. Pay now or check again in a minute.');
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Could not check the payment. Please try again.'));
    } finally {
      setWorking(null);
    }
  };

  const cancel = async () => {
    setWorking('cancel');
    try {
      await billingService.cancel(cancelReason.trim() || undefined);
      toast.success(`Cancelled. Your plan stays active until ${day(billing?.currentPeriodEnd)}.`);
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
      title="Billing"
      actions={
        status && !canManage ? (
          <span className="type-res-small inline-flex items-center gap-1.5 rounded-full bg-res-surface px-3 py-1.5 font-medium text-res-ink-muted">
            <Eye className="size-4" aria-hidden /> View only
          </span>
        ) : undefined
      }
    />
  );

  if (loading) {
    return (
      <div className="mb-14 space-y-5 p-4 md:p-6">
        {header}
        <div className="h-44 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
        <div className="h-56 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
      </div>
    );
  }

  if (!status || loadError) {
    return (
      <div className="mb-14 space-y-5 p-4 md:p-6">
        {header}
        <div className="rounded-res-lg bg-res-card p-10 text-center shadow-res-low">
          <p className="type-res-body text-res-ink-muted">We couldn't load your billing.</p>
          <div className="mt-4 flex justify-center">
            <PrimaryButton
              onClick={() => {
                setLoading(true);
                fetchAll()
                  .then(() => setLoadError(false))
                  .catch(() => setLoadError(true))
                  .finally(() => setLoading(false));
              }}
            >
              Try again
            </PrimaryButton>
          </div>
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
  const currentPlanName =
    status.invoices.find((i) => i.status === 'paid' && i.planName)?.planName ?? 'Monthly plan';
  const showPlans = !subscribed && pending.length === 0 && status.eligible && plans.length > 0;

  const planBadge = onSubscription
    ? inGrace
      ? { label: 'Payment overdue', className: 'bg-amber-400 text-amber-950' }
      : renewing
        ? { label: 'Active', className: 'bg-white/15 text-white' }
        : { label: `Ends ${day(billing?.currentPeriodEnd)}`, className: 'bg-white/15 text-white' }
    : null;

  return (
    <div className="mb-14 space-y-5 p-4 md:p-6">
      {header}

      {/* Current plan: the one thing to know */}
      <section className="rounded-res-lg bg-res-brand p-6 text-res-ink-inverted shadow-res-high md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-res-small text-white/70">Current plan</p>
            <p className="mt-1 text-[28px] leading-tight font-bold tracking-tight">
              {onSubscription ? currentPlanName : 'Pay as you go'}
            </p>
            <p className="type-res-body mt-1 text-white/80">
              {onSubscription
                ? '0% platform fee on Naira payments'
                : `${status.preview.platformPercentage}% per payment, no monthly fee`}
            </p>
          </div>
          {planBadge && (
            <span className={`type-res-caption rounded-full px-3 py-1 font-semibold ${planBadge.className}`}>
              {planBadge.label}
            </span>
          )}
        </div>

        {onSubscription && (
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Stat label="Paid until" value={day(billing?.currentPeriodEnd)} />
            {inGrace ? (
              <Stat label="Pay before" value={day(billing?.graceUntil)} />
            ) : (
              <Stat label="Renewal" value={renewing ? 'Monthly' : 'Off'} />
            )}
            {status.commitmentEnd && <Stat label="Minimum term until" value={day(status.commitmentEnd)} />}
          </div>
        )}

        {!onSubscription && billing?.status === 'lapsed' && (
          <p className="type-res-small mt-4 text-white/80">
            Your plan ended on {day(billing.currentPeriodEnd)} because the renewal wasn't paid.
          </p>
        )}

        {onSubscription && canManage && renewing && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="type-res-small mt-5 cursor-pointer font-semibold text-white/80 underline-offset-2 hover:text-white hover:underline"
          >
            Cancel plan
          </button>
        )}
      </section>

      {/* Anything due */}
      {pending.map((inv) => (
        <section
          key={inv.id}
          className="flex flex-wrap items-center gap-4 rounded-res-lg bg-res-card p-5 shadow-res-low ring-1 ring-amber-200"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Clock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="type-res-h3 text-res-ink">
              {naira(inv.payable)} due {inv.dueDate ? `by ${day(inv.dueDate)}` : 'now'}
            </p>
            <p className="type-res-small text-res-ink-muted">
              {inv.planName ?? 'Subscription'} · {inv.monthsCovered} month{inv.monthsCovered === 1 ? '' : 's'}
              {inv.failedAttempts > 0 && <span className="text-red-600"> · Last attempt failed</span>}
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!!working}
                onClick={() => void confirmInvoice(inv)}
                className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand disabled:opacity-50"
              >
                {working === `check-${inv.id}` ? 'Checking…' : 'I already paid'}
              </button>
              <PrimaryButton busy={working === `pay-${inv.id}`} disabled={!!working} onClick={() => void payPending(inv)}>
                Pay {naira(inv.payable)}
              </PrimaryButton>
            </div>
          )}
        </section>
      ))}

      {/* Plans, only when the venue can actually switch */}
      {showPlans && (
        <Card title="Switch to a monthly plan">
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((p) => {
              const active = selectedPlan === p._id;
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => setSelectedPlan(p._id)}
                  aria-pressed={active}
                  className={`cursor-pointer rounded-res-md p-4 text-left transition-colors ${
                    active ? 'bg-res-secondary ring-2 ring-res-brand' : 'bg-res-surface hover:bg-res-secondary/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="type-res-body font-semibold text-res-ink">{p.name}</p>
                    {active && <CheckCircle2 className="size-5 text-res-brand" aria-hidden />}
                  </div>
                  <p className="mt-2 text-[22px] font-bold text-res-ink">
                    {naira(p.amount)}
                    <span className="type-res-small font-medium text-res-ink-muted"> / month</span>
                  </p>
                  <p className="type-res-small mt-1 text-res-ink-muted">
                    First {p.minTermMonths} months upfront · then monthly
                  </p>
                </button>
              );
            })}
          </div>

          {estimate && (
            <p className={`type-res-small mt-4 font-medium ${estimate.saving > 0 ? 'text-emerald-700' : 'text-res-ink-muted'}`}>
              {estimate.saving > 0
                ? `At your usual ${naira(estimate.volume)} a month, this plan saves about ${naira(estimate.saving)} a month.`
                : `At your usual ${naira(estimate.volume)} a month, pay as you go costs less.`}
            </p>
          )}

          {cooldownUntil ? (
            <p className="type-res-small mt-4 flex items-center gap-2 text-res-ink-muted">
              <Clock className="size-4" aria-hidden /> You can join a plan again from {day(cooldownUntil.toISOString())}.
            </p>
          ) : canManage && plan ? (
            <div className="mt-5 space-y-4 border-t border-res-line pt-5">
              <div>
                <label className="type-res-small flex cursor-pointer items-start gap-3 text-res-ink">
                  <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
                  <span>
                    I agree to the plan terms. The first {plan.minTermMonths} months are{' '}
                    <strong>non-refundable</strong>.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowTerms((v) => !v)}
                  aria-expanded={showTerms}
                  className="type-res-small mt-2 ml-7 inline-flex cursor-pointer items-center gap-1 font-semibold text-res-brand"
                >
                  Read terms
                  <ChevronDown className={`size-4 transition-transform ${showTerms ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                {showTerms && (
                  <ul className="type-res-small mt-2 ml-7 list-disc space-y-1 pl-4 text-res-ink-muted">
                    <li>
                      {naira(plan.amount * plan.minTermMonths)} for the first {plan.minTermMonths} months, paid now and not
                      refunded if you leave early.
                    </li>
                    <li>Then {naira(plan.amount)} a month. Price changes are announced at least 30 days ahead.</li>
                    <li>Card and transfer fees on your payments come out of your share.</li>
                    <li>
                      A late renewal has {plan.graceDays} days' grace, then you move back to pay as you go. After leaving,
                      you can rejoin after {plan.cooldownDays} days.
                    </li>
                    <li>Terms version {status.termsVersion}.</li>
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <PrimaryButton busy={working === 'subscribe'} disabled={!accepted} onClick={() => void subscribe()}>
                  Subscribe · {naira(plan.amount * plan.minTermMonths)}
                </PrimaryButton>
                {status.availableCredit > 0 && (
                  <span className="type-res-small text-res-ink-muted">
                    Your {naira(status.availableCredit)} credit is applied at checkout.
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {/* Invoices */}
      <Card
        title="Invoices"
        aside={
          status.availableCredit > 0 ? (
            <span className="type-res-caption rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              {naira(status.availableCredit)} credit
            </span>
          ) : undefined
        }
      >
        {status.invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ReceiptText className="size-6 text-res-ink-muted" aria-hidden />
            <p className="type-res-small text-res-ink-muted">No invoices yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-res-line">
            {status.invoices.map((inv) => {
              const s = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft;
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="type-res-body font-semibold text-res-ink">
                      {inv.periodStart ? `${day(inv.periodStart)} – ${day(inv.periodEnd)}` : `${inv.monthsCovered} month${inv.monthsCovered === 1 ? '' : 's'}`}
                    </p>
                    <p className="type-res-caption text-res-ink-muted">
                      <span className="font-mono">{inv.invoiceNumber}</span>
                      {inv.planName && ` · ${inv.planName}`}
                      {inv.status === 'paid' && inv.confirmedAt && ` · Paid ${day(inv.confirmedAt)}`}
                      {inv.lagCreditDays > 0 && ` · +${inv.lagCreditDays} days added`}
                    </p>
                  </div>
                  <p className="type-res-body font-semibold text-res-ink tabular-nums">{naira(inv.totalDue)}</p>
                  <span className={`type-res-caption rounded-full px-2.5 py-1 font-semibold ${s.className}`}>{s.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your plan?</AlertDialogTitle>
            <AlertDialogDescription>
              It stays active until {day(billing?.currentPeriodEnd)}, then you're back on pay as you go. Time already paid
              isn't refunded, and you can rejoin after {plan?.cooldownDays ?? 60} days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Why are you leaving? (optional)"
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working === 'cancel'}>Keep plan</AlertDialogCancel>
            <button
              type="button"
              disabled={working === 'cancel'}
              onClick={() => void cancel()}
              className="type-res-small cursor-pointer rounded-full bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
            >
              {working === 'cancel' ? 'Cancelling…' : 'Cancel plan'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingPage;
