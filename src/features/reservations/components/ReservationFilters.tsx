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
  'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#0A6C6D] focus:outline-none';

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
    <div className="flex flex-wrap items-end gap-3">
      <input
        type="search"
        placeholder="Search guest name or email"
        value={value.search ?? ''}
        onChange={(e) => set({ search: e.target.value })}
        className={`${inputClass} min-w-[220px] flex-1`}
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
          placeholder="Vendor ID"
          value={value.vendorId ?? ''}
          onChange={(e) => set({ vendorId: e.target.value })}
          className={inputClass}
        />
      )}
    </div>
  );
}
