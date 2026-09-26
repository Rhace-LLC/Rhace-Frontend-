import type { ReactNode } from 'react';
import { Modal } from '@/components/others/RhaceModal';
import { useBookingGroup } from '../api/hooks';
import { formatRange, money, outstanding } from '../api/adapter';
import { PaymentStatusBadge, ReservationStatusBadge } from './ReservationBadges';
import type { ReservationView } from '../types';
import type { OrderDto } from '@/features/orders';

interface ReservationDrawerProps {
  open: boolean;
  reservation?: ReservationView | null;
  /** Pre-order linked to this booking, if one exists. */
  order?: OrderDto | null;
  onClose: () => void;
  footer?: ReactNode;
}

const PAYMENT_PLAN_LABEL: Record<string, string> = {
  full_prepayment: 'Pay in full',
  deposit_50_percent: 'Pay a deposit',
  pay_at_venue: 'Pay at the venue',
};

function paymentPlanLabel(strategy?: string): string {
  if (!strategy) return '—';
  return PAYMENT_PLAN_LABEL[strategy] ?? strategy.replace(/_/g, ' ');
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="type-res-caption shrink-0 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
        {label}
      </span>
      <span className="type-res-body text-right font-medium text-res-ink">{value}</span>
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
  const isRoom = reservation.vertical === 'hotel';
  const spotKind = isRoom ? 'Room' : 'Table';

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={reservation.blueprintName ?? reservation.unitLabel ?? 'Booking details'}
      subtitle={reservation.vendorName ?? formatRange(reservation.start, reservation.end)}
      footer={footer}
    >
      <div className="flex flex-wrap gap-1.5">
        <ReservationStatusBadge status={reservation.status} />
        <PaymentStatusBadge status={group?.paymentStatus ?? reservation.paymentStatus} />
      </div>

      <div className="rounded-res-md bg-res-surface p-4">
        <Row label="Booking ref" value={<span className="font-mono">{reservation._id}</span>} />
        <Row label="Name" value={reservation.guestName} />
        {reservation.guestEmail && <Row label="Email" value={reservation.guestEmail} />}
        {reservation.guestPhone && <Row label="Phone" value={reservation.guestPhone} />}
        <Row label="Guests" value={reservation.partySize ?? '—'} />
        <Row
          label={spotKind}
          value={
            reservation.unitLabel
              ? `${spotKind} ${reservation.unitLabel}`
              : (reservation.blueprintName ?? '—')
          }
        />
        <Row label="Date & time" value={formatRange(reservation.start, reservation.end)} />
        {reservation.specialRequests && (
          <Row label="Requests" value={reservation.specialRequests} />
        )}
      </div>

      <div className="rounded-res-md bg-res-surface p-4">
        <h3 className="type-res-caption mb-1 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
          Payment
        </h3>
        <Row label="Total" value={money(total)} />
        <Row label="Paid" value={money(paid)} />
        <Row label="Still to pay" value={money(outstanding(reservation))} />
        {group?.paymentStrategy && (
          <Row label="Payment plan" value={paymentPlanLabel(group.paymentStrategy)} />
        )}

        {groupQuery.isLoading && (
          <p className="type-res-small mt-2 font-normal text-res-ink-muted">Loading payments…</p>
        )}

        {group?.paymentRefs && group.paymentRefs.length > 0 && (
          <ul className="mt-2 space-y-1.5 border-t border-res-line pt-2">
            {group.paymentRefs.map((payment) => (
              <li
                key={payment._id}
                className="type-res-small flex justify-between gap-2 font-normal text-res-ink-muted"
              >
                <span>
                  {payment.paymentMode?.replace(/_/g, ' ') ?? 'payment'}
                  {payment.paidAt ? ` · ${new Date(payment.paidAt).toLocaleDateString()}` : ''}
                </span>
                <span className="font-semibold text-res-ink">
                  {money(payment.amountPaid ?? payment.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
