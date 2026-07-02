import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import {
  Calendar,
  CardPay,
  Cash2,
} from '@/components/dashboard/ui/svg';

import { StatCard } from '@/components/dashboard/stats/mainStats';

import { paymentService } from '@/services/payment.service';

const emptyStats = {
  sales: {
    thisWeek: 0,
    lastWeek: 0,
    change: 0,
    thisYear: 0,
    lastYear: 0,
    yearChange: 0,
  },

  vendorRevenue: {
    thisWeek: 0,
    lastWeek: 0,
    change: 0,
    thisYear: 0,
    lastYear: 0,
    yearChange: 0,
  },

  platformRevenue: {
    thisWeek: 0,
    lastWeek: 0,
    change: 0,
    thisYear: 0,
    lastYear: 0,
    yearChange: 0,
  },

  paystackFees: {
    thisWeek: 0,
    lastWeek: 0,
    change: 0,
    thisYear: 0,
    lastYear: 0,
    yearChange: 0,
  },

  payments: {
    completed: {
      thisWeek: 0,
      lastWeek: 0,
      change: 0,
    },
    pending: {
      thisWeek: 0,
      lastWeek: 0,
      change: 0,
    },
  },
};

const money = (amount) =>
  `₦${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const PaymentStats = () => {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState(emptyStats);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const res = await paymentService.getPaymentStats();

      setStats(res);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ??
          'Failed to fetch payment statistics'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="h-[120px] rounded-2xl border bg-white animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">

      <div className="grid grid-cols-2 xl:grid-cols-3 divide-x divide-y">

        <StatCard
          title="Gross Sales"
          className="py-6"
          value={money(stats.sales.thisYear)}
          change={stats.sales.yearChange}
          icon={<Calendar />}
          color="blue"
        />

        <StatCard
          title="Net Revenue"
          className="py-6"
          value={money(stats.vendorRevenue.thisYear)}
          change={stats.vendorRevenue.yearChange}
          icon={<CardPay />}
          color="green"
        />

        <StatCard
          title="Platform Revenue"
          className="py-6"
          value={money(stats.platformRevenue.thisYear)}
          change={stats.platformRevenue.yearChange}
          icon={<Cash2 className="text-[#9333EA]" />}
          color="purple"
        />

        <StatCard
          title="Paystack Fees"
          className="py-6"
          value={money(stats.paystackFees.thisYear)}
          change={stats.paystackFees.yearChange}
          icon={<Cash2 className="text-[#F59E0B]" />}
          color="orange"
        />

        <StatCard
          title="Completed Payments"
          className="py-6"
          value={stats.payments.completed.thisWeek.toLocaleString()}
          change={stats.payments.completed.change}
          icon={<CardPay />}
          color="green"
        />

        <StatCard
          title="Pending Payments"
          className="py-6"
          value={stats.payments.pending.thisWeek.toLocaleString()}
          change={stats.payments.pending.change}
          icon={<Cash2 className="text-[#EF4444]" />}
          color="red"
        />

      </div>

    </div>
  );
};

export default PaymentStats;