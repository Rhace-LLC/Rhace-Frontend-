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
    { label: 'Pending payments', value: `₦${(counters?.pendingPayments ?? 0).toLocaleString()}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs text-gray-500">{card.label}</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {loading ? <span className="text-gray-300">…</span> : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
