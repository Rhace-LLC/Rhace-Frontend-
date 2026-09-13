import { acquireLock, pickBalancedUnit } from './reservations';
import type { AvailabilityWindow } from './availability';
import type {
  InventoryBlueprint,
  PhysicalUnit,
  Reservation,
  ReservationLock,
  Vertical,
} from './types';

const GUESTS = [
  'A. Bello',
  'M. Chen',
  'J. Okafor',
  'R. Patel',
  'L. Gomez',
  'K. Adeyemi',
  'S. Ibrahim',
  'N. Adeleke',
  'T. Nakamura',
  'F. Mensah',
  'D. Rossi',
  'H. Van Dijk',
];

/** [startHour, durationHours] patterns cycled through for a curated feel. */
const PATTERNS: Array<[number, number]> = [
  [18, 2],
  [20, 3],
  [19, 2],
  [21, 4],
  [17, 2],
  [22, 3],
  [19, 4],
  [20, 2],
];

function at(dayOffset: number, hour: number): Date {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/** Curated, deterministic seed reservations (2–4 per unit, ~30% active today). */
export function seedReservations(
  vertical: Vertical,
  units: PhysicalUnit[],
  blueprints: InventoryBlueprint[]
): Reservation[] {
  const blueprintById = new Map(blueprints.map((b) => [b.id, b]));
  const reservations: Reservation[] = [];

  units.forEach((unit, unitIndex) => {
    const blueprint = blueprintById.get(unit.blueprintId);
    const count = 2 + (unitIndex % 3); // 2–4
    for (let i = 0; i < count; i += 1) {
      const [startHour, duration] = PATTERNS[(unitIndex + i) % PATTERNS.length];
      const dayOffset = i === 0 ? 0 : ((unitIndex + i) % 6) + 1;
      const start = at(dayOffset, startHour);
      const end = new Date(start);
      end.setHours(end.getHours() + (vertical === 'hotel' ? 24 * Math.max(1, Math.round(duration / 2)) : duration));

      const active = dayOffset === 0;
      reservations.push({
        id: `seed_${unit.id}_${i}`,
        unitId: unit.id,
        blueprintId: unit.blueprintId,
        guestName: GUESTS[(unitIndex * 2 + i) % GUESTS.length],
        partySize: Math.min(blueprint?.capacity ?? 4, 2 + ((unitIndex + i) % 4)),
        start: start.toISOString(),
        end: end.toISOString(),
        status: active ? 'active' : 'upcoming',
        posSpend: active ? 250 + ((unitIndex * 37 + i * 53) % 1500) : 0,
      });
    }
  });

  return reservations.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Simulates the user-facing booking flow: load-balances an available unit under
 * the blueprint and places a 5-minute atomic lock on it.
 */
export function simulateBooking(
  units: PhysicalUnit[],
  reservations: Reservation[],
  blueprintId: string,
  window?: AvailabilityWindow | null
): { unit: PhysicalUnit; lock: ReservationLock } | null {
  const unit = pickBalancedUnit(units, reservations, blueprintId, window);
  if (!unit) return null;
  return { unit, lock: acquireLock(unit.id, 5) };
}
