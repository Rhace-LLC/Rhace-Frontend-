import type {
  InventoryBlueprint,
  PhysicalUnit,
  Reservation,
  ReservationLock,
  UnitState,
  Vertical,
} from './types';

/**
 * Availability helpers + 5-minute atomic booking locks (localStorage).
 * Reservation records are served by the API (`UnitReservation`); this module
 * only provides availability predicates and lock-state helpers.
 */

const LOCK_KEY = 'prototype:booking-locks';

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
