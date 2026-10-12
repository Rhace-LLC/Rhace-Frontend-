export interface PaymentWithModel {
  paymentConfig?: { billingModel?: string; platformPercentage?: number } | null;
  platformPercentage?: number;
  [key: string]: unknown;
}

/**
 * The revenue model a payment settled under, read from its own snapshot
 * (`paymentConfig.billingModel`) — never from the vendor's current billing,
 * so history stays true after a subscription starts or lapses.
 */
export function paymentBillingModel(payment: PaymentWithModel | null | undefined): 'percentage' | 'subscription' {
  return payment?.paymentConfig?.billingModel === 'subscription' ? 'subscription' : 'percentage';
}

export function billingModelLabel(payment: PaymentWithModel | null | undefined): string {
  if (paymentBillingModel(payment) === 'subscription') return '0% · subscription';
  const pct = payment?.paymentConfig?.platformPercentage ?? payment?.platformPercentage;
  return typeof pct === 'number' ? `${pct}% platform` : 'Platform %';
}
