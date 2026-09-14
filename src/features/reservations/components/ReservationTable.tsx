import { ReservationStatusBadge, PaymentStatusBadge } from './ReservationBadges';
import { formatRange, money, outstanding } from '../api/adapter';
import type { ReservationView } from '../types';

interface ReservationTableProps {
  items: ReservationView[];
  role: 'customer' | 'vendor' | 'admin';
  loading?: boolean;
  onView?: (reservation: ReservationView) => void;
  onCancel?: (reservation: ReservationView) => void;
  onCheckIn?: (reservation: ReservationView) => void;
  onCheckOut?: (reservation: ReservationView) => void;
  onPayBalance?: (reservation: ReservationView) => void;
  onRecordOffline?: (reservation: ReservationView) => void;
}

const actionClass =
  'rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:border-[#0A6C6D] hover:text-[#0A6C6D] disabled:opacity-50';

export function ReservationTable({
  items,
  role,
  loading,
  onView,
  onCancel,
  onCheckIn,
  onCheckOut,
  onPayBalance,
  onRecordOffline,
}: ReservationTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
        No reservations found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3 font-medium">Guest</th>
            {role === 'admin' && <th className="px-4 py-3 font-medium">Vendor</th>}
            <th className="px-4 py-3 font-medium">Unit</th>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Party</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((reservation) => {
            const balance = outstanding(reservation);
            const canCancel = ['pending_payment', 'upcoming'].includes(reservation.status);
            const canCheckIn = role !== 'customer' && reservation.status === 'upcoming';
            const canCheckOut = role !== 'customer' && reservation.status === 'active';

            return (
              <tr
                key={reservation._id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
              >
                <td className="px-4 py-3">
                  <span className="block font-medium text-gray-900">{reservation.guestName}</span>
                  <span className="block text-xs text-gray-400">
                    {reservation.guestEmail ?? reservation.guestPhone ?? '—'}
                  </span>
                </td>
                {role === 'admin' && (
                  <td className="px-4 py-3 text-gray-700">
                    {reservation.vendorName ?? reservation.vendor}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="block text-gray-800">
                    {reservation.unitLabel ?? '—'}
                  </span>
                  <span className="block text-xs text-gray-400">
                    {reservation.blueprintName ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatRange(reservation.start, reservation.end)}
                </td>
                <td className="px-4 py-3 text-gray-700">{reservation.partySize ?? '—'}</td>
                <td className="px-4 py-3">
                  <ReservationStatusBadge status={reservation.status} />
                </td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge
                    status={reservation.group?.paymentStatus ?? reservation.paymentStatus}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="block font-medium text-gray-900">
                    {money(reservation.group?.totalAmount ?? reservation.amount)}
                  </span>
                  {balance > 0 && (
                    <span className="block text-xs text-amber-600">
                      {money(balance)} due
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {onView && (
                      <button type="button" className={actionClass} onClick={() => onView(reservation)}>
                        View
                      </button>
                    )}
                    {onPayBalance && balance > 0 && reservation.bookingGroup && (
                      <button
                        type="button"
                        className={actionClass}
                        onClick={() => onPayBalance(reservation)}
                      >
                        Pay balance
                      </button>
                    )}
                    {onRecordOffline && role !== 'customer' && balance > 0 && reservation.bookingGroup && (
                      <button
                        type="button"
                        className={actionClass}
                        onClick={() => onRecordOffline(reservation)}
                      >
                        Record payment
                      </button>
                    )}
                    {onCheckIn && canCheckIn && (
                      <button
                        type="button"
                        className={actionClass}
                        onClick={() => onCheckIn(reservation)}
                      >
                        Check in
                      </button>
                    )}
                    {onCheckOut && canCheckOut && (
                      <button
                        type="button"
                        className={actionClass}
                        onClick={() => onCheckOut(reservation)}
                      >
                        Check out
                      </button>
                    )}
                    {onCancel && canCancel && (
                      <button
                        type="button"
                        className={`${actionClass} hover:border-rose-300 hover:text-rose-600`}
                        onClick={() => onCancel(reservation)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
