import { isAvailableState, isUnitAvailable } from './reservations';
import type { InventoryBlueprint, PhysicalUnit, Reservation, Vertical } from './types';

/**
 * Time-windowed availability counters and helpers for the storefront simulation.
 */

export interface AvailabilityWindow {
  start: string;
  end: string;
}

export function nowWindow(vertical: Vertical): AvailabilityWindow {
  const start = new Date();
  const end = new Date(start);
  end.setHours(end.getHours() + (vertical === 'hotel' ? 24 : 2));
  return { start: start.toISOString(), end: end.toISOString() };
}

export function dayWindow(dayOffset: number, startHour = 17, hours = 3): AvailabilityWindow {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + hours);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function next7Days(): AvailabilityWindow[] {
  return Array.from({ length: 7 }, (_, i) => dayWindow(i));
}

/** Count of units under a blueprint that can accept a booking in the window. */
export function availableCount(
  units: PhysicalUnit[],
  reservations: Reservation[],
  blueprintId: string,
  window?: AvailabilityWindow | null
): number {
  return units.filter(
    (unit) =>
      unit.blueprintId === blueprintId &&
      unit.isReservable !== false &&
      isAvailableState(unit.vertical, unit.state) &&
      isUnitAvailable(unit.id, reservations, window)
  ).length;
}

export function reservedCount(
  units: PhysicalUnit[],
  reservations: Reservation[],
  blueprintId: string,
  window?: AvailabilityWindow | null
): number {
  const total = units.filter((u) => u.blueprintId === blueprintId).length;
  return total - availableCount(units, reservations, blueprintId, window);
}

export interface BlueprintAvailability {
  blueprint: InventoryBlueprint;
  total: number;
  available: number;
  reserved: number;
}

export function availabilityByBlueprint(
  units: PhysicalUnit[],
  reservations: Reservation[],
  blueprints: InventoryBlueprint[],
  window?: AvailabilityWindow | null
): BlueprintAvailability[] {
  return blueprints
    .map((blueprint) => {
      const total = units.filter((u) => u.blueprintId === blueprint.id).length;
      const available = availableCount(units, reservations, blueprint.id, window);
      return { blueprint, total, available, reserved: total - available };
    })
    .filter((entry) => entry.total > 0);
}
