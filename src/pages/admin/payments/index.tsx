import AdminPaymentStats from './components/AdminPaymentStats';
import AdminEarningTrends from './components/AdminEarningTrends';
import AdminPaymentTransactionHistory from './components/AdminPaymentTransactionHistory';

const AdminPaymentDashboard = () => {
  return (
    <div className="space-y-6">
      <AdminPaymentStats />

      <AdminEarningTrends />

      <AdminPaymentTransactionHistory />
    </div>
  );
};

export default AdminPaymentDashboard;