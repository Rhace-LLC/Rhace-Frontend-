import type { ReactNode } from 'react';
import { useBookingGroup } from '../api/hooks';
import { formatRange, money, outstanding } from '../api/adapter';
import { PaymentStatusBadge, ReservationStatusBadge } from './ReservationBadges';
import type { ReservationView } from '../types';

interface ReservationDrawerProps {
  open: boolean;
  reservation?: ReservationView | null;
  onClose: () => void;
  footer?: ReactNode;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right text-gray-900">{value}</span>
    </div>
  );
}

export function ReservationDrawer({
  open,
  reservation,
  onClose,
  footer,
}: ReservationDrawerProps) {
  const groupQuery = useBookingGroup(reservation?.bookingGroup ?? undefined);
  const group = groupQuery.data;

  if (!open || !reservation) return null;

  const total = group?.totalAmount ?? reservation.group?.totalAmount ?? reservation.amount;
  const paid = group?.amountPaid ?? reservation.group?.amountPaid ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Reservation details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 pb-3">
          <ReservationStatusBadge status={reservation.status} />
          <PaymentStatusBadge status={group?.paymentStatus ?? reservation.paymentStatus} />
        </div>

        <div className="divide-y divide-gray-100">
          <Row label="Reference" value={reservation._id} />
          <Row label="Guest" value={reservation.guestName} />
          {reservation.guestEmail && <Row label="Email" value={reservation.guestEmail} />}
          {reservation.guestPhone && <Row label="Phone" value={reservation.guestPhone} />}
          <Row label="Party size" value={reservation.partySize ?? '—'} />
          <Row label="Unit" value={reservation.unitLabel ?? '—'} />
          <Row label="Blueprint" value={reservation.blueprintName ?? '—'} />
          <Row label="When" value={formatRange(reservation.start, reservation.end)} />
          {reservation.specialRequests && (
            <Row label="Requests" value={reservation.specialRequests} />
          )}
          <Row label="Source" value={reservation.source ?? '—'} />
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">Payment</h3>
          <Row label="Total" value={money(total)} />
          <Row label="Paid" value={money(paid)} />
          <Row label="Outstanding" value={money(outstanding(reservation))} />
          {group?.paymentStrategy && (
            <Row label="Strategy" value={group.paymentStrategy.replace(/_/g, ' ')} />
          )}

          {groupQuery.isLoading && <p className="mt-2 text-xs text-gray-400">Loading payments…</p>}

          {group?.paymentRefs && group.paymentRefs.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              {group.paymentRefs.map((payment) => (
                <li key={payment._id} className="flex justify-between text-xs text-gray-600">
                  <span>
                    {payment.paymentMode?.replace(/_/g, ' ') ?? 'payment'}
                    {payment.paidAt ? ` · ${new Date(payment.paidAt).toLocaleDateString()}` : ''}
                  </span>
                  <span className="font-medium">{money(payment.amountPaid ?? payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </aside>
    </div>
  );
}
