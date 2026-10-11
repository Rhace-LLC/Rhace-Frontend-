import AdminPaymentStats from './components/AdminPaymentStats';
import AdminEarningTrends from './components/AdminEarningTrends';
import AdminPaymentTransactionHistory from './components/AdminPaymentTransactionHistory';
import PspHealthCards from './components/PspHealthCards';
import PspReviewQueue from './components/PspReviewQueue';
import PspEventsFeed from './components/PspEventsFeed';
import SubscriptionMonitor from './components/SubscriptionMonitor';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

const AdminPaymentDashboard = () => {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Payments"
        subtitle="Provider health, review queue, subscriptions, earnings and transaction history."
      />

      <AdminPaymentStats />

      <AdminEarningTrends />

      <PspHealthCards />

      <PspReviewQueue />

      <SubscriptionMonitor />

      <AdminPaymentTransactionHistory />

      <PspEventsFeed />
    </div>
  );
};

export default AdminPaymentDashboard;