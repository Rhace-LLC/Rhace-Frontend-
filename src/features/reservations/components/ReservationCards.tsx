import { CalendarDays, ChevronRight, Users } from 'lucide-react';
import { PaymentStatusBadge, ReservationStatusBadge } from './ReservationBadges';
import { VERTICAL_LABEL, formatRange, money, outstanding } from '../api/adapter';
import type { ReservationView } from '../types';

interface ReservationCardsProps {
  items: ReservationView[];
  loading?: boolean;
  onView?: (reservation: ReservationView) => void;
  onCancel?: (reservation: ReservationView) => void;
  onPayBalance?: (reservation: ReservationView) => void;
}

/** Customer booking cards — plain guest wording, no system terms. */
export function ReservationCards({
  items,
  loading,
  onView,
  onCancel,
  onPayBalance,
}: ReservationCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-res-md bg-res-card p-4 shadow-res-low">
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-res-surface" />
            <div className="mt-3 h-5 w-2/3 animate-pulse rounded-full bg-res-surface" />
            <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-res-surface" />
            <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-res-surface" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-res-md bg-res-card px-6 py-12 text-center shadow-res-low">
        <p className="type-res-h3 text-res-ink">No bookings yet</p>
        <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
          When you book a table or a room, it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {items.map((reservation) => {
        const balance = outstanding(reservation);
        const canCancel = ['pending_payment', 'upcoming'].includes(reservation.status);
        const isRoom = reservation.vertical === 'hotel';
        const spotKind = isRoom ? 'Room' : 'Table';
        const venueName =
          reservation.vendorName ?? VERTICAL_LABEL[String(reservation.vertical)] ?? 'Booking';
        const optionName = reservation.blueprintName ?? reservation.unitLabel ?? 'Booking';
        const spotLabel =
          reservation.unitLabel && reservation.unitLabel !== reservation.blueprintName
            ? `${spotKind} ${reservation.unitLabel}`
            : spotKind;

        return (
          <article
            key={reservation._id}
            onClick={() => onView?.(reservation)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onView) {
                e.preventDefault();
                onView(reservation);
              }
            }}
            tabIndex={onView ? 0 : undefined}
            role={onView ? 'button' : undefined}
            aria-label={`${optionName} at ${venueName}`}
            className="flex w-full cursor-pointer flex-col rounded-res-md border border-res-line bg-res-card p-4 text-left shadow-res-low transition-all duration-200 outline-none hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                  {venueName} · {VERTICAL_LABEL[String(reservation.vertical)] ?? ''}
                </p>
                <h3 className="type-res-h3 mt-1 line-clamp-1 text-res-ink">{optionName}</h3>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                <ReservationStatusBadge status={reservation.status} />
                <PaymentStatusBadge
                  status={reservation.group?.paymentStatus ?? reservation.paymentStatus}
                />
              </div>
            </div>

            <div className="type-res-small mt-3 space-y-1.5 font-normal text-res-ink-muted">
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-res-brand" />
                {formatRange(reservation.start, reservation.end)}
              </p>
              <p className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 shrink-0 text-res-brand" />
                {spotLabel}
                {reservation.partySize ? ` · ${reservation.partySize} guest${reservation.partySize === 1 ? '' : 's'}` : ''}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-res-line pt-3">
              <div className="flex items-baseline gap-2">
                <p className="type-res-h3 text-res-ink">
                  {money(reservation.group?.totalAmount ?? reservation.amount)}
                </p>
                {balance > 0 && (
                  <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
                    {money(balance)} still to pay
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {onView && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(reservation);
                    }}
                    className="type-res-small flex cursor-pointer items-center gap-1 rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors hover:text-res-brand"
                  >
                    View more
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {onPayBalance && balance > 0 && reservation.bookingGroup && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPayBalance(reservation);
                    }}
                    className="type-res-small cursor-pointer rounded-full bg-res-brand px-4 py-2 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                  >
                    Pay now
                  </button>
                )}
                {onCancel && canCancel && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(reservation);
                    }}
                    className="type-res-small cursor-pointer rounded-full px-3 py-2 font-semibold text-res-ink-muted transition-colors hover:text-res-ink"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
