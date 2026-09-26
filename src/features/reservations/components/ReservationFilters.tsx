import type { ReservationFilters as ReservationFiltersType } from '../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending_payment', label: 'Awaiting payment' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_OPTIONS = [
  { value: '', label: 'All payments' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partly_paid', label: 'Partly paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'pay_later', label: 'Pay at venue' },
];

const inputClass =
  'rounded-res-sm border border-res-line bg-res-card px-3 py-2.5 type-res-body font-normal text-res-ink shadow-res-low outline-none placeholder:text-res-ink-muted focus:border-res-brand';

export function ReservationFilters({
  value,
  onChange,
  showVendor,
}: {
  value: ReservationFiltersType;
  onChange: (next: ReservationFiltersType) => void;
  showVendor?: boolean;
}) {
  const set = (patch: Partial<ReservationFiltersType>) =>
    onChange({ ...value, ...patch, page: 1 });

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      <input
        type="search"
        placeholder="Search bookings…"
        value={value.search ?? ''}
        onChange={(e) => set({ search: e.target.value })}
        className={`${inputClass} min-w-[200px] flex-1`}
      />

      <select
        value={value.status ?? ''}
        onChange={(e) => set({ status: e.target.value })}
        className={inputClass}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={value.paymentStatus ?? ''}
        onChange={(e) => set({ paymentStatus: e.target.value })}
        className={inputClass}
      >
        {PAYMENT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={value.from ?? ''}
        onChange={(e) => set({ from: e.target.value })}
        className={inputClass}
      />
      <input
        type="date"
        value={value.to ?? ''}
        onChange={(e) => set({ to: e.target.value })}
        className={inputClass}
      />

      {showVendor && (
        <input
          type="text"
          placeholder="Venue"
          value={value.vendorId ?? ''}
          onChange={(e) => set({ vendorId: e.target.value })}
          className={inputClass}
        />
      )}
    </div>
  );
}
