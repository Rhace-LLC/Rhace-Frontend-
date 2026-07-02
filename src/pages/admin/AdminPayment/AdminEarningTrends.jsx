import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
} from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';

import { paymentService } from '@/services/payment.service';
import { toast } from 'react-toastify';

const metricOptions = [
  {
    label: 'Vendor Revenue',
    value: 'vendorRevenue',
  },
  {
    label: 'Gross Sales',
    value: 'sales',
  },
  {
    label: 'Platform Revenue',
    value: 'platformRevenue',
  },
  {
    label: 'Paystack Fees',
    value: 'paystackFees',
  },
];

const rangeOptions = [
  {
    label: 'Weekly',
    value: 'weekly',
  },
  {
    label: 'Monthly',
    value: 'monthly',
  },
  {
    label: 'Quarterly',
    value: 'quarterly',
  },
];

const chartConfig = {
  value: {
    label: 'Amount',
    color: 'var(--chart-1)',
  },
};

const AdminEarningTrends = () => {
  const [metric, setMetric] = useState('sales');
  const [range, setRange] = useState('weekly');

  const [loading, setLoading] = useState(false);

  const [trend, setTrend] = useState({
    range: '',
    trends: [],
    totals: {
      sales: 0,
      vendorRevenue: 0,
      platformRevenue: 0,
      paystackFees: 0,
    },
    percentChange: {
      sales: 0,
      vendorRevenue: 0,
      platformRevenue: 0,
      paystackFees: 0,
    },
  });

  const fetchTrend = async () => {
    try {
      setLoading(true);

      const res = await paymentService.getTrends({
        metric,
        range,
      });

      setTrend(res);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ??
          'Failed to fetch earnings trends'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrend();
  }, [metric, range]);

  const total =
    trend.totals?.[metric] ?? 0;

  const percent =
    trend.percentChange?.[
      metric
    ] ?? 0;

  const chartData = trend.trends.map((item) => ({
    ...item,
    value: item[metric] ?? 0,
  }));

  return (
    <div className="bg-white rounded-2xl border p-6">

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-lg font-semibold">
            Earnings Trends
          </h2>

          <p className="text-sm text-muted-foreground mt-1">
            Track payment performance across the platform.
          </p>
        </div>

        <div className="flex gap-3">

          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            {metricOptions.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            {rangeOptions.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>

        </div>

      </div>

      {loading ? (
        <div className="h-[320px] flex items-center justify-center">
          Loading...
        </div>
      ) : (
        <>
          <div className="mt-6">

            <h1 className="text-4xl font-bold">
              ₦{total.toLocaleString()}
            </h1>

            <p
              className={`mt-2 text-sm ${
                percent >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {percent >= 0 ? '▲' : '▼'}{' '}
              {Math.abs(percent).toFixed(2)}%
            </p>

          </div>

          <div className="mt-6">

            <ChartContainer
              id="admin-payment-trends"
              config={chartConfig}
              className="h-[320px] w-full"
            >
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} />

                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                />

                <ChartTooltip
                  formatter={(value) =>
                    `₦${Number(value).toLocaleString()}`
                  }
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0A6C6D"
                  fill="#0A6C6D"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ChartContainer>

          </div>
        </>
      )}
    </div>
  );
};

export default AdminEarningTrends;