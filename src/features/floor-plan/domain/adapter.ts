import type { EntityTypeDefinition } from '../core/plugin';
import type { BusinessData, FloorEntity, FloorPlan, FloorVertical } from '../core/types';
import {
  defaultStateFor,
} from './states';
import { blueprintsFor, findBlueprint } from './blueprints';
import type {
  BlueprintCategory,
  CanvasStructure,
  InventoryBlueprint,
  InventoryWorkspace,
  PhysicalUnit,
  UnitSession,
  UnitState,
  Vertical,
} from './types';

/**
 * Compatibility adapter between the domain model (`InventoryBlueprint`,
 * `PhysicalUnit`, `CanvasStructure`) and the existing engine types
 * (`FloorEntity`, `FloorPlan`). The canvas keeps consuming `FloorEntity`.
 */

/** The single palette object per vertical. Blueprints are picked after placement. */
export const CATEGORY_OBJECTS: Record<Vertical, EntityTypeDefinition> = {
  hotel: { type: 'room', label: 'Room', shape: 'room', width: 170, height: 160 },
  club: { type: 'vip_table', label: 'Table', shape: 'booth', width: 180, height: 130 },
  restaurant: { type: 'table', label: 'Table', shape: 'round', width: 140, height: 100 },
};

export function defaultCategory(vertical: Vertical): BlueprintCategory {
  return vertical === 'hotel' ? 'room' : vertical === 'club' ? 'club_table' : 'restaurant_table';
}

export function categoryToType(category: BlueprintCategory): string {
  return category === 'room' ? 'room' : category === 'club_table' ? 'vip_table' : 'table';
}

export function typeToCategory(type: string, vertical: Vertical): BlueprintCategory {
  if (type === 'room') return 'room';
  if (type === 'vip_table') return 'club_table';
  return defaultCategory(vertical);
}

function toDomainVertical(vertical: FloorVertical): Vertical {
  return vertical as Vertical;
}

function inferBlueprint(
  entity: FloorEntity,
  vertical: Vertical,
  blueprints: InventoryBlueprint[]
): InventoryBlueprint | undefined {
  const explicit = entity.businessData.blueprintId;
  if (typeof explicit === 'string') {
    const byId = findBlueprint(blueprints, explicit);
    if (byId) return byId;
  }
  const roomType = entity.businessData.roomType;
  if (typeof roomType === 'string') {
    const byType = blueprints.find((blueprint) => blueprint.type === roomType);
    if (byType) return byType;
  }
  const category = typeToCategory(entity.type, vertical);
  return blueprints.find((blueprint) => blueprint.category === category) ?? blueprints[0];
}

// ─── Unit ⇄ Entity ────────────────────────────────────────────────────────────

export function unitToEntity(unit: PhysicalUnit, blueprint?: InventoryBlueprint): FloorEntity {
  const business: BusinessData = {
    name: unit.label,
    status: unit.state,
    blueprintId: unit.blueprintId,
    capacity: blueprint?.capacity,
    maxCapacity: blueprint?.maxCapacity,
    area: unit.sectionId,
    isReservable: unit.isReservable !== false,
    ...(blueprint && blueprint.vertical === 'hotel'
      ? { roomType: blueprint.type, housekeeping: unit.state }
      : {}),
    ...(blueprint && blueprint.vertical === 'club'
      ? {
          tier: blueprint.tier,
          minimumSpend: blueprint.minimumSpend,
          currentSpend: unit.session?.posSpend ?? 0,
        }
      : {}),
    ...(blueprint && blueprint.vertical === 'restaurant'
      ? { mealStage: unit.state, minutesSeated: 0 }
      : {}),
    ...(unit.session?.guestName
      ? { guestName: unit.session.guestName, partyName: unit.session.guestName }
      : {}),
    ...(unit.attributes ? { attributes: unit.attributes } : {}),
  };

  return {
    entityId: unit.id,
    type: categoryToType(unit.category),
    businessData: business,
    spatialData: {
      floorPlanId: unit.spatial.floorPlanId,
      x: unit.spatial.x,
      y: unit.spatial.y,
      width: unit.spatial.width,
      height: unit.spatial.height,
      rotation: unit.spatial.rotation,
      shape: unit.spatial.shape,
      layer: 'entities',
      floor: unit.floorId || unit.spatial.floor,
    },
  };
}

