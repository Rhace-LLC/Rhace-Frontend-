import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import { useMyReservation } from '@/features/reservations';
import {
  OrderBuilder,
  money,
  useCreateOrder,
  useOrderByReservation,
  useOrderIntent,
} from '@/features/orders';
import type { CreateOrderLineInput } from '@/features/orders';

const PreOrderPage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();

  const reservationQuery = useMyReservation(reservationId);
  const reservation = reservationQuery.data;
  const orderQuery = useOrderByReservation(reservationId);
  const existingOrder = orderQuery.data;

  const createOrder = useCreateOrder();
  const orderIntent = useOrderIntent();

  const handleSubmit = async (lines: CreateOrderLineInput[]) => {
    if (!reservation || !lines.length) return;
    try {
      const order = await createOrder.mutateAsync({
        source: 'reservation',
        reservation: reservation._id,
        bookingGroup: reservation.bookingGroup ?? undefined,
        unitId: reservation.unitId ?? undefined,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        guestPhone: reservation.guestPhone,
        idempotencyKey: crypto.randomUUID(),
        lines,
      });
      const intent = await orderIntent.mutateAsync(order._id);
      if (intent?.authorization_url) {
        window.location.href = intent.authorization_url;
        return;
      }
      toast.success('Pre-order placed');
      navigate('/bookings');
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not place your pre-order.';
      toast.error(message);
    }
  };

  const handlePayExisting = async () => {
    if (!existingOrder) return;
    try {
      const intent = await orderIntent.mutateAsync(existingOrder._id);
      if (intent?.authorization_url) window.location.href = intent.authorization_url;
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string; paystackError?: string } } })?.response
          ?.data?.paystackError ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not start payment.';
      toast.error(message);
    }
  };

  const isClub = reservation?.vertical === 'club';

  return (
    <div className="min-h-screen bg-res-surface">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto mb-[140px] max-w-5xl space-y-5 px-4 pt-4 pb-8 md:mt-[85px] md:mb-8 md:px-6 md:py-8 lg:px-8">
        <div>
          <Link
            to="/bookings"
            className="type-res-small font-medium text-res-ink-muted hover:text-res-brand"
          >
            ← Back to my bookings
          </Link>
          <h1 className="type-res-h2 mt-2 text-res-ink">
            {isClub ? 'Pre-order drinks' : 'Pre-order food'}
          </h1>
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">
            Add items now — your table deposit comes off the bill.
          </p>
        </div>

        {reservationQuery.isLoading || orderQuery.isLoading ? (
          <div className="h-64 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
        ) : !reservation ? (
          <div className="rounded-res-lg bg-res-card px-6 py-16 text-center shadow-res-low">
            <p className="type-res-h3 text-res-ink">Booking not found</p>
            <p className="type-res-small mt-1 text-res-ink-muted">
              This booking may have been removed.
            </p>
          </div>
        ) : existingOrder ? (
          <section className="rounded-res-lg bg-res-card p-5 shadow-res-low md:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="type-res-h3 text-res-ink">Your pre-order</h2>
              <span className="type-res-small rounded-full bg-res-secondary px-3 py-1 font-semibold text-res-brand">
                {(existingOrder.lines ?? []).length} item
                {(existingOrder.lines ?? []).length === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="mt-4 rounded-res-md bg-res-surface p-3">
              {(existingOrder.lines ?? []).map((line) => (
                <li
                  key={line._id}
                  className="type-res-body flex justify-between gap-2 border-b border-res-line py-2 font-normal text-res-ink last:border-0 last:pb-0 first:pt-0"
                >
                  <span>
                    <span className="font-semibold">{line.quantity} × </span>
                    {line.name}
                  </span>
                  <span className="shrink-0 font-semibold">{money(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <dt className="type-res-small font-medium text-res-ink-muted">Total</dt>
                <dd className="type-res-body font-semibold text-res-ink">
                  {money(existingOrder.total)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="type-res-small font-medium text-res-ink-muted">Deposit taken off</dt>
                <dd className="type-res-body font-semibold text-res-brand">
                  −{money(existingOrder.minimumDepositCredit)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-res-line pt-2">
                <dt className="type-res-small font-medium text-res-ink-muted">Still to pay</dt>
                <dd className="type-res-h3 text-res-ink">{money(existingOrder.balance)}</dd>
              </div>
            </dl>
            {existingOrder.balance > 0 && (
              <button
                type="button"
                onClick={handlePayExisting}
                className="type-res-body mt-4 w-full cursor-pointer rounded-full bg-res-brand px-4 py-3 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
              >
                Pay {money(existingOrder.balance)} now
              </button>
            )}
          </section>
        ) : (
          <OrderBuilder
            vendorId={reservation.vendor}
            vertical={reservation.vertical}
            depositCredit={reservation.group?.minimumDeposit ?? reservation.amount ?? 0}
            submitLabel="Place pre-order"
            submitting={createOrder.isPending || orderIntent.isPending}
            onSubmit={handleSubmit}
          />
        )}
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default PreOrderPage;
