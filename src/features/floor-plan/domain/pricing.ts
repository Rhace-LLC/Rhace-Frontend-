import type { InventoryBlueprint } from './types';

/**
 * Pricing view-model for the blueprint card and reserve UI.
 *
 * - rooms carry a nightly `price`;
 * - tables carry no price, only an optional `minimumDeposit` (0 = free reservation)
 *   that is credited against the guest's bill at the venue.
 */
export type BlueprintPricing =
  | { mode: 'room'; price: number; per: 'night' }
  | { mode: 'table'; minimumDeposit: number; isFree: boolean };

export function getBlueprintPricing(blueprint: InventoryBlueprint): BlueprintPricing {
  if (blueprint.vertical === 'hotel') {
    return { mode: 'room', price: Math.max(0, blueprint.basePrice ?? 0), per: 'night' };
  }
  const minimumDeposit = Math.max(0, blueprint.minimumDeposit ?? 0);
  return { mode: 'table', minimumDeposit, isFree: minimumDeposit === 0 };
}

/** One-line label used across cards, lists and toolbars. */
export function formatBlueprintPricing(pricing: BlueprintPricing): string {
  if (pricing.mode === 'room') return `₦${pricing.price.toLocaleString()} /night`;
  return pricing.isFree ? 'Free' : `₦${pricing.minimumDeposit.toLocaleString()} deposit`;
}
