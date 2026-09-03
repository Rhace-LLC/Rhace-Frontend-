import AdminPaymentStats from './AdminPayment/AdminPaymentStats';
import AdminEarningTrends from './AdminPayment/AdminEarningTrends';
import AdminPaymentTransactionHistory from './AdminPayment/AdminPaymentTransactionHistory';

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