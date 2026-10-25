import type { TransactionStatus } from '@/services/payment.service';

export const PROVIDER_LABEL: Record<string, string> = {
  paystack: 'Paystack',
  monnify: 'Monnify',
  stripe: 'Stripe',
  offline: 'Offline',
};

export const SOURCE_LABEL: Record<string, string> = {
  reservation: 'Reservation',
  order: 'Order',
  stay: 'Stay',
};

export const STATUS_LABEL: Record<TransactionStatus, string> = {
  success: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Part refunded',
};

export const titleCase = (value: string | null | undefined) =>
  (value || '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const methodLabel = (method: string) =>
  ({ bank_transfer: 'Bank transfer', pos: 'POS', ussd: 'USSD', other: 'Other' })[method] ?? titleCase(method);

/** Toggle-pill button classes (metric, bucket and breakdown switches). */
export const pillButton = (active: boolean) =>
  `type-res-small cursor-pointer rounded-full px-3 py-1.5 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
    active ? 'bg-res-brand text-res-ink-inverted shadow-res-low' : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
  }`;
