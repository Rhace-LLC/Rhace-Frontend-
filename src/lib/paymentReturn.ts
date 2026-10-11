/**
 * Query params a payment provider appends when it redirects back.
 * Paystack: `reference` + `trxref`. Monnify: `paymentReference`.
 * Stripe: `session_id` (a Checkout Session id, resolved server-side to our
 * merchant reference — never trusted on its own).
 * All identify the payment, which the backend verifies.
 */
export const PAYMENT_RETURN_PARAMS = ['reference', 'trxref', 'paymentReference', 'session_id'] as const;

export function getReturnedReference(params: URLSearchParams): string | null {
  return (
    params.get('reference') ||
    params.get('trxref') ||
    params.get('paymentReference') ||
    params.get('session_id') ||
    null
  );
}
