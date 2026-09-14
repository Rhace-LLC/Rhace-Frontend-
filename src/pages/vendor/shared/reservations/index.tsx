import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  ReservationDrawer,
  ReservationFilters,
  ReservationStatCards,
  ReservationTable,
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

export function VendorReservationsPage({ vertical }: { vertical: Vertical }) {
  const [filters, setFilters] = useState<ReservationFilterParams>({ page: 1, limit: 20 });
  const [selected, setSelected] = useState<ReservationView | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<ReservationView | null>(null);

  const reservationsQuery = useReservations(filters);
  const countersQuery = useReservationCounters();
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
          <h1 className="text-xl font-semibold capitalize text-gray-900">
            {vertical} reservations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage check-ins, payments and cancellations.
          </p>
        </div>
        <Link
          to={TIMELINE_PATH[vertical]}
          className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:border-[#0A6C6D] hover:text-[#0A6C6D]"
        >
          View timeline
        </Link>
      </div>

      <ReservationStatCards counters={countersQuery.data} loading={countersQuery.isLoading} />

      <ReservationFilters value={filters} onChange={setFilters} />

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

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {data.page} of {data.pages} · {data.total} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: data.page - 1 }))}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={data.page >= data.pages}
              onClick={() => setFilters((prev) => ({ ...prev, page: data.page + 1 }))}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
                  className="rounded-lg bg-[#0A6C6D] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A6C6D]/90"
                >
                  Check in
                </button>
              )}
              {selected.status === 'active' && (
                <button
                  type="button"
                  onClick={() => handleCheckOut(selected)}
                  className="rounded-lg bg-[#0A6C6D] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A6C6D]/90"
                >
                  Check out
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

      <RecordOfflinePaymentModal
        isOpen={!!paymentTarget}
        groupId={paymentTarget?.bookingGroup ?? undefined}
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
