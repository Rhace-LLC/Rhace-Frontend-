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
    } catch {
      toast.error('Could not start payment.');
    }
  };

  return (
    <>
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto md:mt-[85px] mb-[140px] md:mb-8 max-w-5xl px-4 md:py-8">
        <Link to="/bookings" className="text-xs text-gray-500 hover:text-[#0A6C6D]">
          ← Back to reservations
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-gray-900">
          {reservation?.vertical === 'club' ? 'Pre-order drinks' : 'Pre-order your meal'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Add items now; your table deposit is credited against the bill.
        </p>

        {reservationQuery.isLoading || orderQuery.isLoading ? (
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-gray-100" />
        ) : !reservation ? (
          <Empty text="Reservation not found." />
        ) : existingOrder ? (
          <div className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Your pre-order</h2>
            <ul className="divide-y divide-gray-100 text-sm">
              {(existingOrder.lines ?? []).map((line) => (
                <li key={line._id} className="flex justify-between py-2">
                  <span className="text-gray-800">
                    {line.quantity} × {line.name}
                  </span>
                  <span className="font-medium text-gray-900">{money(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-gray-500">Total</dt>
              <dd className="text-right text-gray-900">{money(existingOrder.total)}</dd>
              <dt className="text-gray-500">Deposit credited</dt>
              <dd className="text-right text-emerald-600">
                −{money(existingOrder.minimumDepositCredit)}
              </dd>
              <dt className="text-gray-500">Balance</dt>
              <dd className="text-right font-semibold text-gray-900">
                {money(existingOrder.balance)}
              </dd>
            </dl>
            {existingOrder.balance > 0 && (
              <button
                type="button"
                onClick={handlePayExisting}
                className="w-full rounded-xl bg-[#0A6C6D] px-4 py-3 text-sm font-medium text-white hover:bg-[#0A6C6D]/90"
              >
                Pay balance {money(existingOrder.balance)}
              </button>
            )}
          </div>
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
    </>
  );
};

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

export default PreOrderPage;
