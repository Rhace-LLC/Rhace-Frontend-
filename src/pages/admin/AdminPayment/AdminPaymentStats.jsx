import { useEffect, useState } from 'react';
import {
  Wallet,
  Building2,
  Landmark,
  CreditCard,
  CheckCircle2,
  Clock3,
} from 'lucide-react';

import { paymentService } from '@/services/payment.service';
import PaymentStatCard from "./PaymentStatCart"
import { toast } from 'react-toastify';

const AdminPaymentStats = () => {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const res = await paymentService.getPaymentStats();

      setStats(res);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ??
          'Unable to load payment statistics'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-2xl border bg-white animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
<PaymentStatCard
  title="Gross Sales"
  icon={Wallet}
  value={stats.sales.thisWeek}
  comparison={`Last Week: ₦${stats.sales.lastWeek.toLocaleString()}`}
  change={stats.sales.change}
  color="#0A6C6D"
/>

<PaymentStatCard
  title="Vendor Revenue"
  icon={Building2}
  value={stats.vendorRevenue.thisWeek}
  comparison={`Last Week: ₦${stats.vendorRevenue.lastWeek.toLocaleString()}`}
  change={stats.vendorRevenue.change}
  color="#2563EB"
/>

<PaymentStatCard
  title="Platform Revenue"
  icon={Landmark}
  value={stats.platformRevenue.thisWeek}
  comparison={`Last Week: ₦${stats.platformRevenue.lastWeek.toLocaleString()}`}
  change={stats.platformRevenue.change}
  color="#9333EA"
/>

<PaymentStatCard
  title="Paystack Fees"
  icon={CreditCard}
  value={stats.paystackFees.thisWeek}
  comparison={`Last Week: ₦${stats.paystackFees.lastWeek.toLocaleString()}`}
  change={stats.paystackFees.change}
  color="#F59E0B"
/>

<PaymentStatCard
  title="Completed Payments"
  icon={CheckCircle2}
  value={stats.payments.completed.thisWeek}
  comparison={`Last Week: ${stats.payments.completed.lastWeek}`}
  change={stats.payments.completed.change}
  color="#10B981"
  isCurrency={false}
/>

<PaymentStatCard
  title="Pending Payments"
  icon={Clock3}
  value={stats.payments.pending.thisWeek}
  comparison={`Last Week: ${stats.payments.pending.lastWeek}`}
  change={stats.payments.pending.change}
  color="#EF4444"
  isCurrency={false}
/>

    </div>
  );
};

export default AdminPaymentStats;