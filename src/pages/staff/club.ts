import { money } from '@/features/orders/money';
import type { PhysicalUnitDto } from '@/types';

/**
 * Shared club-booth helpers for the VIP host workspace. Kept out of the
 * component files so the Fast Refresh rule holds (same split as `roles.ts`).
 */

/** Club table states → label + dot colour. Mirrors the floor-plan CLUB_STATE_META. */
export const CLUB_STATES: Record<string, { label: string; dot: string }> = {
  available: { label: 'Available', dot: 'bg-green-500' },
  reserved_confirmed: { label: 'Reserved', dot: 'bg-amber-500' },
  arrived_seated: { label: 'Seated', dot: 'bg-blue-500' },
  under_target_spend: { label: 'Under target', dot: 'bg-yellow-500' },
  target_met: { label: 'Target met', dot: 'bg-emerald-500' },
  closing_payment: { label: 'Closing', dot: 'bg-purple-500' },
};

export const clubStateMeta = (state: string) =>
  CLUB_STATES[state] ?? { label: state || 'Unknown', dot: 'bg-gray-400' };

/** Required spend for a booth, taken from its club blueprint (0 = no minimum). */
export const minimumSpendFor = (
  unit: PhysicalUnitDto,
  minimumSpendByBlueprint?: Map<string, number>,
) => Number(minimumSpendByBlueprint?.get(String(unit.blueprint)) ?? 0);

/**
 * Running spend for a booth. Orders are the source of truth (`Order.unitId` +
 * `Order.total`); `session.posSpend` is a legacy field the order engine never
 * writes, so it is only used as a fallback when the booth has no orders yet —
 * adding both would double-count the same drinks.
 */
export const boothSpend = (unit: PhysicalUnitDto, spendByUnit?: Map<string, number>) => {
  const fromOrders = spendByUnit?.get(unit._id);
  return fromOrders !== undefined ? fromOrders : Number(unit.session?.posSpend ?? 0);
};

/** Progress toward the target, capped so the bar can never overflow. */
export const spendPct = (spend: number, minimum: number) =>
  minimum > 0 ? Math.min(Math.round((spend / minimum) * 100), 100) : 0;

/** Title text for a booth tile: label plus its spend target when it has one. */
export const boothTitle = (unit: PhysicalUnitDto, minimum: number, spend: number) =>
  minimum > 0 ? `${unit.label} · ${money(spend)} of ${money(minimum)} minimum` : unit.label;
