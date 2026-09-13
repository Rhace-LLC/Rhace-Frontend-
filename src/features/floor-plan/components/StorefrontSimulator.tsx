import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import { availableCount } from '../domain/availability';
import { simulateBooking } from '../domain/reservations.fixture';
import type { InventoryBlueprint, PhysicalUnit, Reservation, Vertical } from '../domain/types';

interface StorefrontSimulatorProps {
  vertical: Vertical;
  blueprints: InventoryBlueprint[];
  units: PhysicalUnit[];
  reservations: Reservation[];
  onBooked: (unitId: string) => void;
}

function buildWindow(date: string, time: string, hours: number) {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function StorefrontSimulator({
  blueprints,
  units,
  reservations,
  onBooked,
}: StorefrontSimulatorProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [blueprintId, setBlueprintId] = useState(blueprints[0]?.id ?? '');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('19:00');
  const [hours, setHours] = useState('2');
  const [message, setMessage] = useState<string | null>(null);

  const window = useMemo(
    () => buildWindow(date, time, Number(hours) || 2),
    [date, time, hours]
  );

  const available = availableCount(units, reservations, blueprintId, window);

  const handleBook = () => {
    const result = simulateBooking(units, reservations, blueprintId, window);
    if (!result) {
      setMessage('No available units for this blueprint in the selected window.');
      return;
    }
    setMessage(
      `Booked ${result.unit.label} · locked for 5 min (token ${result.lock.token}).`
    );
    onBooked(result.unit.id);
  };

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-teal-800"
      >
        <ShoppingBag size={14} /> Customer Storefront Simulator
        <span className="ml-auto">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-teal-200 px-4 py-3">
          <div className="flex flex-wrap items-end gap-2 text-xs">
            <label className="flex flex-col gap-1 text-gray-500">
              Blueprint
              <select
                value={blueprintId}
                onChange={(e) => setBlueprintId(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
              >
                {blueprints.map((blueprint) => (
                  <option key={blueprint.id} value={blueprint.id}>
                    {blueprint.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-gray-500">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-gray-500">
              Start
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-gray-500">
              Duration (h)
              <input
                type="number"
                min={1}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
              />
            </label>
            <span className="rounded-full bg-white px-3 py-1 font-medium text-teal-700">
              {available} available
            </span>
            <button
              onClick={handleBook}
              className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
            >
              Book Blueprint
            </button>
          </div>
          {message && <p className="text-xs text-teal-800">{message}</p>}
          <p className="text-[11px] text-gray-400">
            Simulates the user-facing flow: load-balanced assignment + 5-minute atomic lock.
          </p>
        </div>
      )}
    </div>
  );
}
