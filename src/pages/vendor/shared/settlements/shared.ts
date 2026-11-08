import type { PillTone } from '@/components/dashboard/res-ui';
import type { BatchStatus, SettlementBatchDto } from '@/services/settlement.service';

export const BATCH_STATUS: Record<BatchStatus, { label: string; tone: PillTone }> = {
  draft: { label: 'Awaiting approval', tone: 'neutral' },
  approved: { label: 'Awaiting payout', tone: 'brand' },
  paid: { label: 'Paid', tone: 'positive' },
  disputed: { label: 'Disputed', tone: 'danger' },
};

export const PAYOUT_METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  other: 'Other',
};

export interface BatchesData {
  batches: SettlementBatchDto[];
  unbatched: Array<{ vendorLink: string; net: number; rows: number }>;
}

export const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

export const isoDay = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

export const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Shared header row for a settlements card. */
export const CARD_PAD = 'space-y-4 p-5 md:p-6';
