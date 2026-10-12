import {
  Users,
  UserPlus,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import {
  Wallet,
  Building2,
  Landmark,
  CreditCard,
  CheckCircle2,
  Clock3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatCard } from '@/components/Statcard';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDashboardKPIs,
  getRecentTransactions,
  getRevenueTrends,
  getTodaysReservations,
  getTopVendors,
  getTopVendorEarnings,
  getVendorsEarnings,
  getUpcomingReservations,
  getBookingTrends,
  getCustomerFrequency,
  getRevenueByCategory,
  getReservationSources,
  getUsers,
} from '@/services/admin.service';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { toast } from 'sonner';
import { paymentService } from '@/services/payment.service';
import PaymentStatCard from '@/pages/admin/payments/components/PaymentStatCart';
import AdminEarningTrends from "@/pages/admin/payments/components/AdminEarningTrends";

export default function Dashboard() {
  const navigate = useNavigate();

  const formatNaira = (n: any) => {
    const num = Number(n || 0);
    return `₦${num.toLocaleString()}`;
  };

  const { subscribe, unsubscribe, connected } = useWebSocket();

  const [kpis, setKpis] = useState<any>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [todaysReservations, setTodaysReservations] = useState<any[]>([]);
  const [topVendors, setTopVendors] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting'>(
    'connecting'
  );

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
        console.log('==============================')
        console.log(res)
      } catch (error) {
        toast.error(
          error?.response?.data?.message ??
            'Unable to load payment statistics'
        );
      } finally {
        setLoading(false);
      }
    };
  useEffect(() => {
    const fetchInitialData = () => {
      Promise.all([
        fetchStats(),
        fetchRevenueTrends(),
        fetchTodaysReservations(),
        fetchTransactions(),
        fetchTotalUsers(),
      ]);
      fetchTopVendors();
    };
    fetchInitialData();

    // Poll dashboard data periodically as a fallback for realtime updates
    const polling = setInterval(() => {
      fetchStats();
      fetchTotalUsers();
      fetchTodaysReservations();
      fetchTopVendors();
      fetchRevenueTrends();
    }, 30000);

    return () => clearInterval(polling);
  }, []);

  useEffect(() => {
    if (connected) {
      setWsStatus('connected');
      subscribe('new-reservation', (data: any) => {
        console.log('New reservation received via WebSocket:', data);
        refreshDashboard();
      });
      subscribe('new-transaction', (data: any) => {
        console.log('New transaction received via WebSocket:', data);
        refreshDashboard();
      });
    } else {
      setWsStatus('disconnected');
    }

    return () => {
      unsubscribe('new-reservation');
      unsubscribe('new-transaction');
    };
  }, [connected, subscribe, unsubscribe]);

  const fetchRevenueTrends = async () => {
    try {
      const rev = await getRevenueTrends();
      setRevenueTrends(Array.isArray(rev?.data) ? rev.data : []);
    } catch (err) {
      console.error('Failed to load revenue trends', err);
    }
  };

  const fetchTodaysReservations = async () => {
    try {
      const today = await getTodaysReservations();
      const normalizeRes = (r: any) => ({
        name: r.customerName || r.user?.name || r.guestName || 'Guest',
        id: r.id || r._id || r.reference || '',
        date: r.date || r.checkInDate || r.createdAt || '',
        time: r.time || r.checkInTime || '',
        venue: r.vendorName || r.vendor?.businessName || r.businessName || '',
        status: r.status || r.reservationStatus || '',
      });
      setTodaysReservations(Array.isArray(today?.data) ? today.data.map(normalizeRes) : []);
    } catch (err) {
      console.error("Failed to load today's reservations", err);
    }
  };

  const fetchTopVendors = async () => {
    try {
      console.log('[Dashboard] Fetching top vendor earnings...');
      // Use the correct endpoint for top performing vendors
      const tv = await getTopVendorEarnings({ page: 1, limit: 10 });
      console.log('[Dashboard] Top vendors response:', tv);

      // Handle the new response format from /payments/vendors-earnings
      // Response format: { earnings: [...], pagination: {...} }
      let vendors = [];
      if (tv?.data?.earnings && Array.isArray(tv.data.earnings)) {
        // Transform the data to match the UI expectations
        vendors = tv.data.earnings.map((v: any) => ({
          businessName: v.vendorName,
          name: v.vendorName,
          totalRevenue: v.totalEarnings,
          revenue: v.totalEarnings,
          totalReservations: v.totalPayments,
          bookings: v.totalPayments,
          vendorId: v.vendorId,
          lastPaymentDate: v.lastPaymentDate,
        }));
      } else if (tv?.data?.data && Array.isArray(tv.data.data)) {
        vendors = tv.data.data;
      } else if (tv?.data && Array.isArray(tv.data)) {
        vendors = tv.data;
      } else if (Array.isArray(tv)) {
        vendors = tv;
      }

      setTopVendors(vendors);
      console.log('[Dashboard] Top vendors set:', vendors.length);
    } catch (err) {
      console.error('[Dashboard] Failed to load top vendors', err);
      // Fallback to old endpoint if new one fails
      try {
        const fallback = await getTopVendors();
        let vendors = [];
        if (fallback?.data?.data && Array.isArray(fallback.data.data)) {
          vendors = fallback.data.data;
        } else if (fallback?.data && Array.isArray(fallback.data)) {
          vendors = fallback.data;
        }
        setTopVendors(vendors);
      } catch (fallbackErr) {
        console.error('[Dashboard] Fallback also failed', fallbackErr);
      }
    }
  };

  const fetchTotalUsers = async () => {
    try {
      // Fetch users with a small limit to get total count from response metadata
      const res = await getUsers({ page: 1, limit: 10 });
      const payload = res?.data || {};
      // Try common shapes for total count
      const total =
        payload?.total ||
        payload?.totalDocs ||
        payload?.totalUsers ||
        payload?.count ||
        payload?.meta?.total ||
        res?.data?.data?.total ||
        null;
      // Some APIs return counts in headers (e.g. x-total-count)
      const headerCount = res?.headers?.['x-total-count'] || res?.headers?.['X-Total-Count'];
      const parsedHeader = headerCount ? Number(headerCount) : null;
      if (total != null || parsedHeader != null) {
        const finalTotal = Number(total ?? parsedHeader);
        setTotalUsers(finalTotal);
        console.log('Total users fetched:', finalTotal);
      } else {
        // Don't set if total not provided, fall back to KPIs
        console.log('Total users not provided in response, using KPIs');
      }
    } catch (err) {
      console.error('Failed to load total users', err);
      // Don't set to 0, keep null to fall back to KPIs
    }
  };

  const fetchTransactions = async () => {
    try {
      const tx = await getRecentTransactions();
      const normalizeTx = (t: any) => ({
        id: t.id || '',
        type: t.type || 'vendor',
        amount: t.amount || 0,
        status: t.status || 'Pending',
        createdAt: t.createdAt || '',
        guest: t.guest || null,
        entity: t.entity || '',
        method: t.method || 'bank_transfer',
      });
      setTransactions(Array.isArray(tx?.data) ? tx.data.map(normalizeTx) : []);
    } catch (err) {
      console.error('Failed to load transactions', err);
    }
  };

  const refreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchTotalUsers(),
        fetchTransactions(),
        fetchRevenueTrends(),
        fetchTodaysReservations(),
        fetchTopVendors(),
      ]);
    } catch (err) {
      console.error('Failed to refresh dashboard', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    const handleUserCreated = (payload?: any) => {
      // optimistic increment for immediate UX
      setTotalUsers((prev) => (Number(prev) || 0) + 1);
      fetchStats();
      // if payload contains authoritative count, use it
      if (payload && (payload.total || payload.count || payload.totalUsers)) {
        const t = payload.total ?? payload.count ?? payload.totalUsers;
        setTotalUsers(Number(t));
      }
    };

    const handleUserDeleted = (payload?: any) => {
      setTotalUsers((prev) => Math.max(0, (Number(prev) || 0) - 1));
      fetchStats();
      if (payload && (payload.total || payload.count || payload.totalUsers)) {
        const t = payload.total ?? payload.count ?? payload.totalUsers;
        setTotalUsers(Number(t));
      }
    };

    const handleUserUpdated = (updatedUser: any) => {
      // If user status changes from active to inactive or vice versa, refetch totals
      fetchStats();
      fetchTotalUsers();
    };

    const handleUserCountUpdated = (data: any) => {
      // some backends emit an explicit count update
      const t = data?.total || data?.count || data?.totalUsers || null;
      if (t != null) setTotalUsers(Number(t));
    };

    const handlePayoutUpdate = (payout: any) => {
      // Payouts might affect pending payments or revenue
      fetchStats();
    };

    const handleReservationCreated = (reservation: any) => {
      const today = new Date().toISOString().split('T')[0];
      if (reservation.date === today || reservation.checkInDate === today) {
        fetchTodaysReservations();
      }
      fetchStats(); // Update totalBookings
      fetchTransactions(); // Update recent transactions
      fetchTopVendors(); // Update top vendors when new reservations are created
    };

    const handleReservationUpdated = (reservation: any) => {
      fetchTodaysReservations();
      fetchStats();
      fetchTransactions();
      fetchTopVendors(); // Update top vendors when reservations are updated
    };

    const handleReservationDeleted = (reservation: any) => {
      fetchTodaysReservations();
      fetchStats(); // Update totalBookings
      fetchTransactions();
      fetchTopVendors(); // Update top vendors when reservations are deleted
    };

    const handlePaymentCreated = (payment: any) => {
      fetchStats();
      fetchTransactions();
      fetchRevenueTrends();
    };

    const handlePaymentUpdated = (payment: any) => {
      fetchStats();
      fetchTransactions();
      fetchRevenueTrends();
    };

    const handleVendorUpdated = (vendor: any) => {
      fetchTopVendors();
    };

    // Additional events for real-time updates
    const handleReservationStatusChanged = (reservation: any) => {
      // Update today's reservations and top vendors when reservation status changes
      fetchTodaysReservations();
      fetchTopVendors();
      fetchStats();
    };

    const handlePayoutProcessed = (payout: any) => {
      // Update revenue trends and KPIs when payouts are processed
      fetchRevenueTrends();
      fetchStats();
      fetchTransactions();
    };

    const handleVendorEarningsUpdated = (data: any) => {
      // Update top vendors when earnings change
      fetchTopVendors();
      fetchRevenueTrends();
    };

    subscribe('user-created', handleUserCreated);
    subscribe('user-deleted', handleUserDeleted);
    subscribe('user-updated', handleUserUpdated);
    subscribe('user-count-updated', handleUserCountUpdated);
    subscribe('payout_update', handlePayoutUpdate);
    subscribe('payout-processed', handlePayoutProcessed);
    subscribe('reservation-created', handleReservationCreated);
    subscribe('reservation-updated', handleReservationUpdated);
    subscribe('reservation-deleted', handleReservationDeleted);
    subscribe('reservation-status-changed', handleReservationStatusChanged);
    subscribe('payment-created', handlePaymentCreated);
    subscribe('payment-updated', handlePaymentUpdated);
    subscribe('vendor-updated', handleVendorUpdated);
    subscribe('vendor-earnings-updated', handleVendorEarningsUpdated);

    return () => {
      unsubscribe('user-created');
      unsubscribe('user-deleted');
      unsubscribe('user-updated');
      unsubscribe('user-count-updated');
      unsubscribe('payout_update');
      unsubscribe('payout-processed');
      unsubscribe('reservation-created');
      unsubscribe('reservation-updated');
      unsubscribe('reservation-deleted');
      unsubscribe('reservation-status-changed');
      unsubscribe('payment-created');
      unsubscribe('payment-updated');
      unsubscribe('vendor-updated');
      unsubscribe('vendor-earnings-updated');
    };
  }, [subscribe, unsubscribe]);

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const trendList = Array.isArray(revenueTrends) ? revenueTrends : [];
  const chartData = trendList.map((r: any) => ({
    label:
      months[(r._id?.month ?? r.month ?? 1) - 1] +
      ` ${r._id?.year ?? r.year ?? new Date().getFullYear()}`,
    value: Number(r.total ?? r.totalRevenue ?? r.revenue ?? 0),
  }));
  const recent = chartData.slice(-8);
  const maxVal = Math.max(1, ...recent.map((d) => Number(d.value) || 0));
  const lastRevenue = recent.length ? recent[recent.length - 1].value : 0;
  const prevRevenue = recent.length > 1 ? recent[recent.length - 2].value : 0;
  const pctChange = prevRevenue ? ((lastRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const trendUp = pctChange >= 0;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Welcome Back, Admin!"
        subtitle="Here's what is happening today."
        actions={
          <button
            type="button"
            onClick={refreshDashboard}
            disabled={isRefreshing}
            className="type-res-small inline-flex cursor-pointer items-center gap-2 rounded-full bg-res-card px-4 py-2.5 font-semibold text-res-ink shadow-res-low transition-all outline-none hover:text-res-brand hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {
          stats && (
            <>
            
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
            </>
          )
        }

      </div>

        <AdminEarningTrends />

      <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-res-surface rounded-res-sm flex items-center justify-center">
              <Users className="w-5 h-5 text-res-brand" />
            </div>
            <div>
              <CardTitle className="type-res-h2 text-res-ink">
                Today's Reservations
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-res-accent rounded-full animate-pulse"></div>
                <span className="type-res-small font-medium text-res-ink-muted">
                  Live Updates
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="type-res-small inline-flex cursor-pointer items-center gap-1 rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
            onClick={() => navigate('/dashboard/admin/reservations')}
          >
            View All <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-4">
            {todaysReservations.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-res-ink-muted mx-auto mb-3" />
                <p className="type-res-small text-res-ink-muted">
                  No reservations for today
                </p>
              </div>
            ) : (
              todaysReservations.slice(0, 5).map((res, i) => (
                <div
                  key={i}
                  className="rounded-res-md border border-res-line bg-res-surface p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-12 h-12 ring-2 ring-res-line">
                          <AvatarImage src="" alt={res.name} className="" />
                          <AvatarFallback className="bg-res-brand text-res-ink-inverted font-semibold">
                            {res.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-res-accent rounded-full border-2 border-res-card"></div>
                      </div>
                      <div>
                        <p className="font-semibold text-res-ink">{res.name}</p>
                        <p className="type-res-small text-res-ink-muted">ID: {res.id}</p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="type-res-small font-medium text-res-ink">
                        {res.date}
                      </p>
                      <p className="type-res-small text-res-ink-muted">{res.time}</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="type-res-small font-medium text-res-ink">
                        {res.venue}
                      </p>
                    </div>
                    <Badge
                      variant={
                        res.status === 'Active' || res.status === 'Confirmed'
                          ? 'default'
                          : 'secondary'
                      }
                      className={`rounded-full px-3 py-1 type-res-small font-semibold ${
                        res.status === 'Active' || res.status === 'Confirmed'
                          ? 'bg-res-brand text-res-ink-inverted'
                          : 'bg-res-surface text-res-ink-muted'
                      }`}
                    >
                      {res.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-res-surface rounded-res-sm flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-res-brand" />
            </div>
            <div>
              <CardTitle className="type-res-h2 text-res-ink">
                Top Performing Vendors
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-res-accent rounded-full animate-pulse"></div>
                <span className="type-res-small font-medium text-res-ink-muted">
                  Real-time Performance
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="type-res-small px-3 py-1 rounded-full bg-res-surface text-res-ink-muted font-medium">
              Monthly
            </span>
            <button
              type="button"
              className="type-res-small inline-flex cursor-pointer items-center gap-1 rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
              onClick={() => navigate('/dashboard/admin/vendors')}
            >
              View All <ExternalLink className="w-3 h-3 ml-1" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-4">
            {topVendors.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-res-ink-muted mx-auto mb-3" />
                <p className="type-res-small text-res-ink-muted">
                  No vendor performance data available
                </p>
              </div>
            ) : (
              topVendors.slice(0, 5).map((vendor, i) => (
                <div
                  key={i}
                  className="rounded-res-md border border-res-line bg-res-surface p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-res-brand rounded-full flex items-center justify-center text-res-ink-inverted font-bold text-lg">
                          {(vendor.businessName || vendor.name || 'V')[0].toUpperCase()}
                        </div>
                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-res-ink rounded-full flex items-center justify-center text-xs font-bold text-res-ink-inverted">
                          {i + 1}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-res-ink">
                          {vendor.businessName || vendor.name || 'Vendor'}
                        </p>
                        <p className="type-res-small text-res-ink-muted">
                          {vendor.vendorType || vendor.type || 'Business'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="type-res-small font-medium text-res-ink">
                        {vendor.totalReservations || vendor.bookings || '0'} Bookings
                      </p>
                      <p className="type-res-small text-res-ink-muted">Total Bookings</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-lg font-bold text-res-brand">
                        ₦{Number(vendor.totalRevenue || vendor.revenue || 0).toLocaleString()}
                      </p>
                      <p className="type-res-small text-res-ink-muted">Revenue</p>
                    </div>
                    <Badge
                      variant="default"
                      className="rounded-full px-3 py-1 type-res-small font-semibold bg-res-brand text-res-ink-inverted"
                    >
                      Active
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
