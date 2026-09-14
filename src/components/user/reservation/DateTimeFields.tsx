import { useEffect, useState } from 'react';
import type { InventoryBlueprint, Vertical } from '@/features/floor-plan/domain/types';

export interface DateSelection {
  start?: string;
  end?: string;
  partySize: number;
  ready: boolean;
}

interface DateTimeFieldsProps {
  vertical: Vertical;
  blueprint?: InventoryBlueprint;
  onChange: (value: DateSelection) => void;
}

const inputClass =
  'w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-gray-800 focus:border-[#0A6C6D] focus:outline-none';

const DEFAULT_TURN_MINUTES = 90;

function localToIso(date: string, time: string): string | undefined {
  if (!date || !time) return undefined;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}

/** Vertical-specific date/time + party size. Emits strict UTC ISO strings. */
export function DateTimeFields({ vertical, blueprint, onChange }: DateTimeFieldsProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState('');
  const [partySize, setPartySize] = useState('2');

  const turnMinutes =
    blueprint && 'turnTimeMinutes' in blueprint ? blueprint.turnTimeMinutes : undefined;

  useEffect(() => {
    const size = Math.max(1, Number(partySize) || 1);

    if (vertical === 'hotel') {
      const start = localToIso(checkIn, '15:00');
      const end = localToIso(checkOut, '11:00');
      const ready = Boolean(start && end && new Date(end as string) > new Date(start as string));
      onChange({ start, end, partySize: size, ready });
      return;
    }

    const start = localToIso(date, time);
    if (!start) {
      onChange({ start: undefined, end: undefined, partySize: size, ready: false });
      return;
    }
    const minutes = vertical === 'restaurant' ? (turnMinutes ?? DEFAULT_TURN_MINUTES) : 180;
    const end = new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
    onChange({ start, end, partySize: size, ready: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical, turnMinutes, date, time, checkIn, checkOut, partySize]);

  return (
    <div className="space-y-4">
      {vertical === 'hotel' ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            Check-in
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500">
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
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            Date
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            Time
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1 text-xs text-gray-500">
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
