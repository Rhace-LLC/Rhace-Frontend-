import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import { AlertCircle, CheckCircle2, Clock, Globe, Landmark, Loader2 } from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import {
  paymentService,
  type PaymentAccountDto,
  type ProviderAccountStatus,
} from '@/services/payment.service';

type NgnProvider = 'paystack' | 'monnify';

const PROVIDER_NAME: Record<string, string> = { paystack: 'Paystack', monnify: 'Monnify', stripe: 'Stripe' };

const FEE_BEARER: Record<PaymentAccountDto['feeBearer'], string> = {
  vendor: 'You',
  customer: 'Your customer',
  split: 'Shared with your customer',
  platform: 'Rhace',
};

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

// ─── Small building blocks ──────────────────────────────────────────────

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-res-lg bg-res-card p-5 shadow-res-low md:p-6">
      <h2 className="type-res-h3 text-res-ink">{title}</h2>
      {subtitle && <p className="type-res-small mt-0.5 text-res-ink-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

type Tone = 'ready' | 'pending' | 'failed' | 'idle';

const TONE: Record<Tone, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  ready: { label: 'Ready', className: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  pending: { label: 'In progress', className: 'bg-amber-50 text-amber-700', Icon: Clock },
  failed: { label: 'Needs attention', className: 'bg-red-50 text-red-700', Icon: AlertCircle },
  idle: { label: 'Not set up', className: 'bg-res-surface text-res-ink-muted', Icon: Clock },
};

function StatusPill({ tone }: { tone: Tone }) {
  const { label, className, Icon } = TONE[tone];
  return (
    <span className={`type-res-caption inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${className}`}>
      <Icon className="size-3.5" aria-hidden /> {label}
    </span>
  );
}

function PillButton({
  children,
  onClick,
  busy,
  primary = false,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  busy?: boolean;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`type-res-small inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        primary
          ? 'bg-res-brand text-res-ink-inverted shadow-res-low hover:bg-res-brand-hover'
          : 'bg-res-surface text-res-ink hover:text-res-brand'
      }`}
    >
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

function ProviderRow({
  name,
  tone,
  detail,
  action,
}: {
  name: string;
  tone: Tone;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-res-md bg-res-surface p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="type-res-body font-semibold text-res-ink">{name}</p>
          <StatusPill tone={tone} />
        </div>
        {detail && <p className="type-res-small mt-1 text-res-ink-muted">{detail}</p>}
      </div>
      {action}
    </li>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

/** Vendor payment settings: payout account, Naira providers and Stripe (foreign currency). */
export default function PaymentSettings() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<PaymentAccountDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const handledReturn = useRef(false);

  const load = useCallback(async (syncStripe = false) => {
    try {
      setLoadError(false);
      const res = await paymentService.getMyPaymentAccounts({ syncStripe });
      setData(res.account);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const openStripe = useCallback(async () => {
    setBusy('stripe');
    try {
      const res = await paymentService.connectStripe();
      if (res.alreadyReady) {
        toast.success('Stripe is ready.');
        await load(true);
      } else if (res.onboardingUrl) {
        // Stripe-hosted onboarding; it sends the vendor back to this page.
        window.location.assign(res.onboardingUrl);
        return;
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start Stripe setup.'));
    }
    setBusy(null);
  }, [load]);

  // Coming back from Stripe: `return` = check the result, `refresh` = the
  // link expired, so get a new one straight away.
  useEffect(() => {
    if (handledReturn.current) return;
    handledReturn.current = true;
    const stripe = params.get('stripe');
    if (stripe) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('stripe');
          return next;
        },
        { replace: true },
      );
    }
    if (stripe === 'refresh') {
      load();
      openStripe();
    } else {
      load(stripe === 'return');
    }
  }, [params, setParams, load, openStripe]);

  const setUp = async (provider: NgnProvider) => {
    setBusy(provider);
    try {
      const res = await paymentService.retryProviderAccount(provider);
      setData(res.account);
      toast.success(`${PROVIDER_NAME[provider]} is set up.`);
    } catch (error) {
      const account = (error as { response?: { data?: { account?: PaymentAccountDto } } })?.response?.data?.account;
      if (account) setData(account);
      toast.error(errorMessage(error, `Could not set up ${PROVIDER_NAME[provider]}.`));
    } finally {
      setBusy(null);
    }
  };

  const checkStripe = async () => {
    setBusy('stripe-check');
    await load(true);
    setBusy(null);
  };

  const header = <DashboardPageHeader title="Payment settings" subtitle="Where your money goes and how customers pay you." />;

  if (loading) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        {header}
        <div className="h-24 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
        <div className="h-48 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        {header}
        <div className="rounded-res-lg bg-res-card p-10 text-center shadow-res-low">
          <p className="type-res-body text-res-ink-muted">We couldn't load your payment settings.</p>
          <div className="mt-4 flex justify-center">
            <PillButton primary onClick={() => load()}>
              Try again
            </PillButton>
          </div>
        </div>
      </div>
    );
  }

  const ngn = (['paystack', 'monnify'] as NgnProvider[]).filter((id) => data.providers[id]?.enabled);
  // Payments route to any ready provider the platform uses (main or backup).
  const nairaReady = ngn.some((id) => data.providers[id].ready);
  const stripe = data.providers.stripe;

  const ngnTone = (s: ProviderAccountStatus): Tone => (s.ready ? 'ready' : s.lastError ? 'failed' : 'idle');
  const stripeTone: Tone = stripe.ready
    ? 'ready'
    : stripe.started
      ? 'pending'
      : stripe.lastError
        ? 'failed'
        : 'idle';

  return (
    <div className="space-y-5 p-4 md:p-6">
      {header}

      {/* Status at a glance */}
      <div
        className={`flex items-center gap-4 rounded-res-lg p-5 shadow-res-low ${
          nairaReady ? 'bg-res-brand text-res-ink-inverted' : 'bg-res-card text-res-ink'
        }`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            nairaReady ? 'bg-white/15' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {nairaReady ? <CheckCircle2 className="size-6" aria-hidden /> : <AlertCircle className="size-6" aria-hidden />}
        </span>
        <div>
          <p className="type-res-h3">{nairaReady ? 'You can take online payments' : 'Online payments need setup'}</p>
          <p className={`type-res-small ${nairaReady ? 'text-white/80' : 'text-res-ink-muted'}`}>
            {nairaReady
              ? 'Your share of every payment goes straight to your bank account.'
              : `Set up ${PROVIDER_NAME[data.activeProvider]} below so customers can pay you online.`}
          </p>
        </div>
      </div>

      {/* Payout account */}
      <Card title="Payout account">
        {data.bank.onFile === false ? (
          <p className="type-res-small text-res-ink-muted">
            No bank account on file yet. Contact support to add one before setting up payments.
          </p>
        ) : (
          <div className="flex items-center gap-4 rounded-res-md bg-res-surface p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-res-sm bg-res-card text-res-brand shadow-res-low">
              <Landmark className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="type-res-body font-semibold text-res-ink">{data.bank.accountName ?? '—'}</p>
              <p className="type-res-small text-res-ink-muted">
                {data.bank.bankName ?? 'Bank'}
                {data.bank.accountNumberLast4 && <span className="tabular-nums"> · •••• {data.bank.accountNumberLast4}</span>}
              </p>
            </div>
          </div>
        )}
        <p className="type-res-caption mt-3 text-res-ink-muted">To change your payout account, contact support.</p>
      </Card>

      {/* Naira providers */}
      {ngn.length > 0 && (
        <Card title="Naira payments">
          <ul className="space-y-2">
            {ngn.map((id) => {
              const status = data.providers[id];
              const tone = ngnTone(status);
              return (
                <ProviderRow
                  key={id}
                  name={PROVIDER_NAME[id]}
                  tone={tone}
                  detail={
                    tone === 'failed'
                      ? status.lastError
                      : id === data.activeProvider
                        ? 'Main provider for Naira payments.'
                        : 'Backup if the main provider is unavailable.'
                  }
                  action={
                    !status.ready && data.bank.onFile !== false ? (
                      <PillButton primary={tone === 'idle'} busy={busy === id} onClick={() => setUp(id)}>
                        {tone === 'failed' ? 'Try again' : 'Set up'}
                      </PillButton>
                    ) : undefined
                  }
                />
              );
            })}
          </ul>
        </Card>
      )}

      {/* Stripe */}
      {stripe.enabled && (
        <Card title="Foreign currency" subtitle="Optional. Accept card payments in USD, EUR and GBP.">
          <ul>
            <ProviderRow
              name="Stripe"
              tone={stripeTone}
              detail={
                stripe.ready
                  ? 'Ready for USD, EUR and GBP.'
                  : stripe.started
                    ? stripe.requirementsDue?.length
                      ? `${stripe.requirementsDue.length} detail${stripe.requirementsDue.length === 1 ? '' : 's'} left to finish on Stripe.`
                      : 'Stripe is reviewing your details.'
                    : stripe.lastError
              }
              action={
                stripe.ready ? undefined : stripe.started ? (
                  <div className="flex flex-wrap gap-2">
                    <PillButton busy={busy === 'stripe-check'} onClick={checkStripe}>
                      Check status
                    </PillButton>
                    <PillButton primary busy={busy === 'stripe'} onClick={openStripe}>
                      Continue
                    </PillButton>
                  </div>
                ) : (
                  <PillButton primary busy={busy === 'stripe'} onClick={openStripe}>
                    <Globe className="size-4" aria-hidden /> Connect Stripe
                  </PillButton>
                )
              }
            />
          </ul>
        </Card>
      )}

      {/* Fees */}
      <Card title="Processing fees">
        <div className="flex items-center justify-between gap-3 rounded-res-md bg-res-surface p-4">
          <p className="type-res-small text-res-ink-muted">Who pays the card or transfer fee</p>
          <p className="type-res-body font-semibold text-res-ink">{FEE_BEARER[data.feeBearer] ?? data.feeBearer}</p>
        </div>
      </Card>
    </div>
  );
}
