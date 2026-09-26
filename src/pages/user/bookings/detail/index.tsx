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

function DetailCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-res-sm bg-res-surface p-3">
      <dt className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
        {label}
      </dt>
      <dd className="type-res-body mt-1 font-semibold text-res-ink">{value}</dd>
    </div>
  );
}

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
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string; paystackError?: string } } })?.response
          ?.data?.paystackError ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not start payment. Please try again.';
      toast.error(message);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    try {
      await cancelMutation.mutateAsync(reservation._id);
      toast.success('Booking cancelled');
      navigate('/bookings');
    } catch {
      toast.error('Could not cancel your booking.');
    }
  };

  const isRoom = reservation?.vertical === 'hotel';
  const spotKind = isRoom ? 'Room' : 'Table';

  return (
    <div className="min-h-screen bg-res-surface">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto mb-[120px] max-w-3xl space-y-5 px-4 pt-4 pb-8 md:mt-[85px] md:mb-8 md:px-6 md:py-8 lg:px-8">
        <div>
          <Link
            to="/bookings"
            className="type-res-small font-medium text-res-ink-muted hover:text-res-brand"
          >
            ← Back to my bookings
          </Link>
        </div>

        {reservationQuery.isLoading ? (
          <div className="h-64 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
        ) : !reservation ? (
          <div className="rounded-res-lg bg-res-card px-6 py-16 text-center shadow-res-low">
            <p className="type-res-h3 text-res-ink">Booking not found</p>
            <p className="type-res-small mt-1 text-res-ink-muted">
              This booking may have been removed.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-res-lg bg-res-card p-5 shadow-res-low md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                    {reservation.vendorName ?? 'Booking'}
                  </p>
                  <h1 className="type-res-h2 mt-1 text-res-ink">
                    {reservation.blueprintName ?? reservation.unitLabel ?? 'Booking'}
                  </h1>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <ReservationStatusBadge status={reservation.status} />
                  <PaymentStatusBadge
                    status={reservation.group?.paymentStatus ?? reservation.paymentStatus}
                  />
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <DetailCell label="Name" value={reservation.guestName} />
                <DetailCell
                  label={spotKind}
                  value={
                    reservation.unitLabel
                      ? `${spotKind} ${reservation.unitLabel}`
                      : (reservation.blueprintName ?? '—')
                  }
                />
                <DetailCell
                  label="Date & time"
                  value={formatRange(reservation.start, reservation.end)}
                />
                <DetailCell label="Guests" value={reservation.partySize ?? '—'} />
                <DetailCell
                  label="Total"
                  value={money(reservation.group?.totalAmount ?? reservation.amount)}
                />
                <DetailCell label="Still to pay" value={money(outstanding(reservation))} />
              </dl>
            </section>

            <div className="flex flex-col justify-end gap-2.5 sm:flex-row">
              {outstanding(reservation) > 0 && reservation.bookingGroup && (
                <button
                  type="button"
                  onClick={handlePayBalance}
                  className="type-res-body cursor-pointer rounded-full bg-res-brand px-6 py-3 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                >
                  Pay {money(outstanding(reservation))} now
                </button>
              )}
              {['pending_payment', 'upcoming'].includes(reservation.status) && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="type-res-body cursor-pointer rounded-full bg-res-card px-6 py-3 font-semibold text-res-ink-muted shadow-res-low transition-colors hover:text-res-ink"
                >
                  Cancel booking
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default BookingDetails;
