import { useEffect, useState } from 'react';
import { Eye, LogIn, LogOut, MoreVertical, Trash2, Wallet } from 'lucide-react';
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

const menuItemClass =
  'type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand';

const menuDangerClass =
  'type-res-small flex w-full cursor-pointer items-center gap-2.5 rounded-res-sm px-3 py-2.5 font-semibold text-red-700 transition-colors outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500';

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openMenuId]);

  /** Kebab menu is `fixed` so it escapes the table's scroll container. */
  const openMenu = (reservationId: string, anchor: HTMLElement) => {
    if (openMenuId === reservationId) {
      setOpenMenuId(null);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const width = 224;
    const height = 230;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top =
      rect.bottom + 6 + height > window.innerHeight
        ? Math.max(8, rect.top - height - 6)
        : rect.bottom + 6;
    setMenuPos({ top, left });
    setOpenMenuId(reservationId);
  };

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
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => openMenu(reservation._id, e.currentTarget)}
                    aria-expanded={openMenuId === reservation._id}
                    aria-label={`Actions for ${reservation.guestName}'s reservation`}
                    className="type-res-small cursor-pointer rounded-full bg-res-surface p-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === reservation._id && menuPos && (
                    <>
                      <div
                        aria-hidden
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div
                        role="menu"
                        aria-label="Reservation actions"
                        style={{ top: menuPos.top, left: menuPos.left }}
                        className="fixed z-50 w-56 rounded-res-md border border-res-line bg-res-card p-1.5 text-left shadow-res-high"
                      >
                        {onView && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              onView(reservation);
                            }}
                            className={menuItemClass}
                          >
                            <Eye className="h-4 w-4 text-res-brand" />
                            View
                          </button>
                        )}
                        {onPayBalance && balance > 0 && reservation.bookingGroup && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              onPayBalance(reservation);
                            }}
                            className={menuItemClass}
                          >
                            <Wallet className="h-4 w-4 text-res-brand" />
                            Pay now
                          </button>
                        )}
                        {onRecordOffline && role !== 'customer' && balance > 0 && reservation.bookingGroup && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              onRecordOffline(reservation);
                            }}
                            className={menuItemClass}
                          >
                            <Wallet className="h-4 w-4 text-res-brand" />
                            Record payment
                          </button>
                        )}
                        {onCheckIn && canCheckIn && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              onCheckIn(reservation);
                            }}
                            className={menuItemClass}
                          >
                            <LogIn className="h-4 w-4 text-res-brand" />
                            Check in
                          </button>
                        )}
                        {onCheckOut && canCheckOut && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              onCheckOut(reservation);
                            }}
                            className={menuItemClass}
                          >
                            <LogOut className="h-4 w-4 text-res-brand" />
                            Check out
                          </button>
                        )}
                        {onCancel && canCancel && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              onCancel(reservation);
                            }}
                            className={menuDangerClass}
                          >
                            <Trash2 className="h-4 w-4" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
