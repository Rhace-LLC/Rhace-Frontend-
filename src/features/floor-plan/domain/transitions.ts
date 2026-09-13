import type { UnitState, Vertical } from './types';

/**
 * Valid operational lifecycle transitions per vertical. Guards prevent illegal
 * jumps (e.g. hotel `occupied` -> `inspected` without going through cleaning).
 */
export const TRANSITIONS: Record<Vertical, Record<string, UnitState[]>> = {
  hotel: {
    vacant_clean: ['occupied', 'out_of_order_ooo'],
    vacant_dirty: ['cleaning_in_progress', 'vacant_clean', 'out_of_order_ooo'],
    cleaning_in_progress: ['inspected', 'vacant_dirty', 'out_of_order_ooo'],
    inspected: ['vacant_clean', 'occupied', 'out_of_order_ooo'],
    occupied: ['vacant_dirty', 'out_of_order_ooo'],
    out_of_order_ooo: ['vacant_dirty', 'vacant_clean'],
  },
  club: {
    available: ['reserved_confirmed', 'arrived_seated'],
    reserved_confirmed: ['arrived_seated', 'available'],
    arrived_seated: ['under_target_spend', 'target_met', 'closing_payment'],
    under_target_spend: ['target_met', 'closing_payment', 'arrived_seated'],
    target_met: ['closing_payment', 'under_target_spend'],
    closing_payment: ['available'],
  },
  restaurant: {
    available: ['reserved_held', 'seated_ordering'],
    reserved_held: ['seated_ordering', 'available'],
    seated_ordering: ['entrees_served', 'awaiting_check', 'dirty_bussing', 'available'],
    entrees_served: ['awaiting_check', 'dirty_bussing'],
    awaiting_check: ['dirty_bussing', 'available'],
    dirty_bussing: ['available', 'reserved_held'],
  },
};

export function nextStates(vertical: Vertical, from: string): UnitState[] {
  return TRANSITIONS[vertical][from] ?? [];
}

export function canTransition(vertical: Vertical, from: string, to: string): boolean {
  if (from === to) return true;
  return nextStates(vertical, from).includes(to as UnitState);
}

/**
 * Returns the target if the transition is legal, otherwise `null` so callers can
 * safely ignore illegal jumps.
 */
export function resolveTransition(
  vertical: Vertical,
  from: string,
  to: string
): UnitState | null {
  return canTransition(vertical, from, to) ? (to as UnitState) : null;
}
