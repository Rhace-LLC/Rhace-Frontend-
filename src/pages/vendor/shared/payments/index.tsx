import { useSearchParams } from 'react-router';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { RefundTracker } from '@/features/refunds/RefundTracker';
import { SettlementsPanel } from '../settlements/SettlementsPanel';
import { PaymentsOverview } from './components/PaymentsOverview';
import { PaymentsTabs } from './components/PaymentsTabs';
import { ReportFilterBar } from './components/ReportFilterBar';
import PaymentTransactionHistory from './components/TransactionHistory';
import { isPaymentTab, type PaymentTab } from './report/tabs';

const SUBTITLE: Record<PaymentTab, string> = {
  overview: 'Earnings, fees and payment history.',
  transactions: 'Every payment in the selected period.',
  refunds: 'Money owed back to guests. Pay by cash or bank transfer, then record it on the ticket.',
  settlements: 'Money between hotels and their linked outlets for room-charged orders.',
};

/** Payments: one page, four tabs, the active tab in `?tab=` so links and Back work. */
export default function VendorPayments() {
  const [search] = useSearchParams();
  const raw = search.get('tab');
  const tab: PaymentTab = isPaymentTab(raw) ? raw : 'overview';
  // The date range and currency only drive the report tabs.
  const usesReportFilter = tab === 'overview' || tab === 'transactions';

  return (
    <div className="mb-14 space-y-5 py-2 md:p-6">
      <DashboardPageHeader
        title="Payments"
        subtitle={SUBTITLE[tab]}
        actions={usesReportFilter ? <ReportFilterBar /> : undefined}
      />
      <PaymentsTabs active={tab} />

      {tab === 'overview' && <PaymentsOverview />}
      {tab === 'transactions' && <PaymentTransactionHistory />}
      {tab === 'refunds' && <RefundTracker initialOrderId={search.get('orderId') ?? undefined} />}
      {tab === 'settlements' && <SettlementsPanel />}
    </div>
  );
}
