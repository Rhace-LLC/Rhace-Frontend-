import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '@/services/payment.service';
import { toast } from 'react-toastify';
import UniversalLoader from './user/ui/LogoLoader';
import Receipt from './Receipt';
import { CheckCircle2, X } from 'lucide-react';
import type { ReservationData } from '@/types';

type ReservationVertical = 'restaurant' | 'hotel' | 'club';

interface CallbackState {
  reservation: ReservationData | null;
  payment: { reference?: string; status?: string; amount?: number } | null;
  orderPaid: boolean;
  loading: boolean;
  error: string | null;
}

const PaystackCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');
  const status = searchParams.get('status') || 'pending';

  const [resultData, setResultData] = useState<CallbackState>({
    reservation: null,
    payment: null,
    orderPaid: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const handleCallback = async () => {
      if (!reference && !trxref) {
        setResultData({
          reservation: null,
          payment: null,
          orderPaid: false,
          loading: false,
          error: 'No payment reference found',
        });
        toast.error('No payment reference found');
        return;
      }

      try {
        toast.info(`${trxref ? 'Completing payment' : 'Verifying payment'}...`);

        let verifyRes: any = null;
        let completeRes: any = null;

        // Verify first — this finalizes order (pre-order / table) payments.
        if (reference) {
          verifyRes = await paymentService.verifyPayment(reference);
          toast.success('Payment verified');
        }

        // Legacy booking completion. No such endpoint for order payments,
        // so a failure here must not fail an already-verified payment.
        if (trxref) {
          try {
            completeRes = await paymentService.completeReservation(trxref);
            toast.success('Booking confirmed!');
          } catch {
            completeRes = null;
          }
        }

        const reservation = completeRes?.reservation || verifyRes?.reservation || null;

        setResultData({
          reservation,
          payment: verifyRes?.payment || completeRes?.payment || null,
          orderPaid: !reservation && Boolean(verifyRes?.success),
          loading: false,
          error: null,
        });
      } catch (error: any) {
        console.error('Callback processing failed:', error);

        const errorMsg =
          error.response?.data?.message ||
          'Payment processing failed. Please check your payments page.';

        setResultData({
          reservation: null,
          payment: null,
          orderPaid: false,
          loading: false,
          error: errorMsg,
        });
        toast.error(errorMsg);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, trxref, navigate]);

  const refTail = (trxref || reference || '').slice(-8);

  if (resultData.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-res-surface px-4">
        <div className="w-full max-w-lg rounded-res-lg bg-res-card p-8 text-center shadow-res-low md:p-12">
          <UniversalLoader />
          <h2 className="type-res-h2 mt-6 text-res-ink">Finalizing your payment</h2>
          {refTail && (
            <p className="type-res-small mt-2 font-mono text-res-ink-muted">…{refTail}</p>
          )}
          <div className="mt-4 flex justify-center">
            <span
              className={`type-res-small rounded-full px-3 py-1 font-semibold ${
                status === 'success'
                  ? 'bg-res-secondary text-res-brand'
                  : 'bg-res-surface text-res-ink-muted'
              }`}
            >
              {status === 'success' ? 'Payment sent' : 'Waiting on payment'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Pre-order / table-order payment verified (no booking receipt attached).
  if (resultData.orderPaid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-res-surface px-4 py-8">
        <div className="w-full max-w-lg rounded-res-lg bg-res-card p-8 text-center shadow-res-low md:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-res-secondary">
            <CheckCircle2 className="h-8 w-8 text-res-brand" />
          </div>
          <span className="type-res-small rounded-full bg-res-secondary px-3 py-1 font-semibold text-res-brand">
            Paid
          </span>
          <h2 className="type-res-h2 mt-3 text-res-ink">Payment successful</h2>
          <p className="type-res-body mx-auto mt-2 max-w-md font-normal text-res-ink-muted">
            Your order payment went through.
            {refTail && (
              <>
                {' '}
                Reference <span className="font-mono font-semibold text-res-ink">…{refTail}</span>.
              </>
            )}
          </p>
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              to="/orders"
              className="type-res-body rounded-full bg-res-brand px-6 py-3 text-center font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
            >
              View my orders
            </Link>
            <Link
              to="/bookings"
              className="type-res-body rounded-full bg-res-surface px-6 py-3 text-center font-semibold text-res-ink transition-colors hover:text-res-brand"
            >
              My bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (resultData.error || !resultData.reservation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-res-surface px-4 py-8">
        <div className="w-full max-w-lg rounded-res-lg bg-res-card p-8 text-center shadow-res-low md:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-res-surface">
            <X className="h-8 w-8 text-res-ink-muted" />
          </div>
          <h2 className="type-res-h2 text-res-ink">Payment didn&apos;t go through</h2>
          <p className="type-res-body mx-auto mt-2 max-w-md font-normal text-res-ink-muted">
            {resultData.error || 'We could not confirm this payment.'}
          </p>
          <div className="mt-8 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="type-res-body w-full cursor-pointer rounded-full bg-res-brand px-6 py-3 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => navigate('/payments')}
              className="type-res-body w-full cursor-pointer rounded-full bg-res-surface px-6 py-3 font-semibold text-res-ink transition-colors hover:text-res-brand"
            >
              Go to payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Legacy booking success — receipt view.
  const receiptType =
    (resultData.reservation?.reservationType as ReservationVertical) || 'hotel';
  return (
    <Receipt reservation={resultData.reservation} payment={resultData.payment} type={receiptType} />
  );
};

export default PaystackCallback;
