import { Button } from '@/components/ui/button';
import { RefreshCcw, ShieldCheck, Clock } from 'lucide-react';

interface ProviderStatusCardProps {
  provider: 'paystack' | 'monnify' | 'stripe';
  status: {
    enabled: boolean;
    ready: boolean;
    lastError?: string;
    started?: boolean;
    requirementsDue?: string[];
  };
  onRetry: () => Promise<void>;
  retrying: boolean;
  label: string;
  description: string;
}

export function ProviderStatusCard({
  provider,
  status,
  onRetry,
  retrying,
  label,
  description,
}: ProviderStatusCardProps) {
  const isReady = status.ready;
  const isFailed = Boolean(status.lastError) && !status.ready;
  const isNotSetUp = !status.ready && !status.lastError;

  const pillConfig = {
    ready: { variant: 'default' as const, className: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Ready' },
    actionNeeded: { variant: 'secondary' as const, className: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Action needed' },
    failed: { variant: 'destructive' as const, className: 'bg-red-50 text-red-700 border-red-100', label: 'Failed' },
    notSetUp: { variant: 'secondary' as const, className: 'bg-res-surface text-res-ink-muted border-res-line', label: 'Not set up' },
  };

  const pill = isReady
    ? pillConfig.ready
    : isFailed
      ? pillConfig.failed
      : isNotSetUp
        ? pillConfig.notSetUp
        : pillConfig.actionNeeded;

  return (
    <div className="rounded-res-lg border border-res-line bg-res-card p-5 shadow-res-low">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-res-surface">
            {provider === 'stripe' ? (
              <ShieldCheck className="h-5 w-5 text-res-brand" />
            ) : (
              <Clock className="h-5 w-5 text-res-brand" />
            )}
          </div>
          <div>
            <p className="type-res-body text-res-ink font-medium">{label}</p>
            <p className="type-res-small text-res-ink-muted">{description}</p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${pill.className}`}>
          {pill.label}
        </span>
      </div>

      {provider === 'stripe' && status.started && status.requirementsDue && status.requirementsDue.length > 0 && (
        <div className="mt-2 p-3 rounded-res-md bg-amber-50 border border-amber-100">
          <p className="type-res-small text-amber-700 font-medium">Stripe onboarding incomplete</p>
          <p className="type-res-xs text-amber-600 mt-1">
            {status.requirementsDue.length} requirement{status.requirementsDue.length > 1 ? 's' : ''} remaining:
          </p>
          <ul className="type-res-xs text-amber-600 mt-1 list-disc list-inside">
            {status.requirementsDue.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {isFailed && status.lastError && (
        <div className="mt-2 p-3 rounded-res-md bg-red-50 border border-red-100">
          <p className="type-res-small text-red-700 font-medium">Setup failed</p>
          <p className="type-res-sm text-red-600 mt-1">{status.lastError}</p>
        </div>
      )}

      {(provider === 'paystack' || provider === 'monnify') && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            onClick={onRetry}
            disabled={retrying || status.ready}
            className="flex-1 rounded-res-md border border-res-line bg-res-card px-4 py-2.5 font-medium text-res-ink shadow-res-low hover:bg-res-surface disabled:opacity-60"
          >
            {retrying ? 'Retrying…' : 'Retry setup'}
          </Button>
        </div>
      )}

      {provider === 'stripe' && !status.ready && !status.started && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            onClick={() => {
              window.location.assign(`${window.location.origin}/vendors/me/connect-stripe`);
            }}
            className="flex-1 rounded-res-md bg-res-brand px-4 py-2.5 font-medium text-res-ink-inverted shadow-res-low hover:bg-res-brand-hover disabled:opacity-60"
          >
            Connect Stripe
          </Button>
        </div>
      )}

      {provider === 'stripe' && status.started && !status.ready && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            onClick={() => {
              window.location.assign(`${window.location.origin}/vendors/me/connect-stripe`);
            }}
            className="flex-1 rounded-res-md border border-res-line bg-res-card px-4 py-2.5 font-medium text-res-ink shadow-res-low hover:bg-res-surface"
          >
            Continue Stripe setup
          </Button>
          <Button
            onClick={() => {
              window.location.assign(`${window.location.origin}/vendors/me/connect-stripe?stripe=refresh`);
            }}
            className="flex-1 rounded-res-md border border-res-line bg-res-card px-4 py-2.5 font-medium text-res-ink shadow-res-low hover:bg-res-surface"
          >
            Check status
          </Button>
        </div>
      )}
    </div>
  );
}
