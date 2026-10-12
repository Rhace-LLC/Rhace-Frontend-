import { useSearchParams } from 'react-router';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { RefundTracker } from '@/features/refunds/RefundTracker';

/** Vendor page: the refund ticket tracker (refunds are paid offline). */
export default function RefundsPage() {
  const [params] = useSearchParams();
  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Refunds"
        subtitle="Money owed back to guests. Pay by cash or bank transfer, then record it on the ticket."
      />
      <RefundTracker initialOrderId={params.get('orderId') ?? undefined} />
    </div>
  );
}
