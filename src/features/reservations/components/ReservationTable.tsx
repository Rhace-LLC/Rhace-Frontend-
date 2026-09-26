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
  'type-res-small cursor-pointer rounded-full bg-res-surface px-3.5 py-1.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50';

const primaryActionClass =
  'type-res-small cursor-pointer rounded-full bg-res-brand px-3.5 py-1.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50';

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
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-res-sm bg-res-surface" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-res-md bg-res-surface px-6 py-12 text-center">
        <p className="type-res-h3 text-res-ink">No reservations found</p>
        <p className="type-res-small mt-1 font-normal text-res-ink-muted">
          Try adjusting the filters.
        </p>
      </div>
    );
  }

  return (
    <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-res-line">
            <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              Guest
            </th>
            {role === 'admin' && (
              <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                Venue
              </th>
            )}
            <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              Table / Room
            </th>
            <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              Date & time
            </th>
            <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              Guests
            </th>
            <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              Status
            </th>
            <th className="type-res-caption px-4 py-3 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              Payment
            </th>
            <th className="type-res-caption px-4 py-3 text-right font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              Total
            </th>
            <th className="type-res-caption px-4 py-3 text-right font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              Actions
            </th>
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
                className="border-b border-res-line transition-colors last:border-0 hover:bg-res-surface/60"
              >
                <td className="px-4 py-3">
                  <span className="type-res-body block font-semibold text-res-ink">
                    {reservation.guestName}
                  </span>
                  <span className="type-res-small block font-normal text-res-ink-muted">
                    {reservation.guestEmail ?? reservation.guestPhone ?? '—'}
                  </span>
                </td>
                {role === 'admin' && (
                  <td className="type-res-body px-4 py-3 font-normal text-res-ink">
                    {reservation.vendorName ?? reservation.vendor}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="type-res-body block font-medium text-res-ink">
                    {reservation.unitLabel ?? '—'}
                  </span>
                  <span className="type-res-small block font-normal text-res-ink-muted">
                    {reservation.blueprintName ?? '—'}
                  </span>
                </td>
                <td className="type-res-body px-4 py-3 font-normal whitespace-nowrap text-res-ink-muted">
                  {formatRange(reservation.start, reservation.end)}
                </td>
                <td className="type-res-body px-4 py-3 font-medium text-res-ink">
                  {reservation.partySize ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <ReservationStatusBadge status={reservation.status} />
                </td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge
                    status={reservation.group?.paymentStatus ?? reservation.paymentStatus}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="type-res-body block font-semibold text-res-ink">
                    {money(reservation.group?.totalAmount ?? reservation.amount)}
                  </span>
                  {balance > 0 && (
                    <span className="type-res-small mt-1 inline-block rounded-full bg-res-secondary px-2 py-0.5 font-semibold text-res-brand">
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
                        className={primaryActionClass}
                        onClick={() => onPayBalance(reservation)}
                      >
                        Pay now
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
                        className={primaryActionClass}
                        onClick={() => onCheckIn(reservation)}
                      >
                        Check in
                      </button>
                    )}
                    {onCheckOut && canCheckOut && (
                      <button
                        type="button"
                        className={primaryActionClass}
                        onClick={() => onCheckOut(reservation)}
                      >
                        Check out
                      </button>
                    )}
                    {onCancel && canCancel && (
                      <button
                        type="button"
                        className="type-res-small cursor-pointer rounded-full px-3.5 py-1.5 font-semibold text-res-ink-muted transition-colors outline-none hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
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
