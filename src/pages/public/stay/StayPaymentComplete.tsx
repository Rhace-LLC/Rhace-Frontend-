import { useSearchParams } from 'react-router';

/**
 * Phase 6: where a desk-sent room-bill payment link returns. The guest may
 * be on any device without a stay session, so this page only acknowledges;
 * the payment is applied to the folio by the Paystack webhook.
 */
const StayPaymentComplete = () => {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-4xl">✅</p>
      <h1 className="text-xl font-bold">Thank you</h1>
      <p className="text-sm text-slate-500">
        Your payment is being confirmed and will appear on your room bill shortly. You can close
        this page.
      </p>
      {reference && <p className="font-mono text-xs text-slate-400">Reference: {reference}</p>}
    </div>
  );
};

export default StayPaymentComplete;
