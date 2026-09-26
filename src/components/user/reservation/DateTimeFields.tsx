import { useEffect, useState } from 'react';
import type { Vertical } from '@/features/floor-plan/domain/types';

export interface DateTimeValue {
  /** `YYYY-MM-DD` for restaurant/club (time is chosen from the slot grid). */
  date?: string;
  partySize: number;
  /** Hotel only — check-in / check-out. */
  start?: string;
  end?: string;
  /** The date (or hotel range) is valid. */
  dateReady: boolean;
}

/** Final selection consumed by the hold/quote flow. */
export interface DateSelection {
  start?: string;
  end?: string;
  partySize: number;
  ready: boolean;
}

interface DateTimeFieldsProps {
  vertical: Vertical;
  onChange: (value: DateTimeValue) => void;
}

const inputClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';

const labelClass = 'flex flex-col gap-1.5 type-res-small font-medium text-res-ink-muted';

function localToIso(date: string, time: string): string | undefined {
  if (!date || !time) return undefined;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}

/**
 * Step 1 of the reserve flow.
 * - Restaurant / club: pick a **date only** — times come from the slot grid.
 * - Hotel: pick check-in / check-out dates (rooms are nightly).
 */
export function DateTimeFields({ vertical, onChange }: DateTimeFieldsProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState('');
  const [partySize, setPartySize] = useState('2');

  useEffect(() => {
    const size = Math.max(1, Number(partySize) || 1);

    if (vertical === 'hotel') {
      const start = localToIso(checkIn, '15:00');
      const end = localToIso(checkOut, '11:00');
      const ready = Boolean(start && end && new Date(end as string) > new Date(start as string));
      onChange({ partySize: size, start, end, dateReady: ready });
      return;
    }

    onChange({ date, partySize: size, dateReady: Boolean(date) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical, date, checkIn, checkOut, partySize]);

  return (
    <div className="space-y-3">
      {vertical === 'hotel' ? (
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Check-in
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Check-out
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      ) : (
        <label className={labelClass}>
          Date
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      <label className={labelClass}>
        {vertical === 'hotel' ? 'Guests' : 'Party size'}
        <input
          type="number"
          min={1}
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
          className={inputClass}
        />
      </label>
    </div>
  );
}
