import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  ReservationDrawer,
  ReservationFilters,
  ReservationStatCards,
  ReservationTable,
  useCancelReservation,
  useCheckInReservation,
  useCheckOutReservation,
  useReservationCounters,
  useReservations,
} from '@/features/reservations';
import type { ReservationFilterParams, ReservationView } from '@/features/reservations';

const AdminReservations = () => {
  const [filters, setFilters] = useState<ReservationFilterParams>({ page: 1, limit: 20 });
  const [selected, setSelected] = useState<ReservationView | null>(null);

  const reservationsQuery = useReservations(filters);
  const countersQuery = useReservationCounters({ vendorId: filters.vendorId });
  const cancelMutation = useCancelReservation();
  const checkInMutation = useCheckInReservation();
  const checkOutMutation = useCheckOutReservation();

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

  const goToPage = (page: number) => setFilters((prev) => ({ ...prev, page }));

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Reservations</h1>
        <p className="mt-1 text-sm text-gray-500">
          All unit reservations across vendors.
        </p>
      </div>

      <ReservationStatCards counters={countersQuery.data} loading={countersQuery.isLoading} />

      <ReservationFilters value={filters} onChange={setFilters} showVendor />

      <ReservationTable
        items={items}
        role="admin"
        loading={reservationsQuery.isLoading}
        onView={setSelected}
        onCancel={handleCancel}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
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
              onClick={() => goToPage(data.page - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={data.page >= data.pages}
              onClick={() => goToPage(data.page + 1)}
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
    </div>
  );
};

export default AdminReservations;
