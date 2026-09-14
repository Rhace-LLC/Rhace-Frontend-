import { PAYMENT_STYLE, STATUS_STYLE, paymentLabel, statusLabel } from '../api/adapter';
import type { ReservationStatus } from '../types';

export function ReservationStatusBadge({ status }: { status?: ReservationStatus | string }) {
  if (!status) return null;
  const style =
    STATUS_STYLE[status as ReservationStatus] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${style}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const style = PAYMENT_STYLE[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${style}`}
    >
      {paymentLabel(status)}
    </span>
  );
}
