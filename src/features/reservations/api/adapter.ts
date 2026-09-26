import type { ReservationStatus, ReservationView, TimeBucket } from '../types';

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending_payment: 'Awaiting payment',
  upcoming: 'Upcoming',
  active: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_STYLE: Record<ReservationStatus, string> = {
  pending_payment: 'bg-res-secondary text-res-brand',
  upcoming: 'bg-res-brand text-res-ink-inverted',
  active: 'bg-res-accent text-res-ink-inverted',
  completed: 'bg-res-surface text-res-ink-muted',
  cancelled: 'bg-res-surface text-res-ink-muted line-through',
};

export const PAYMENT_LABEL: Record<string, string> = {
  paid: 'Paid',
  partly_paid: 'Partly paid',
  pay_later: 'Pay at venue',
  unpaid: 'Unpaid',
};

export const PAYMENT_STYLE: Record<string, string> = {
  paid: 'bg-res-secondary text-res-brand',
  partly_paid: 'bg-res-secondary text-res-brand',
  pay_later: 'bg-res-surface text-res-ink-muted',
  unpaid: 'bg-res-surface text-res-ink-muted',
};

export const VERTICAL_LABEL: Record<string, string> = {
  hotel: 'Hotel',
  club: 'Club',
  restaurant: 'Restaurant',
};

export function statusLabel(status?: string): string {
  if (!status) return '—';
  return STATUS_LABEL[status as ReservationStatus] ?? status;
}

export function paymentLabel(status?: string): string {
  if (!status) return '—';
  return PAYMENT_LABEL[status] ?? status;
}

export function money(value?: number, currency = 'NGN'): string {
  if (typeof value !== 'number') return '—';
  return `${currency === 'NGN' ? '₦' : ''}${value.toLocaleString()}`;
}

/** Outstanding balance on a reservation's group (falls back to the line amount). */
export function outstanding(view: ReservationView): number {
  const total = view.group?.totalAmount ?? view.amount ?? 0;
  const paid = view.group?.amountPaid ?? 0;
  return Math.max(0, total - paid);
}

export function isPaid(view: ReservationView): boolean {
  const status = view.group?.paymentStatus ?? view.paymentStatus;
  return status === 'paid';
}

/** Client-side time bucketing replacing the removed `/bookings` buckets. */
export function bucketReservations(items: ReservationView[]): Record<TimeBucket, ReservationView[]> {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const buckets: Record<TimeBucket, ReservationView[]> = { today: [], upcoming: [], past: [] };

  for (const item of items) {
    const start = new Date(item.start).getTime();
    const end = new Date(item.end).getTime();
    const isToday = start >= startOfToday.getTime() && start <= endOfToday.getTime();

    if (isToday) {
      buckets.today.push(item);
    } else if (end >= now && start > endOfToday.getTime()) {
      buckets.upcoming.push(item);
    } else {
      buckets.past.push(item);
    }
  }

  const byStartAsc = (a: ReservationView, b: ReservationView) =>
    new Date(a.start).getTime() - new Date(b.start).getTime();

  buckets.today.sort(byStartAsc);
  buckets.upcoming.sort(byStartAsc);
  buckets.past.sort((a, b) => byStartAsc(b, a));
  return buckets;
}

export function formatRange(start?: string, end?: string): string {
  if (!start || !end) return '—';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const startText = startDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  if (sameDay) {
    return `${startText} – ${endDate.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }
  return `${startText} – ${endDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}
