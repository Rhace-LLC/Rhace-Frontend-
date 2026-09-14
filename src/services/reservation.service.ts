import api from '@/lib/axios';

const REVENUE_COLORS = [
  'bg-teal-500',
  'bg-blue-500',
  'bg-amber-400',
  'bg-purple-400',
  'bg-rose-400',
  'bg-emerald-500',
];

const capitalize = (value?: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

interface RevenueCategory {
  name: string;
  amount: number;
}

interface SourceBlock {
  total: number;
  sources: { label: string; count: number }[];
}

const toRevenue = (categories: RevenueCategory[]) => {
  const total = categories.reduce((sum, category) => sum + category.amount, 0);
  return {
    items: categories.map((category, index) => ({
      category: category.name,
      amount: category.amount,
      percentage: Number((total ? (category.amount / total) * 100 : 0).toFixed(1)),
      color: REVENUE_COLORS[index % REVENUE_COLORS.length],
    })),
    total,
    change: 0,
  };
};

const toSource = (block?: SourceBlock) => {
  const total = block?.total ?? 0;
  return {
    total,
    sources: (block?.sources ?? []).map((source) => ({
      name: source.label,
      count: source.count,
      value: total ? Number(((source.count / total) * 100).toFixed(1)) : 0,
    })),
  };
};

/**
 * Vendor dashboard summary. Reads the unit engine (`GET /dashboard/unit-summary`)
 * and maps it onto the shape the existing dashboard components consume.
 */
class ReservationService {
  async getSummary() {
    const res = await api.get('/dashboard/unit-summary');
    const data: any = res.data?.data ?? {};
    const trends = data.reservationTrends ?? {};
    const categories: RevenueCategory[] = data.revenueByCategory ?? [];

    return {
      data: {
        todayStats: data.todayStats ?? [],
        todaysReservations: (data.todaysReservations ?? []).map((reservation: any) => ({
          ...reservation,
          customerName: reservation.guestName,
          guests: reservation.partySize,
          reservationStatus: capitalize(reservation.status),
          date: reservation.start,
          createdAt: reservation.createdAt ?? reservation.start,
        })),
        reservationTrends: {
          weekly: (trends.weekly ?? []).map((point: any) => ({
            day: point.label,
            thisWeek: point.count,
            lastWeek: point.previous ?? 0,
          })),
          monthly: (trends.monthly ?? []).map((point: any) => ({
            day: point.label,
            thisWeek: point.count,
            lastWeek: point.previous ?? 0,
          })),
          trendChange: trends.trendChange ?? 0,
        },
        revenueData: {
          weekly: toRevenue(categories),
          monthly: toRevenue(categories),
        },
        reservationSource: {
          weekly: toSource(data.reservationSource?.weekly),
          monthly: toSource(data.reservationSource?.monthly),
        },
        customerFrequency: data.customerFrequency ?? { new: 0, returning: 0 },
        hotelRoomsBreakdown: data.hotelRoomsBreakdown ?? [],
        restaurantMenuBreakdown: data.restaurantMenuBreakdown ?? [],
        clubDrinksBreakdown: data.clubDrinksBreakdown ?? [],
        clubCombosBreakdown: data.clubCombosBreakdown ?? [],
      },
    };
  }

  async getReservationCounters() {
    const res = await api.get('/reservations/unit/counters');
    return res.data;
  }
}

export const reservationService = new ReservationService();
