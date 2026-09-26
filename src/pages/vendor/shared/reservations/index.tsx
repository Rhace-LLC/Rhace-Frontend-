import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  ReservationDrawer,
  ReservationFilters,
  ReservationStatCards,
  ReservationTable,
  outstanding,
  reservationKeys,
  useCancelReservation,
  useCheckInReservation,
  useCheckOutReservation,
  useReservationCounters,
  useReservations,
} from '@/features/reservations';
import type { ReservationFilterParams, ReservationView } from '@/features/reservations';
import RecordOfflinePaymentModal from '@/pages/vendor/shared/payments/RecordOfflinePayment';

type Vertical = 'hotel' | 'club' | 'restaurant';

const TIMELINE_PATH: Record<Vertical, string> = {
  hotel: '/dashboard/hotel/timeline/prototype',
  club: '/dashboard/club/timeline/prototype',
  restaurant: '/dashboard/restaurant/timeline/prototype',
};

const TITLE: Record<Vertical, string> = {
  hotel: 'Hotel bookings',
  club: 'Club reservations',
  restaurant: 'Restaurant reservations',
};

function bookingLabel(reservation: ReservationView): string {
  const option = reservation.blueprintName ?? reservation.unitLabel ?? '';
  const spot =
    reservation.unitLabel && reservation.unitLabel !== reservation.blueprintName
      ? ` · ${reservation.vertical === 'hotel' ? 'Room' : 'Table'} ${reservation.unitLabel}`
      : '';
  return `${reservation.guestName}${option ? ` · ${option}` : ''}${spot}`;
}

export function VendorReservationsPage({ vertical }: { vertical: Vertical }) {
  const [filters, setFilters] = useState<ReservationFilterParams>({ page: 1, limit: 20 });
  const [selected, setSelected] = useState<ReservationView | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<ReservationView | null>(null);

  const reservationsQuery = useReservations(filters);
  const countersQuery = useReservationCounters({ vertical });
  const cancelMutation = useCancelReservation();
  const checkInMutation = useCheckInReservation();
  const checkOutMutation = useCheckOutReservation();
  const queryClient = useQueryClient();

  const data = reservationsQuery.data;
  const items = useMemo(() => data?.items ?? [], [data]);

  const handleCancel = async (reservation: ReservationView) => {
    try {
      await cancelMutation.mutateAsync(reservation._id);
      toast.success('Reservation cancelled');
      setSelected(null);
    } catch {
      toast.error('Could not cancel the reservation.');
    }
  };

  const handleCheckIn = async (reservation: ReservationView) => {
    try {
      await checkInMutation.mutateAsync(reservation._id);
      toast.success('Checked in');
    } catch {
      toast.error('Could not check in.');
    }
  };

  const handleCheckOut = async (reservation: ReservationView) => {
    try {
      await checkOutMutation.mutateAsync(reservation._id);
      toast.success('Checked out');
    } catch {
      toast.error('Could not check out.');
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="type-res-h2 text-res-ink">{TITLE[vertical]}</h1>
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">
            Manage check-ins, payments and cancellations.
          </p>
        </div>
        <Link
          to={TIMELINE_PATH[vertical]}
          className="type-res-small rounded-full bg-res-card px-4 py-2.5 font-semibold text-res-ink shadow-res-low transition-all hover:text-res-brand hover:shadow-res-medium"
        >
          View timeline
        </Link>
      </div>

      <ReservationStatCards counters={countersQuery.data} loading={countersQuery.isLoading} />

      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <ReservationFilters value={filters} onChange={setFilters} />
        <div className="mt-4">
          <ReservationTable
            items={items}
            role="vendor"
            loading={reservationsQuery.isLoading}
            onView={setSelected}
            onCancel={handleCancel}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onRecordOffline={setPaymentTarget}
          />
        </div>

        {data && data.pages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="type-res-small font-normal text-res-ink-muted">
              Page {data.page} of {data.pages} · {data.total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: data.page - 1 }))}
                className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors hover:text-res-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={data.page >= data.pages}
                onClick={() => setFilters((prev) => ({ ...prev, page: data.page + 1 }))}
                className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors hover:text-res-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <ReservationDrawer
        open={!!selected}
        reservation={selected}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <>
              {selected.status === 'upcoming' && (
                <button
                  type="button"
                  onClick={() => handleCheckIn(selected)}
                  className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                >
                  Check in
                </button>
              )}
              {selected.status === 'active' && (
                <button
                  type="button"
                  onClick={() => handleCheckOut(selected)}
                  className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                >
                  Check out
                </button>
              )}
              {selected.bookingGroup && outstanding(selected) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setPaymentTarget(selected);
                  }}
                  className="type-res-small cursor-pointer rounded-full bg-res-surface px-5 py-2.5 font-semibold text-res-ink transition-colors hover:text-res-brand"
                >
                  Record payment
                </button>
              )}
              {['pending_payment', 'upcoming'].includes(selected.status) && (
                <button
                  type="button"
                  onClick={() => handleCancel(selected)}
                  className="type-res-small cursor-pointer rounded-full px-4 py-2.5 font-semibold text-res-ink-muted transition-colors hover:text-res-ink"
                >
                  Cancel reservation
                </button>
              )}
            </>
          ) : null
        }
      />

      <RecordOfflinePaymentModal
        isOpen={!!paymentTarget}
        groupId={paymentTarget?.bookingGroup ?? undefined}
        bookingLabel={paymentTarget ? bookingLabel(paymentTarget) : undefined}
        dueAmount={paymentTarget ? outstanding(paymentTarget) : undefined}
        onClose={() => setPaymentTarget(null)}
        onSuccess={() => {
          toast.success('Payment recorded');
          queryClient.invalidateQueries({ queryKey: reservationKeys.all });
        }}
      />
    </div>
  );
}

export default VendorReservationsPage;
