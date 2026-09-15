import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import { useOrderByReservation } from '@/features/orders';
import {
  ReservationDrawer,
  ReservationFilters,
  ReservationTable,
  bucketReservations,
  outstanding,
  useCancelMyReservation,
  useMyReservations,
  usePayBalance,
} from '@/features/reservations';
import type { ReservationFilterParams, ReservationView } from '@/features/reservations';

type Bucket = 'all' | 'today' | 'upcoming' | 'past';

const TABS: { id: Bucket; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
];

const UserBookingsPage = () => {
  const [filters, setFilters] = useState<ReservationFilterParams>({ limit: 100 });
  const [bucket, setBucket] = useState<Bucket>('all');
  const [selected, setSelected] = useState<ReservationView | null>(null);

  const reservationsQuery = useMyReservations(filters);
  const cancelMutation = useCancelMyReservation();
  const payMutation = usePayBalance();
  const selectedOrderQuery = useOrderByReservation(selected?._id, !!selected);

  const needsPreorder =
    Boolean(selected) &&
    ['restaurant', 'club'].includes(String(selected?.vertical)) &&
    !selectedOrderQuery.data;

  const items = useMemo(() => reservationsQuery.data?.items ?? [], [reservationsQuery.data]);
  const buckets = useMemo(() => bucketReservations(items), [items]);

  const visible = useMemo(() => {
    if (bucket === 'all') {
      return [...items].sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
      );
    }
    return buckets[bucket];
  }, [bucket, buckets, items]);

  const handlePayBalance = async (reservation: ReservationView) => {
    if (!reservation.bookingGroup) return;
    try {
      const res = await payMutation.mutateAsync({ groupId: reservation.bookingGroup });
      const url = res.data?.authorization_url;
      if (!url) throw new Error('Could not start payment');
      window.location.href = url;
    } catch {
      toast.error('Could not start payment. Please try again.');
    }
  };

  const handleCancel = async (reservation: ReservationView) => {
    try {
      await cancelMutation.mutateAsync(reservation._id);
      toast.success('Reservation cancelled');
      setSelected(null);
    } catch {
      toast.error('Could not cancel the reservation.');
    }
  };

  return (
    <>
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto md:mt-[85px] mb-[120px] md:mb-8 max-w-7xl md:px-6 lg:px-8 md:py-8">
        <div className="px-4 md:px-0">
          <h1 className="text-2xl font-semibold text-gray-900">My reservations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track upcoming stays, tables and bookings in one place.
          </p>
        </div>

        <div className="mt-5 space-y-4 px-4 md:px-0">
          <ReservationFilters value={filters} onChange={setFilters} />

          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const count = tab.id === 'all' ? items.length : buckets[tab.id].length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBucket(tab.id)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                    bucket === tab.id
                      ? 'border-[#0A6C6D] bg-[#0A6C6D]/5 text-[#0A6C6D]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-gray-400">{count}</span>
                </button>
              );
            })}
          </div>

          <ReservationTable
            items={visible}
            role="customer"
            loading={reservationsQuery.isLoading}
            onView={setSelected}
            onCancel={handleCancel}
            onPayBalance={handlePayBalance}
          />
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>

      <ReservationDrawer
        open={!!selected}
        reservation={selected}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <>
              {needsPreorder && (
                <Link
                  to={`/preorder/${selected._id}`}
                  className="rounded-lg bg-[#0A6C6D] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A6C6D]/90"
                >
                  {selected.vertical === 'club' ? 'Pre-order drinks' : 'Pre-order a meal'}
                </Link>
              )}
              {outstanding(selected) > 0 && selected.bookingGroup && (
                <button
                  type="button"
                  onClick={() => handlePayBalance(selected)}
                  className="rounded-lg bg-[#0A6C6D] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A6C6D]/90"
                >
                  Pay balance
                </button>
              )}
              {['pending_payment', 'upcoming'].includes(selected.status) && (
                <button
                  type="button"
                  onClick={() => handleCancel(selected)}
                  className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Cancel reservation
                </button>
              )}
            </>
          ) : null
        }
      />
    </>
  );
};

export default UserBookingsPage;
