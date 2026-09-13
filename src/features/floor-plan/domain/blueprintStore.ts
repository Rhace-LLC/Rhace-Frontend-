import { blueprintsFor } from './blueprints';
import type {
  Amenity,
  BookingPolicy,
  EntityShape,
  InventoryBlueprint,
  PaymentStrategy,
  Vertical,
} from './types';

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
  const existing = loadCustomBlueprints(blueprint.vertical).filter((b) => b.id !== blueprint.id);
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
  paymentStrategies?: PaymentStrategy[];
  bookingPolicies?: BookingPolicy[];
  images?: string[];
  canvasShape?: EntityShape;
  canvasWidth?: number;
  canvasHeight?: number;
  id?: string;
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
  const id = input.id ?? `custom_${Math.random().toString(36).slice(2, 9)}`;
  const capacity = input.capacity ?? 2;
  const common = {
    id,
    name: input.name,
    description: input.description ?? '',
    basePrice: input.basePrice ?? 0,
    currency: 'USD',
    capacity,
    maxCapacity: input.maxCapacity ?? capacity,
    allowedPaymentStrategies: input.paymentStrategies ?? (['pay_at_venue'] as PaymentStrategy[]),
    bookingPolicies: input.bookingPolicies ?? [],
    amenities: toAmenities(input.amenities),
    images: input.images ?? [],
    accent: '#0d9488',
    canvasShape: input.canvasShape,
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
  };

  if (vertical === 'hotel') {
    return {
      ...common,
      vertical,
      category: 'room',
      type: input.type ?? input.name,
      roomType: input.type ?? input.name,
    };
  }
  if (vertical === 'club') {
    return {
      ...common,
      vertical,
      category: 'club_table',
      type: input.type ?? input.name,
      tier: input.type ?? 'Custom',
      minimumSpend: input.minimumSpend ?? input.basePrice ?? 0,
    };
  }
  return {
    ...common,
    vertical,
    category: 'restaurant_table',
    type: input.type ?? input.name,
    seatingArea: input.type,
    turnTimeMinutes: 90,
  };
}
