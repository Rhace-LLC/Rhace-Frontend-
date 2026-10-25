import { useState } from 'react';
import type { BreakdownDimension, ReportParams } from '@/services/payment.service';
import { formatMoney } from '@/utils/money';
import { useReportBreakdown } from '../report/queries';
import { CardSkeleton, EmptyState, ErrorState, ReportCard } from '../report/ui';
import { pillButton } from '../report/labels';

const VIEWS: { value: BreakdownDimension; label: string }[] = [
  { value: 'provider', label: 'Channel' },
  { value: 'method', label: 'Method' },
  { value: 'source', label: 'Source' },
];

/** Share of volume per channel / method / source, as horizontal bars. */
export function BreakdownCard({ params }: { params: ReportParams }) {
  const [by, setBy] = useState<BreakdownDimension>('provider');
  const query = useReportBreakdown(params, by);
  const currency = query.data?.currency ?? params.currency ?? 'NGN';
  const rows = query.data?.rows ?? [];

  return (
    <ReportCard
      title="How customers paid"
      subtitle="Share of payment volume in this period."
      actions={
        <div className="flex gap-1" role="group" aria-label="Break down by">
          {VIEWS.map((view) => (
            <button
              key={view.value}
              type="button"
              className={pillButton(by === view.value)}
              aria-pressed={by === view.value}
              onClick={() => setBy(view.value)}
            >
              {view.label}
            </button>
          ))}
        </div>
      }
    >
      {query.isError && !query.data ? (
        <ErrorState message="Couldn't load the breakdown." onRetry={() => query.refetch()} />
      ) : query.isLoading && !query.data ? (
        <CardSkeleton rows={4} />
      ) : !rows.length ? (
        <EmptyState message="No payments in this period." />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="type-res-small font-medium text-res-ink">{row.label}</span>
                <span className="type-res-small text-res-ink-muted tabular-nums">
                  <span title={formatMoney(row.volume, currency)}>
                    {formatMoney(row.volume, currency, { compact: true })}
                  </span>
                  {' · '}
                  <span className="font-semibold text-res-ink">{row.share}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-res-surface" aria-hidden>
                <div className="h-full rounded-full bg-res-brand" style={{ width: `${Math.max(row.share, 1)}%` }} />
              </div>
              <p className="type-res-caption mt-1 text-res-ink-muted">
                {row.count.toLocaleString()} payment{row.count === 1 ? '' : 's'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ReportCard>
  );
}
