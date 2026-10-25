import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransactionStatus } from '@/services/payment.service';
import { PROVIDER_LABEL, STATUS_LABEL, titleCase } from './labels';

const STATUS_STYLE: Record<TransactionStatus, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-slate-100 text-slate-700',
  partially_refunded: 'bg-slate-100 text-slate-700',
};

/** Standard report card surface. */
export function ReportCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-res-lg bg-res-card p-5 shadow-res-low md:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="type-res-h3 text-res-ink">{title}</h2>}
            {subtitle && <p className="type-res-small mt-0.5 text-res-ink-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: TransactionStatus }) {
  return (
    <span className={`type-res-caption inline-flex rounded-full px-2.5 py-1 font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span className="type-res-caption inline-flex rounded-full bg-res-surface px-2.5 py-1 font-medium text-res-ink">
      {PROVIDER_LABEL[provider] ?? titleCase(provider)}
    </span>
  );
}

/**
 * Period-over-period change. `goodWhenUp` is false for costs (fees, refunds),
 * so a rise shows red. Always an arrow as well as colour.
 */
export function ChangeChip({
  value,
  goodWhenUp = true,
  suffix,
}: {
  value: number | null | undefined;
  goodWhenUp?: boolean;
  suffix?: string;
}) {
  if (value === null || value === undefined) {
    return <span className="type-res-caption text-res-ink-muted">No earlier data{suffix ? ` ${suffix}` : ''}</span>;
  }
  const up = value > 0;
  const flat = value === 0;
  const good = flat ? null : up === goodWhenUp;
  const tone = good === null ? 'text-res-ink-muted' : good ? 'text-emerald-700' : 'text-red-700';
  return (
    <span className={`type-res-caption font-medium ${tone}`}>
      <span aria-hidden>{flat ? '–' : up ? '▲' : '▼'}</span> {Math.abs(value)}%
      <span className="sr-only">{flat ? 'no change' : up ? 'up' : 'down'}</span>
      {suffix && <span className="font-normal text-res-ink-muted"> {suffix}</span>}
    </span>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full rounded-res-sm" />
      ))}
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <p className="type-res-body text-res-ink-muted">{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <p className="type-res-small text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink hover:text-res-brand"
        >
          Try again
        </button>
      )}
    </div>
  );
}
