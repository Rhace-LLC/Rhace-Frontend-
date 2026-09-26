import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import { CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import { paymentService } from '@/services/payment.service';
import { unitReservationService } from '@/services/unitReservation.service';
import { useOrderByReservation } from '@/features/orders';
import type { UnitReservationDto } from '@/types';

const PAYMENT_LABEL: Record<string, string> = {
  paid: 'Paid',
  partly_paid: 'Partly paid',
  pay_later: 'Pay at venue',
  unpaid: 'Unpaid',
};

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

const ConfirmationPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initial = (location.state as { reservation?: UnitReservationDto } | null)?.reservation;

  const [reservation, setReservation] = useState<UnitReservationDto | undefined>(initial);
  const [finalizing, setFinalizing] = useState(false);
  const orderQuery = useOrderByReservation(id);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) return;

    let active = true;
    setFinalizing(true);

    paymentService
      .verifyPayment(reference)
      .then(() => (id ? unitReservationService.getMine(id) : undefined))
      .then((res) => {
        if (active && res?.data) setReservation(res.data);
      })
      .catch(() => {
        if (active) {
          toast.error('We could not confirm your payment yet. It may still be processing.');
        }
      })
      .finally(() => {
        if (active) setFinalizing(false);
      });

    return () => {
      active = false;
    };
  }, [id, searchParams]);

  const awaitingPayment = reservation?.status === 'pending_payment';

  return (
    <div className="min-h-screen bg-res-surface">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto mb-[120px] max-w-3xl px-4 pt-4 pb-8 md:mt-[85px] md:py-12">
        <div className="rounded-res-lg bg-res-card p-6 text-center shadow-res-low md:p-8">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              awaitingPayment ? 'bg-res-surface' : 'bg-res-secondary'
            }`}
          >
            {awaitingPayment ? (
              <Clock className="h-8 w-8 text-res-brand" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-res-brand" />
            )}
          </div>
          <div className="flex justify-center">
            <span
              className={`type-res-small rounded-full px-3 py-1 font-semibold ${
                awaitingPayment
                  ? 'bg-res-surface text-res-ink-muted'
                  : 'bg-res-secondary text-res-brand'
              }`}
            >
              {finalizing
                ? 'Finalizing…'
                : awaitingPayment
                  ? 'Awaiting payment'
                  : 'Confirmed'}
            </span>
          </div>
          <h1 className="type-res-h2 mt-3 text-res-ink">
            {awaitingPayment ? 'Complete your payment' : 'Reservation confirmed'}
          </h1>
          <p className="type-res-body mx-auto mt-2 max-w-md font-normal text-res-ink-muted">
            {finalizing
              ? 'Finalizing your payment…'
              : awaitingPayment
                ? 'Your unit is held. Complete payment to confirm your booking.'
                : 'Your booking is confirmed.'}{' '}
            Booking ref <span className="font-mono font-semibold text-res-ink">{id}</span>.
          </p>

          {reservation && (
            <dl className="mx-auto mt-6 grid grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
              <DetailCell label="Guest" value={reservation.guestName} />
              <DetailCell label="Party size" value={reservation.partySize ?? '—'} />
              <DetailCell
                label="From"
                value={new Date(reservation.start).toLocaleString()}
              />
              <DetailCell label="To" value={new Date(reservation.end).toLocaleString()} />
              <DetailCell
                label="Status"
                value={
                  <span className="capitalize">
                    {reservation.status.replace('_', ' ')}
                  </span>
                }
              />
              {typeof reservation.amount === 'number' && reservation.amount > 0 && (
                <DetailCell
                  label={reservation.vertical === 'hotel' ? 'Total' : 'Reservation deposit'}
                  value={
                    <>
                      ₦{reservation.amount.toLocaleString()}{' '}
                      <span className="type-res-small font-normal text-res-ink-muted">
                        {reservation.currency ?? 'NGN'}
                      </span>
                    </>
                  }
                />
              )}
              {reservation.paymentStatus && (
                <DetailCell
                  label="Payment"
                  value={
                    PAYMENT_LABEL[reservation.paymentStatus] ?? reservation.paymentStatus
                  }
                />
              )}
            </dl>
          )}

          {reservation && ['restaurant', 'club'].includes(String(reservation.vertical)) &&
            !orderQuery.data && (
              <div className="mt-5 rounded-res-md bg-res-secondary p-4 text-left">
                <p className="type-res-body font-semibold text-res-ink">
                  {reservation.vertical === 'club'
                    ? 'Want to pre-order your drinks?'
                    : 'Want to pre-order your meal?'}
                </p>
                <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                  Add items now and your table deposit is credited against the bill.
                </p>
                <Link
                  to={`/preorder/${reservation._id}`}
                  className="type-res-small mt-3 inline-block rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                >
                  {reservation.vertical === 'club' ? 'Pre-order drinks' : 'Pre-order a meal'}
                </Link>
              </div>
            )}

          <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Link
              to="/bookings"
              className="type-res-body rounded-full bg-res-brand px-6 py-3 text-center font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
            >
              My bookings
            </Link>
            <Link
              to="/"
              className="type-res-body rounded-full bg-res-surface px-6 py-3 text-center font-semibold text-res-ink transition-colors hover:text-res-brand"
            >
              Back home
            </Link>
          </div>
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default ConfirmationPage;
