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
    <>
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto md:mt-[85px] mb-[120px] md:py-12 max-w-3xl px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              awaitingPayment ? 'bg-amber-100' : 'bg-green-100'
            }`}
          >
            {awaitingPayment ? (
              <Clock className="h-8 w-8 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            )}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {awaitingPayment ? 'Complete your payment' : 'Reservation confirmed'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {finalizing
              ? 'Finalizing your payment…'
              : awaitingPayment
                ? 'Your unit is held. Complete payment to confirm your booking.'
                : 'Your booking is confirmed.'}{' '}
            Reference <span className="font-medium">{id}</span>.
          </p>

          {reservation && (
            <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-y-2 text-left text-sm">
              <dt className="text-gray-500">Guest</dt>
              <dd className="text-gray-900">{reservation.guestName}</dd>
              <dt className="text-gray-500">Party size</dt>
              <dd className="text-gray-900">{reservation.partySize ?? '—'}</dd>
              <dt className="text-gray-500">From</dt>
              <dd className="text-gray-900">{new Date(reservation.start).toLocaleString()}</dd>
              <dt className="text-gray-500">To</dt>
              <dd className="text-gray-900">{new Date(reservation.end).toLocaleString()}</dd>
              <dt className="text-gray-500">Status</dt>
              <dd className="capitalize text-gray-900">{reservation.status.replace('_', ' ')}</dd>
              {typeof reservation.amount === 'number' && reservation.amount > 0 && (
                <>
                  <dt className="text-gray-500">
                    {reservation.vertical === 'hotel' ? 'Total' : 'Reservation deposit'}
                  </dt>
                  <dd className="text-gray-900">
                    ₦{reservation.amount.toLocaleString()}{' '}
                    <span className="text-xs text-gray-400">{reservation.currency ?? 'NGN'}</span>
                  </dd>
                </>
              )}
              {reservation.paymentStatus && (
                <>
                  <dt className="text-gray-500">Payment</dt>
                  <dd className="text-gray-900">
                    {PAYMENT_LABEL[reservation.paymentStatus] ?? reservation.paymentStatus}
                  </dd>
                </>
              )}
            </dl>
          )}

          {reservation && ['restaurant', 'club'].includes(String(reservation.vertical)) &&
            !orderQuery.data && (
              <div className="mt-6 rounded-2xl border border-[#0A6C6D]/20 bg-[#0A6C6D]/5 p-4 text-left">
                <p className="text-sm font-medium text-gray-900">
                  {reservation.vertical === 'club'
                    ? 'Want to pre-order your drinks?'
                    : 'Want to pre-order your meal?'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Add items now and your table deposit is credited against the bill.
                </p>
                <Link
                  to={`/preorder/${reservation._id}`}
                  className="mt-3 inline-block rounded-xl bg-[#0A6C6D] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A6C6D]/90"
                >
                  {reservation.vertical === 'club' ? 'Pre-order drinks' : 'Pre-order a meal'}
                </Link>
              </div>
            )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/bookings"
              className="rounded-xl bg-[#0A6C6D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0A6C6D]/90"
            >
              My bookings
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back home
            </Link>
          </div>
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
};

export default ConfirmationPage;
