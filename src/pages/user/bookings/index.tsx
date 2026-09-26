import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import { useOrderByReservation } from '@/features/orders';
import {
  ReservationCards,
  ReservationDrawer,
  ReservationFilters,
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
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string; paystackError?: string } } })?.response
          ?.data?.paystackError ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not start payment. Please try again.';
      toast.error(message);
    }
  };

  const handleCancel = async (reservation: ReservationView) => {
    try {
      await cancelMutation.mutateAsync(reservation._id);
      toast.success('Booking cancelled');
      setSelected(null);
    } catch {
      toast.error('Could not cancel your booking.');
    }
  };

  return (
    <div className="min-h-screen bg-res-surface">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto mb-[120px] max-w-7xl space-y-5 px-4 pt-4 pb-8 md:mt-[85px] md:mb-8 md:space-y-6 md:px-6 md:py-8 lg:px-8">
        <div>
          <h1 className="type-res-h2 text-res-ink">My bookings</h1>
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">
            All your table and room bookings in one place.
          </p>
        </div>

        <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
          <ReservationFilters value={filters} onChange={setFilters} />

          <div className="hide-scrollbar mt-4 -mx-1 overflow-x-auto px-1 py-1">
            <div
              role="tablist"
              aria-label="Filter bookings by time"
              className="flex w-full gap-1 rounded-res-md bg-res-surface p-1 sm:w-max sm:rounded-full"
            >
              {TABS.map((tab) => {
                const count = tab.id === 'all' ? items.length : buckets[tab.id].length;
                const isActive = bucket === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setBucket(tab.id)}
                    className={`type-res-body flex flex-1 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-res-brand sm:flex-none ${
                      isActive
                        ? 'bg-res-card text-res-brand shadow-res-low'
                        : 'text-res-ink-muted hover:text-res-ink'
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`type-res-small rounded-full px-1.5 font-semibold ${
                        isActive ? 'bg-res-surface text-res-ink-muted' : 'text-res-ink-muted'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <ReservationCards
              items={visible}
              loading={reservationsQuery.isLoading}
              onView={setSelected}
              onCancel={handleCancel}
              onPayBalance={handlePayBalance}
            />
          </div>
        </section>
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
                  className="type-res-small rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                >
                  {selected.vertical === 'club' ? 'Pre-order drinks' : 'Pre-order food'}
                </Link>
              )}
              {outstanding(selected) > 0 && selected.bookingGroup && (
                <button
                  type="button"
                  onClick={() => handlePayBalance(selected)}
                  className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                >
                  Pay now
                </button>
              )}
              {['pending_payment', 'upcoming'].includes(selected.status) && (
                <button
                  type="button"
                  onClick={() => handleCancel(selected)}
                  className="type-res-small cursor-pointer rounded-full px-4 py-2.5 font-semibold text-res-ink-muted transition-colors hover:text-res-ink"
                >
                  Cancel booking
                </button>
              )}
            </>
          ) : null
        }
      />
    </div>
  );
};

export default UserBookingsPage;
