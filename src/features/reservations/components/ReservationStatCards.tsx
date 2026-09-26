import type { ReservationCounters } from '../types';

interface StatCard {
  label: string;
  value: string;
}

export function ReservationStatCards({
  counters,
  loading,
}: {
  counters?: ReservationCounters;
  loading?: boolean;
}) {
  const cards: StatCard[] = [
    { label: 'Reservations today', value: String(counters?.todays ?? 0) },
    { label: 'Prepaid', value: String(counters?.prepaid ?? 0) },
    { label: 'Expected guests', value: String(counters?.expectedGuests ?? 0) },
    { label: 'Pending payments', value: String(counters?.pendingPayments ?? 0) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low"
        >
          <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
            {card.label}
          </p>
          <p className="type-res-h2 mt-1 text-res-ink">
            {loading ? <span className="text-res-ink-muted">…</span> : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
