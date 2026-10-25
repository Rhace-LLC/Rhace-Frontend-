import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { PaymentsTabs } from './components/PaymentsTabs';
import { ReportFilterBar } from './components/ReportFilterBar';
import PaymentTransactionHistory from './components/TransactionHistory';

/** Full payments ledger: paginated, filterable, exportable. */
export default function VendorPaymentTransactions() {
  return (
    <div className="mb-14 space-y-5 py-2 md:p-6">
      <DashboardPageHeader
        title="Transactions"
        subtitle="Every payment in the selected period."
        actions={<ReportFilterBar />}
      />
      <PaymentsTabs />
      <PaymentTransactionHistory />
    </div>
  );
}
