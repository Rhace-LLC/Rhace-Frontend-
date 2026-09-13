import type {
  InventoryBlueprint,
  PhysicalUnit,
  Reservation,
  ReservationLock,
  UnitState,
  Vertical,
} from './types';

/**
 * Mock reservation engine: deterministic seed data, availability aggregation,
 * load-balanced unit assignment, and 5-minute atomic booking locks (persisted
 * in localStorage).
 */

const LOCK_KEY = 'prototype:booking-locks';

const GUEST_POOL = [
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

function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function startOfHour(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

export function createMockReservations(
  vertical: Vertical,
  units: PhysicalUnit[],
  blueprints: InventoryBlueprint[]
): Reservation[] {
  const rand = rng(seedFrom(`${vertical}:${units.map((u) => u.id).join(',')}`));
  const now = startOfHour(new Date());
  const blueprintById = new Map(blueprints.map((b) => [b.id, b]));
  const reservations: Reservation[] = [];

  units.forEach((unit) => {
    const blueprint = blueprintById.get(unit.blueprintId);
    const perUnit = 2 + Math.floor(rand() * 3); // 2–4
    for (let i = 0; i < perUnit; i += 1) {
      const dayOffset = Math.floor(rand() * 7);
      const startHour = 17 + Math.floor(rand() * 6); // 17:00–22:00
      const duration = vertical === 'hotel' ? 24 * (1 + Math.floor(rand() * 3)) : 2;

      const start = new Date(now);
      start.setDate(start.getDate() + dayOffset);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + duration);

      const active = dayOffset === 0 && i === 0;
      reservations.push({
        id: `res_${unit.id}_${i}`,
        unitId: unit.id,
        blueprintId: unit.blueprintId,
        guestName: GUEST_POOL[Math.floor(rand() * GUEST_POOL.length)],
        partySize: Math.max(1, Math.round((blueprint?.capacity ?? 2) * (0.5 + rand() * 0.5))),
        start: start.toISOString(),
        end: end.toISOString(),
        status: active ? 'active' : 'upcoming',
        posSpend: active ? Math.round(rand() * (blueprint?.basePrice || 1500)) : 0,
      });
    }
  });

  return reservations.sort((a, b) => a.start.localeCompare(b.start));
}

export function reservationsForUnit(reservations: Reservation[], unitId: string): Reservation[] {
  return reservations.filter((r) => r.unitId === unitId).sort((a, b) => a.start.localeCompare(b.start));
}

export function overlaps(a: Reservation, b: { start: string; end: string }): boolean {
  return a.start < b.end && b.start < a.end;
}

export function isUnitAvailable(
  unitId: string,
  reservations: Reservation[],
  window?: { start: string; end: string } | null
): boolean {
  const relevant = reservations.filter(
    (r) => r.unitId === unitId && r.status !== 'cancelled' && r.status !== 'completed'
  );
  if (!window) {
    // "Now" window: any active reservation blocks the unit.
    return !relevant.some((r) => overlaps(r, { start: r.start, end: r.end }) && r.status === 'active');
  }
  return !relevant.some((r) => overlaps(r, window));
}

/** States that count as "available to book right now". */
export function isAvailableState(vertical: Vertical, state: UnitState): boolean {
  if (vertical === 'hotel') return state === 'vacant_clean';
  return state === 'available';
}

export function blueprintCounts(
  units: PhysicalUnit[],
  reservations: Reservation[],
  blueprintId: string,
  window?: { start: string; end: string } | null
) {
  const scoped = units.filter((u) => u.blueprintId === blueprintId);
  const available = scoped.filter(
    (u) => isAvailableState(u.vertical, u.state) && isUnitAvailable(u.id, reservations, window)
  ).length;
  return { total: scoped.length, available, reserved: scoped.length - available };
}

/** Load-balance: pick an available unit with the fewest existing reservations. */
export function pickBalancedUnit(
  units: PhysicalUnit[],
  reservations: Reservation[],
  blueprintId: string,
  window?: { start: string; end: string } | null
): PhysicalUnit | undefined {
  const candidates = units.filter(
    (u) =>
      u.blueprintId === blueprintId &&
      u.isReservable !== false &&
      !isLocked(u.id) &&
      isUnitAvailable(u.id, reservations, window)
  );
  if (!candidates.length) return undefined;
  return candidates.reduce((best, unit) => {
    const bestCount = reservationsForUnit(reservations, best.id).length;
    const unitCount = reservationsForUnit(reservations, unit.id).length;
    return unitCount < bestCount ? unit : best;
  }, candidates[0]);
}

// ─── 5-minute atomic locks ────────────────────────────────────────────────────

type LockMap = Record<string, ReservationLock>;

function readLocks(): LockMap {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || '{}') as LockMap;
  } catch {
    return {};
  }
}

function writeLocks(locks: LockMap) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(locks));
  } catch {
    /* ignore */
  }
}

export function getLock(unitId: string): ReservationLock | null {
  const locks = readLocks();
  const lock = locks[unitId];
  if (!lock) return null;
  if (new Date(lock.expiresAt).getTime() <= Date.now()) {
    delete locks[unitId];
    writeLocks(locks);
    return null;
  }
  return lock;
}

export function isLocked(unitId: string): boolean {
  return getLock(unitId) !== null;
}

export function acquireLock(unitId: string, minutes = 5): ReservationLock {
  const token = `lock_${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
  const locks = readLocks();
  locks[unitId] = { token, expiresAt };
  writeLocks(locks);
  return { token, expiresAt };
}

export function releaseLock(unitId: string): void {
  const locks = readLocks();
  delete locks[unitId];
  writeLocks(locks);
}