export function entityToUnit(
  entity: FloorEntity,
  vertical: Vertical,
  blueprints: InventoryBlueprint[]
): PhysicalUnit {
  const blueprint = inferBlueprint(entity, vertical, blueprints);
  const session: UnitSession | null = entity.businessData.guestName
    ? {
        guestName: String(entity.businessData.guestName),
        partySize:
          Number(entity.businessData.partySize ?? entity.businessData.capacity ?? 0) || undefined,
        posSpend:
          entity.businessData.currentSpend !== undefined
            ? Number(entity.businessData.currentSpend)
            : undefined,
        notes: entity.businessData.specialRequest
          ? String(entity.businessData.specialRequest)
          : undefined,
      }
    : null;

  return {
    id: entity.entityId,
    blueprintId: String(entity.businessData.blueprintId ?? blueprint?.id ?? ''),
    vertical,
    category: typeToCategory(entity.type, vertical),
    label: String(entity.businessData.name ?? entity.entityId),
    state: (entity.businessData.status as UnitState) ?? defaultStateFor(vertical),
    floorId: String(entity.spatialData.floor ?? ''),
    sectionId: entity.businessData.area ? String(entity.businessData.area) : undefined,
    spatial: {
      floorPlanId: entity.spatialData.floorPlanId,
      x: entity.spatialData.x,
      y: entity.spatialData.y,
      width: entity.spatialData.width,
      height: entity.spatialData.height,
      rotation: entity.spatialData.rotation,
      shape: entity.spatialData.shape,
      layer: 'entities',
      floor: entity.spatialData.floor,
    },
    attributes: Array.isArray(entity.businessData.attributes)
      ? (entity.businessData.attributes as string[])
      : undefined,
    isReservable: entity.businessData.isReservable !== false,
    session,
  };
}

// ─── Structure ⇄ Entity ───────────────────────────────────────────────────────

export function structureToEntity(structure: CanvasStructure): FloorEntity {
  return {
    entityId: structure.id,
    type: structure.kind,
    businessData: { name: structure.label ?? structure.kind },
    spatialData: {
      floorPlanId: structure.spatial.floorPlanId,
      x: structure.spatial.x,
      y: structure.spatial.y,
      width: structure.spatial.width,
      height: structure.spatial.height,
      rotation: structure.spatial.rotation,
      shape: structure.spatial.shape,
      layer: 'structure',
      floor: structure.floor ?? structure.spatial.floor,
    },
  };
}

export function entityToStructure(entity: FloorEntity): CanvasStructure {
  return {
    id: entity.entityId,
    floorPlanId: entity.spatialData.floorPlanId,
    kind: entity.type,
    label: String(entity.businessData.name ?? entity.type),
    floor: entity.spatialData.floor,
    spatial: {
      floorPlanId: entity.spatialData.floorPlanId,
      x: entity.spatialData.x,
      y: entity.spatialData.y,
      width: entity.spatialData.width,
      height: entity.spatialData.height,
      rotation: entity.spatialData.rotation,
      shape: entity.spatialData.shape,
      layer: 'structure',
      floor: entity.spatialData.floor,
    },
  };
}

// ─── Workspace ⇄ FloorPlan ────────────────────────────────────────────────────

export function workspaceToFloorPlan(workspace: InventoryWorkspace): FloorPlan {
  const entities: FloorEntity[] = [
    ...workspace.units.map((unit) =>
      unitToEntity(unit, findBlueprint(workspace.blueprints, unit.blueprintId))
    ),
    ...workspace.structures.map(structureToEntity),
  ];

  return {
    floorPlanId: workspace.floorPlanId,
    vertical: workspace.vertical,
    name: workspace.name,
    width: workspace.width,
    height: workspace.height,
    floor: workspace.activeFloor,
    floors: workspace.floors,
    sectionFloors: workspace.sectionFloors,
    areas: workspace.areas,
    activeArea: workspace.activeArea,
    entities,
  };
}

export function floorPlanToWorkspace(
  plan: FloorPlan,
  blueprints: InventoryBlueprint[] = blueprintsFor(plan.vertical)
): InventoryWorkspace {
  const vertical = toDomainVertical(plan.vertical);
  const unitEntities = plan.entities.filter((e) => e.spatialData.layer !== 'structure');
  const structureEntities = plan.entities.filter((e) => e.spatialData.layer === 'structure');

  return {
    floorPlanId: plan.floorPlanId,
    vertical,
    name: plan.name,
    width: plan.width,
    height: plan.height,
    floors: plan.floors ?? (plan.floor ? [plan.floor] : []),
    sectionFloors: plan.sectionFloors,
    areas: plan.areas,
    activeArea: plan.activeArea,
    activeFloor: plan.floor,
    blueprints,
    units: unitEntities.map((entity) => entityToUnit(entity, vertical, blueprints)),
    structures: structureEntities.map(entityToStructure),
    reservations: [],
  };
}

export function createWorkspace(plan: FloorPlan): InventoryWorkspace {
  return floorPlanToWorkspace(plan, blueprintsFor(toDomainVertical(plan.vertical)));
}
