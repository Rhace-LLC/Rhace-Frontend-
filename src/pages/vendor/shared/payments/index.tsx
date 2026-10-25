import { Link } from 'react-router';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { formatMoney } from '@/utils/money';
import { BreakdownCard } from './components/BreakdownCard';
import { KpiTiles } from './components/KpiTiles';
import { MoneyFlowCard } from './components/MoneyFlowCard';
import { PaymentsTabs } from './components/PaymentsTabs';
import { RecentTransactions } from './components/RecentTransactions';
import { ReportFilterBar } from './components/ReportFilterBar';
import { RevenueChart } from './components/RevenueChart';
import { useReportSummary } from './report/queries';
import { useReportFilters, useVendorBase } from './report/useReportFilters';

/** Payments overview: what you earned, what it cost, and where the money is. */
const VendorPaymentOverview = () => {
  const { params, setPreset, setCurrency, compareLabel, sharedQuery } = useReportFilters();
  const base = useVendorBase();
  const summary = useReportSummary(params);
  const other = summary.data?.otherCurrencies?.[0];

  return (
    <div className="mb-14 space-y-5 py-2 md:p-6">
      <DashboardPageHeader
        title="Payments"
        subtitle="Earnings, fees and payment history."
        actions={<ReportFilterBar />}
      />
      <PaymentsTabs />

      {other && (
        <p className="type-res-small rounded-res-md bg-res-secondary px-4 py-3 text-res-ink">
          You also have {formatMoney(other.gross, other.currency)} in {other.currency} payments in this period.{' '}
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
      <RevenueChart key={JSON.stringify(params)} params={params} onLongerRange={() => setPreset('last_year')} />

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

      <RecentTransactions params={params} allHref={`${base}/payments/transactions${sharedQuery}`} />

      <p className="type-res-small text-res-ink-muted">
        Payout account and payment providers are in{' '}
        <Link to={`${base}/settings`} className="font-semibold text-res-brand hover:text-res-brand-hover">
          Settings
        </Link>
        .
      </p>
    </div>
  );
};

export default VendorPaymentOverview;
