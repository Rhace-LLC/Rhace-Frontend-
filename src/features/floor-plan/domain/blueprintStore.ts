import { blueprintsFor } from './blueprints';
import type { Amenity, InventoryBlueprint, Vertical } from './types';

/**
 * Blueprint catalog helpers. The built-in catalog is immutable; custom
 * blueprints created in the prototype are persisted per vertical.
 */

const KEY = (vertical: Vertical) => `prototype:blueprints:${vertical}`;
const LAST_KEY = (vertical: Vertical) => `prototype:last-blueprint:${vertical}`;

export function loadLastBlueprintId(vertical: Vertical): string | null {
  try {
    return localStorage.getItem(LAST_KEY(vertical));
  } catch {
    return null;
  }
}

export function saveLastBlueprintId(vertical: Vertical, blueprintId: string): void {
  try {
    localStorage.setItem(LAST_KEY(vertical), blueprintId);
  } catch {
    /* ignore */
  }
}

export function loadCustomBlueprints(vertical: Vertical): InventoryBlueprint[] {
  try {
    return JSON.parse(localStorage.getItem(KEY(vertical)) || '[]') as InventoryBlueprint[];
  } catch {
    return [];
  }
}

export function allBlueprints(vertical: Vertical): InventoryBlueprint[] {
  return [...blueprintsFor(vertical), ...loadCustomBlueprints(vertical)];
}

export function saveCustomBlueprint(blueprint: InventoryBlueprint): void {
  const existing = loadCustomBlueprints(blueprint.vertical);
  try {
    localStorage.setItem(KEY(blueprint.vertical), JSON.stringify([...existing, blueprint]));
  } catch {
    /* ignore */
  }
}

export interface CustomBlueprintInput {
  name: string;
  type?: string;
  description?: string;
  basePrice?: number;
  capacity?: number;
  maxCapacity?: number;
  minimumSpend?: number;
  amenities?: string[];
}

function toAmenities(labels: string[] | undefined): Amenity[] {
  return (labels ?? []).map((label) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    label,
  }));
}

export function createCustomBlueprint(
  vertical: Vertical,
  input: CustomBlueprintInput
): InventoryBlueprint {
  const id = `custom_${Math.random().toString(36).slice(2, 9)}`;
  const capacity = input.capacity ?? 2;
  const common = {
    id,
    name: input.name,
    description: input.description ?? '',
    basePrice: input.basePrice ?? 0,
    currency: 'USD',
    capacity,
    maxCapacity: input.maxCapacity ?? capacity,
    allowedPaymentStrategies: ['pay_at_venue'] as const,
    bookingPolicies: [],
    amenities: toAmenities(input.amenities),
    images: [],
    accent: '#0d9488',
  };

  if (vertical === 'hotel') {
    return { ...common, vertical, category: 'room', type: input.type ?? input.name, roomType: input.type ?? input.name, allowedPaymentStrategies: ['pay_at_venue'] };
  }
  if (vertical === 'club') {
    return {
      ...common,
      vertical,
      category: 'club_table',
      type: input.type ?? input.name,
      tier: input.type ?? 'Custom',
      minimumSpend: input.minimumSpend ?? input.basePrice ?? 0,
      allowedPaymentStrategies: ['pay_at_venue'],
    };
  }
  return {
    ...common,
    vertical,
    category: 'restaurant_table',
    type: input.type ?? input.name,
    seatingArea: input.type,
    turnTimeMinutes: 90,
    allowedPaymentStrategies: ['pay_at_venue'],
  };
}
