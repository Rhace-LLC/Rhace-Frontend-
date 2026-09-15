import type { DaySlotDto, MealPeriodDto } from '@/types';
import type { InventoryBlueprint } from './types';

/** Phase-1 meal-period order (fixed wall-clock defaults). */
export const MEAL_PERIOD_ORDER: MealPeriodDto[] = ['Morning', 'Afternoon', 'Evening'];

/**
 * Party-size gating for Step 1: a blueprint is not selectable when the party is larger than the
 * blueprint can seat. Returns true when capacity is unknown (never block silently).
 */
export function isBlueprintSelectableForParty(
  blueprint: InventoryBlueprint,
  partySize?: number
): boolean {
  if (!partySize) return true;
  const max = blueprint.maxCapacity || blueprint.capacity || 0;
  if (!max) return true;
  return partySize <= max;
}

/** Group a day's slots into their meal periods, preserving order and dropping empties. */
export function groupSlotsByMealPeriod(
  slots: DaySlotDto[]
): { period: MealPeriodDto; slots: DaySlotDto[] }[] {
  return MEAL_PERIOD_ORDER.map((period) => ({
    period,
    slots: slots.filter((slot) => slot.mealPeriod === period),
  })).filter((group) => group.slots.length > 0);
}
