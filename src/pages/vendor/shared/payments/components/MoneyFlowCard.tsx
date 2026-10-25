import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ReportParams, ReportSummaryDto } from '@/services/payment.service';
import { formatMoney } from '@/utils/money';
import { useReportBreakdown } from '../report/queries';
import { CardSkeleton, EmptyState, ErrorState, ReportCard } from '../report/ui';

/**
 * Gross → net waterfall. Any gap between the parts and the stored nets (old
 * rows, customer-borne fees) shows as "Other adjustments" so the lines always
 * add up to what the vendor actually received.
 */
export function MoneyFlowCard({
  summary,
  params,
  loading,
  error,
  onRetry,
}: {
  summary?: ReportSummaryDto;
  params: ReportParams;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const [showFees, setShowFees] = useState(false);
  const currency = summary?.currency ?? params.currency ?? 'NGN';
  const money = (v: number) => formatMoney(v, currency);
  const c = summary?.current;

  let body;
  if (error && !summary) body = <ErrorState message="Couldn't load the breakdown." onRetry={onRetry} />;
  else if (loading && !summary) body = <CardSkeleton rows={5} />;
  else if (!c || c.count === 0) body = <EmptyState message="No payments in this period." />;
  else {
    const fromPayments = c.net;
    const other = Math.round((c.gross - c.platformCommission - c.transactionFees - fromPayments) * 100) / 100;
    const lines: { label: string; value: number; tone?: 'minus' | 'total' }[] = [
      { label: 'Gross', value: c.gross },
      { label: 'Platform commission', value: -c.platformCommission, tone: 'minus' },
      { label: 'Transaction fees', value: -c.transactionFees, tone: 'minus' },
      ...(Math.abs(other) >= 1 ? [{ label: 'Other adjustments', value: -other, tone: 'minus' as const }] : []),
      ...(c.refunds ? [{ label: 'Refunds paid', value: -c.refunds, tone: 'minus' as const }] : []),
    ];
    const net = fromPayments - c.refunds;
    body = (
      <>
        <dl className="space-y-2">
          {lines.map((line) => (
            <div key={line.label} className="flex items-center justify-between gap-3">
              <dt className="type-res-small text-res-ink-muted">{line.label}</dt>
              <dd className={`type-res-body tabular-nums ${line.tone === 'minus' ? 'text-res-ink-muted' : 'font-semibold text-res-ink'}`}>
                {line.tone === 'minus' ? `−${money(Math.abs(line.value))}` : money(line.value)}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-res-line pt-2">
            <dt className="type-res-small font-semibold text-res-ink">
              {c.refunds ? 'Net after refunds' : 'Net to you'}
            </dt>
            <dd className="type-res-h3 text-res-brand tabular-nums">{money(net)}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setShowFees((v) => !v)}
          aria-expanded={showFees}
          className="type-res-small mt-4 inline-flex cursor-pointer items-center gap-1 font-semibold text-res-brand hover:text-res-brand-hover"
        >
          Fees by provider
          <ChevronDown className={`size-4 transition-transform ${showFees ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {showFees && <FeesByProvider params={params} currency={currency} />}
      </>
    );
  }

  return (
    <ReportCard title="Where the money went" subtitle="From what customers paid to what reaches you.">
      {body}
    </ReportCard>
  );
}

function FeesByProvider({ params, currency }: { params: ReportParams; currency: string }) {
  const query = useReportBreakdown(params, 'provider');
  if (query.isLoading) return <CardSkeleton rows={3} />;
  if (query.isError) return <ErrorState message="Couldn't load provider fees." onRetry={() => query.refetch()} />;
  const rows = query.data?.rows ?? [];
  if (!rows.length) return null;

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-105 text-left">
        <thead>
          <tr className="type-res-caption text-res-ink-muted">
            <th className="py-2 font-medium">Provider</th>
            <th className="py-2 text-right font-medium">Transactions</th>
            <th className="py-2 text-right font-medium">Volume</th>
            <th className="py-2 text-right font-medium">Fees</th>
            <th className="py-2 text-right font-medium">Effective rate</th>
          </tr>
        </thead>
        <tbody className="type-res-small text-res-ink tabular-nums">
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-res-line">
              <td className="py-2">{row.label}</td>
              <td className="py-2 text-right">{row.count.toLocaleString()}</td>
              <td className="py-2 text-right">{formatMoney(row.volume, currency, { compact: true })}</td>
              <td className="py-2 text-right">{formatMoney(row.fees, currency)}</td>
              <td className="py-2 text-right">{row.key === 'offline' ? '—' : `${row.effectiveRate}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="type-res-caption mt-2 text-res-ink-muted">
        Fees show the part you pay under your fee plan. Offline payments (cash, POS, transfer) carry no provider fee.
      </p>
    </div>
  );
}
