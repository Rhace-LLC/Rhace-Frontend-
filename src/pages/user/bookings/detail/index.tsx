import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import {
  PaymentStatusBadge,
  ReservationStatusBadge,
  formatRange,
  money,
  outstanding,
  useCancelMyReservation,
  useMyReservation,
  usePayBalance,
} from '@/features/reservations';

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reservationQuery = useMyReservation(id);
  const cancelMutation = useCancelMyReservation();
  const payMutation = usePayBalance();

  const reservation = reservationQuery.data;

  const handlePayBalance = async () => {
    if (!reservation?.bookingGroup) return;
    try {
      const res = await payMutation.mutateAsync({ groupId: reservation.bookingGroup });
      const url = res.data?.authorization_url;
      if (!url) throw new Error('Could not start payment');
      window.location.href = url;
    } catch {
      toast.error('Could not start payment. Please try again.');
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    try {
      await cancelMutation.mutateAsync(reservation._id);
      toast.success('Reservation cancelled');
      navigate('/bookings');
    } catch {
      toast.error('Could not cancel the reservation.');
    }
  };

  return (
    <>
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto md:mt-[85px] mb-[120px] md:mb-8 max-w-3xl md:px-6 lg:px-8 md:py-8">
        <div className="px-4 md:px-0">
          <Link to="/bookings" className="text-xs text-gray-500 hover:text-[#0A6C6D]">
            ← Back to reservations
          </Link>
        </div>

        {reservationQuery.isLoading ? (
          <div className="mt-4 h-64 animate-pulse rounded-2xl bg-gray-100" />
        ) : !reservation ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
            Reservation not found.
          </div>
        ) : (
          <div className="mt-4 space-y-4 px-4 md:px-0">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-semibold text-gray-900">
                  {reservation.blueprintName ?? 'Reservation'}
                </h1>
                <div className="flex gap-2">
                  <ReservationStatusBadge status={reservation.status} />
                  <PaymentStatusBadge
                    status={reservation.group?.paymentStatus ?? reservation.paymentStatus}
                  />
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Guest</dt>
                <dd className="text-gray-900">{reservation.guestName}</dd>
                <dt className="text-gray-500">Unit</dt>
                <dd className="text-gray-900">{reservation.unitLabel ?? '—'}</dd>
                <dt className="text-gray-500">When</dt>
                <dd className="text-gray-900">
                  {formatRange(reservation.start, reservation.end)}
                </dd>
                <dt className="text-gray-500">Party size</dt>
                <dd className="text-gray-900">{reservation.partySize ?? '—'}</dd>
                <dt className="text-gray-500">Total</dt>
                <dd className="text-gray-900">
                  {money(reservation.group?.totalAmount ?? reservation.amount)}
                </dd>
                <dt className="text-gray-500">Outstanding</dt>
                <dd className="text-gray-900">{money(outstanding(reservation))}</dd>
              </dl>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              {outstanding(reservation) > 0 && reservation.bookingGroup && (
                <button
                  type="button"
                  onClick={handlePayBalance}
                  className="rounded-xl bg-[#0A6C6D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0A6C6D]/90"
                >
                  Pay balance
                </button>
              )}
              {['pending_payment', 'upcoming'].includes(reservation.status) && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  Cancel reservation
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
};

export default BookingDetails;
