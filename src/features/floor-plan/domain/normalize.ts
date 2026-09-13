import type { FloorEntity, FloorPlan, FloorVertical } from '../core/types';
import { blueprintsFor } from './blueprints';
import type {
  BlueprintCategory,
  InventoryBlueprint,
  UnitState,
  Vertical,
} from './types';

/**
 * Normalizes persisted/legacy plans onto the domain model:
 * - assigns a `blueprintId` to each unit entity
 * - maps legacy status strings onto the lifecycle enums
 */

const LEGACY_STATE_MAP: Record<Vertical, Record<string, UnitState>> = {
  hotel: {
    clean: 'vacant_clean',
    available: 'vacant_clean',
    inspected: 'inspected',
    dirty: 'vacant_dirty',
    checkout: 'vacant_dirty',
    occupied: 'occupied',
    ooo: 'out_of_order_ooo',
    cleaning: 'cleaning_in_progress',
  },
  club: {
    available: 'available',
    reserved: 'reserved_confirmed',
    arrived: 'arrived_seated',
    occupied: 'arrived_seated',
    combined: 'arrived_seated',
    under_target: 'under_target_spend',
    target_met: 'target_met',
  },
  restaurant: {
    available: 'available',
    reserved: 'reserved_held',
    occupied: 'seated_ordering',
    combined: 'seated_ordering',
    ordering: 'seated_ordering',
    served: 'entrees_served',
    awaiting_check: 'awaiting_check',
    dirty: 'dirty_bussing',
  },
};

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0;
  }
  return value;
}

export function mapLegacyState(vertical: Vertical, status: unknown): UnitState {
  const key = String(status ?? '').toLowerCase();
  return LEGACY_STATE_MAP[vertical][key] ?? (vertical === 'hotel' ? 'vacant_clean' : 'available');
}

function categoryForEntityType(type: string): BlueprintCategory {
  if (type === 'room') return 'room';
  if (type === 'vip_table') return 'club_table';
  return 'restaurant_table';
}

export function assignBlueprintId(
  entity: FloorEntity,
  vertical: Vertical,
  blueprints: InventoryBlueprint[]
): string {
  const existing = entity.businessData.blueprintId;
  if (typeof existing === 'string' && blueprints.some((b) => b.id === existing)) return existing;

  const roomType = entity.businessData.roomType;
  if (typeof roomType === 'string') {
    const byType = blueprints.find((b) => b.type === roomType);
    if (byType) return byType.id;
  }

  const candidates = blueprints.filter((b) => b.category === categoryForEntityType(entity.type));
  const pool = candidates.length ? candidates : blueprints;
  if (!pool.length) return '';
  return pool[hash(entity.entityId) % pool.length].id;
}

export function normalizeEntity(
  entity: FloorEntity,
  vertical: Vertical,
  blueprints: InventoryBlueprint[]
): FloorEntity {
  if (entity.spatialData.layer === 'structure') return entity;
  const state = mapLegacyState(vertical, entity.businessData.status);
  const blueprintId = assignBlueprintId(entity, vertical, blueprints);
  return {
    ...entity,
    businessData: {
      ...entity.businessData,
      blueprintId,
      status: state,
      ...(vertical === 'hotel' ? { housekeeping: state } : {}),
      ...(vertical === 'restaurant' ? { mealStage: state } : {}),
    },
  };
}

export function normalizePlan(
  plan: FloorPlan,
  blueprints: InventoryBlueprint[] = blueprintsFor(plan.vertical as Vertical)
): FloorPlan {
  const vertical = plan.vertical as Vertical;
  return {
    ...plan,
    entities: plan.entities.map((entity) => normalizeEntity(entity, vertical, blueprints)),
  };
}
