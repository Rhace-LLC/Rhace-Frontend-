import { useState } from 'react';
import { Link } from 'react-router';
import type { ReportParams } from '@/services/payment.service';
import { formatMoney } from '@/utils/money';
import { useTransactions } from '../report/queries';
import { CardSkeleton, EmptyState, ErrorState, ProviderBadge, ReportCard, StatusPill } from '../report/ui';
import PaymentDetailsDialog from './PaymentDetailDialog';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  });

/** The five latest payments in the range, with a link to the full ledger. */
export function RecentTransactions({ params, allHref }: { params: ReportParams; allHref: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useTransactions({ ...params, limit: 5, page: 1 });
  const rows = query.data?.items ?? [];

  return (
    <ReportCard
      title="Recent transactions"
      actions={
        <Link to={allHref} className="type-res-small font-semibold text-res-brand hover:text-res-brand-hover">
          View all →
        </Link>
      }
    >
      {query.isError && !query.data ? (
        <ErrorState message="Couldn't load recent transactions." onRetry={() => query.refetch()} />
      ) : query.isLoading && !query.data ? (
        <CardSkeleton rows={5} />
      ) : !rows.length ? (
        <EmptyState message="No transactions in this period." />
      ) : (
        <ul className="divide-y divide-res-line">
          {rows.map((row) => (
            <li key={row._id}>
              <button
                type="button"
                onClick={() => setOpenId(row._id)}
                className="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 py-3 text-left hover:bg-res-surface md:px-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="type-res-small truncate font-semibold text-res-ink">{row.customerName}</p>
                  <p className="type-res-caption text-res-ink-muted">{when(row.at)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <ProviderBadge provider={row.provider} />
                  <StatusPill status={row.status} />
                </div>
                <p className="type-res-body w-28 text-right font-semibold text-res-ink tabular-nums">
                  {formatMoney(row.amount, row.currency)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      <PaymentDetailsDialog paymentId={openId} onOpenChange={(open) => !open && setOpenId(null)} />
    </ReportCard>
  );
}
