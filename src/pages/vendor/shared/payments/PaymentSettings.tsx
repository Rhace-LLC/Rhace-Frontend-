import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { paymentService } from '@/services/payment.service';
import { ProviderStatusCard } from './components/ProviderStatusCard';
import { ShieldCheck, Clock, Lock } from 'lucide-react';

interface BankAccount {
  bankName?: string;
  accountName?: string;
  accountNumberLast4?: string;
}

interface ProviderStatus {
  enabled: boolean;
  ready: boolean;
  lastError?: string;
  started?: boolean;
  requirementsDue?: string[];
}

interface Providers {
  paystack?: ProviderStatus;
  monnify?: ProviderStatus;
  stripe?: ProviderStatus & { started: boolean; requirementsDue: string[] };
}

interface AccountData {
  bank: BankAccount;
  activeProvider: 'paystack' | 'monnify';
  providers: Providers;
  feeBearer: string;
}

interface PaymentAccountsResponse {
  success: boolean;
  account: AccountData;
}

export default function PaymentSettings() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getMyPaymentAccounts();
      setData(res.account as unknown as AccountData);
    } catch {
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const retryProvider = async (provider: 'paystack' | 'monnify') => {
    setRetrying((prev) => new Set([...prev, provider]));
    try {
      const res = await paymentService.retryProviderAccount(provider);
      setData(res.account);
      toast.success(`Sub-account created for ${provider}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create sub-account');
    } finally {
      setRetrying((prev) => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
    }
  };

  const isNairaReady = data?.providers.paystack?.ready || data?.providers.monnify?.ready;
  const activeProvider = data?.activeProvider || 'paystack';

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <DashboardPageHeader title="Payment Settings" subtitle="Manage your payment providers and payout account." />
        <div className="h-64 animate-pulse rounded-res-lg bg-res-surface" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <DashboardPageHeader title="Payment Settings" subtitle="Manage your payment providers and payout account." />
        <div className="rounded-res-lg border border-res-line border-dashed bg-res-card p-12 text-center">
          <p className="type-res-small text-res-ink-muted">Unable to load payment settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <DashboardPageHeader
        title="Payment Settings"
        subtitle="Manage your payment providers and payout account."
      />

      {/* Summary banner */}
      <div className="mb-6 rounded-res-lg border border-res-line bg-res-surface p-4 shadow-res-low">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-res-card">
            {isNairaReady ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            ) : (
              <Clock className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div>
            <p className={`type-res-body text-res-ink font-medium ${!isNairaReady ? 'text-amber-700' : ''}`}>
              {isNairaReady
                ? `You can accept Naira payments through ${activeProvider}.`
                : `Naira payments are at risk: ${activeProvider} isn't set up.`}
            </p>
            <p className="type-res-small text-res-ink-muted">
              Customers pay into Rhace's platform account; your share is settled to your bank account automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Payout bank account */}
      <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
        <CardHeader className="pb-3">
          <CardTitle className="type-res-body text-res-ink font-semibold">Payout bank account</CardTitle>
          <CardDescription className="type-res-small text-res-ink-muted">
            This is where your share of customer payments is settled. Read-only — to change it, contact support.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider block">Bank name</label>
              <p className="type-res-body text-res-ink">{data.bank.bankName ?? '—'}</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider block">Account name</label>
              <p className="type-res-body text-res-ink">{data.bank.accountName ?? '—'}</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider block">Account number</label>
              <p className="type-res-body text-res-ink font-mono">
                {data.bank.accountNumberLast4 ? `•••• ${data.bank.accountNumberLast4}` : '—'}
              </p>
            </div>
          </div>
          <p className="mt-3 type-res-small text-res-ink-muted">
            Need to change your bank account? Contact support.
          </p>
        </CardContent>
      </Card>

      {/* Paystack */}
      <ProviderStatusCard
        provider="paystack"
        label="Paystack"
        description="Used for Naira payments. Customers' payments are split automatically and sent to your bank account."
        status={data.providers.paystack!}
        onRetry={() => retryProvider('paystack')}
        retrying={retrying.has('paystack')}
      />

      {/* Monnify */}
      <ProviderStatusCard
        provider="monnify"
        label="Monnify"
        description="Alternative Naira payment provider used as fallback when Paystack isn't available for your account."
        status={data.providers.monnify!}
        onRetry={() => retryProvider('monnify')}
        retrying={retrying.has('monnify')}
      />

      {/* Stripe */}
      <ProviderStatusCard
        provider="stripe"
        label="Stripe Connect"
        description="Optional. Lets you accept card payments in USD, EUR and GBP."
        status={data.providers.stripe!}
        onRetry={async () => {}}
        retrying={false}
      />

      {/* Fee bearer */}
      <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
        <CardHeader className="pb-3">
          <CardTitle className="type-res-body text-res-ink font-semibold">Fee bearer</CardTitle>
          <CardDescription className="type-res-small text-res-ink-muted">
            Who absorbs the payment processing fee on each transaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-res-surface">
              <Lock className="h-5 w-5 text-res-ink-muted" />
            </div>
            <div>
              <p className="type-res-body text-res-ink font-medium">{data.feeBearer}</p>
              <p className="type-res-small text-res-ink-muted">
                Set by the platform. Cannot be changed from this page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
