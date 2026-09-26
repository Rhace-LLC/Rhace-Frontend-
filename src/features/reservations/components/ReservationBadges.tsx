import { PAYMENT_STYLE, STATUS_STYLE, paymentLabel, statusLabel } from '../api/adapter';
import type { ReservationStatus } from '../types';

const badgeClass =
  'type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap';

export function ReservationStatusBadge({ status }: { status?: ReservationStatus | string }) {
  if (!status) return null;
  const style =
    STATUS_STYLE[status as ReservationStatus] ?? 'bg-res-surface text-res-ink-muted';
  return <span className={`${badgeClass} ${style}`}>{statusLabel(status)}</span>;
}

export function PaymentStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const style = PAYMENT_STYLE[status] ?? 'bg-res-surface text-res-ink-muted';
  return <span className={`${badgeClass} ${style}`}>{paymentLabel(status)}</span>;
}
