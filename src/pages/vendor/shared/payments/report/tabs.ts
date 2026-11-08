export const PAYMENT_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'settlements', label: 'Settlements' },
] as const;

export type PaymentTab = (typeof PAYMENT_TABS)[number]['key'];

export const isPaymentTab = (value: string | null): value is PaymentTab =>
  PAYMENT_TABS.some((tab) => tab.key === value);

/**
 * `/dashboard/{vertical}/payments?tab=…`. Carries the shared report filter
 * (`sharedQuery`) and any extra params; drops everything tab-specific
 * (ledger page, search, refund order id) so each tab opens clean.
 */
export function paymentsTabHref(
  base: string,
  tab: PaymentTab,
  sharedQuery = '',
  extra: Record<string, string> = {}
): string {
  const query = new URLSearchParams();
  if (tab !== 'overview') query.set('tab', tab);
  new URLSearchParams(sharedQuery).forEach((value, key) => query.set(key, value));
  for (const [key, value] of Object.entries(extra)) query.set(key, value);
  const s = query.toString();
  return `${base}/payments${s ? `?${s}` : ''}`;
}
