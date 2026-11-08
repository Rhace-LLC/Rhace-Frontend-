import { Link } from 'react-router';
import { formatMoney } from '@/utils/money';
import { useReportSummary } from '../report/queries';
import { paymentsTabHref } from '../report/tabs';
import { useReportFilters, useVendorBase } from '../report/useReportFilters';
import { BreakdownCard } from './BreakdownCard';
import { KpiTiles } from './KpiTiles';
import { MoneyFlowCard } from './MoneyFlowCard';
import { RecentTransactions } from './RecentTransactions';
import { RevenueChart } from './RevenueChart';

/** Overview tab: what you earned, what it cost, and where the money is. */
export function PaymentsOverview() {
  const { params, setPreset, setCurrency, compareLabel, sharedQuery } = useReportFilters();
  const base = useVendorBase();
  const summary = useReportSummary(params);
  const other = summary.data?.otherCurrencies?.[0];

  return (
    <div className="space-y-5">
      {other && (
        <p className="type-res-small rounded-res-md bg-res-secondary px-4 py-3 text-res-ink">
          You also have {formatMoney(other.gross, other.currency)} in {other.currency} payments in
          this period.{' '}
          <button
            type="button"
            onClick={() => setCurrency(other.currency)}
            className="cursor-pointer font-semibold text-res-brand underline-offset-2 hover:underline"
          >
            Switch to {other.currency}
          </button>
        </p>
      )}

      <KpiTiles
        summary={summary.data}
        loading={summary.isLoading}
        error={summary.isError}
        onRetry={() => summary.refetch()}
        compareLabel={compareLabel}
      />

      {/* Remount on a new range so a bucket override doesn't carry over. */}
      <RevenueChart
        key={JSON.stringify(params)}
        params={params}
        onLongerRange={() => setPreset('last_year')}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <MoneyFlowCard
          summary={summary.data}
          params={params}
          loading={summary.isLoading}
          error={summary.isError}
          onRetry={() => summary.refetch()}
        />
        <BreakdownCard params={params} />
      </div>

      <RecentTransactions
        params={params}
        allHref={paymentsTabHref(base, 'transactions', sharedQuery)}
      />

      <p className="type-res-small text-res-ink-muted">
        Payout account and payment providers are in{' '}
        <Link
          to={`${base}/settings/payments`}
          className="font-semibold text-res-brand hover:text-res-brand-hover"
        >
          Payment settings
        </Link>
        .
      </p>
    </div>
  );
}
