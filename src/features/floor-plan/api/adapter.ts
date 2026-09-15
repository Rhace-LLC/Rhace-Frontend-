import type {
  BlueprintCategory,
  CanvasStructure,
  InventoryBlueprint,
  PhysicalUnit,
  Reservation,
  UnitState,
  UnitSpatial,
  Vertical,
} from '../domain/types';
import type { EntityShape, FloorEntity, FloorPlan, FloorVertical } from '../core/types';
import type {
  BlueprintCategoryDto,
  CanvasStructureDto,
  FloorPlanDto,
  FloorPlanVertical,
  InventoryBlueprintDto,
  PhysicalUnitDto,
  UnitReservationDto,
} from '@/types';
import { structureToEntity, unitToEntity } from '../domain/adapter';

/** Maps backend DTOs onto the feature's domain types. */

export function toDomainBlueprint(dto: InventoryBlueprintDto): InventoryBlueprint {
  const base = {
    id: dto._id ?? dto.id ?? '',
    type: dto.type,
    name: dto.name,
    description: dto.description ?? '',
    basePrice: dto.basePrice ?? 0,
    currency: dto.currency ?? 'NGN',
    minimumDeposit: dto.minimumDeposit ?? 0,
    capacity: dto.capacity ?? 2,
    maxCapacity: dto.maxCapacity ?? dto.capacity ?? 2,
    allowedPaymentStrategies: dto.allowedPaymentStrategies ?? ['pay_at_venue'],
    bookingPolicies: dto.bookingPolicies ?? [],
    amenities: dto.amenities ?? [],
    images: dto.images ?? [],
    accent: dto.accent,
    canvasShape: dto.canvasShape as EntityShape | undefined,
    canvasWidth: dto.canvasWidth,
    canvasHeight: dto.canvasHeight,
  };

  if (dto.vertical === 'hotel') {
    return {
      ...base,
      vertical: 'hotel',
      category: 'room',
      roomType: dto.roomType ?? dto.type,
      bedType: dto.bedType,
      view: dto.view,
    };
  }
  if (dto.vertical === 'club') {
    return {
      ...base,
      vertical: 'club',
      category: 'club_table',
      tier: dto.tier ?? 'Custom',
      minimumSpend: dto.minimumSpend ?? 0,
    };
  }
  return {
    ...base,
    vertical: 'restaurant',
    category: 'restaurant_table',
    seatingArea: dto.seatingArea,
    turnTimeMinutes: dto.turnTimeMinutes,
  };
}

export function toDomainUnit(dto: PhysicalUnitDto): PhysicalUnit {
  const spatial: UnitSpatial = {
    floorPlanId: dto.floorPlan,
    x: dto.spatial.x,
    y: dto.spatial.y,
    width: dto.spatial.width,
    height: dto.spatial.height,
    rotation: dto.spatial.rotation ?? 0,
    shape: (dto.spatial.shape ?? 'rect') as EntityShape,
    layer: 'entities',
    floor: dto.spatial.floor,
  };

  return {
    id: dto._id ?? dto.id ?? '',
    blueprintId: dto.blueprint,
    vertical: dto.vertical as Vertical,
    category: dto.category as BlueprintCategory,
    label: dto.label,
    state: dto.state as UnitState,
    floorId: dto.floorId ?? '',
    sectionId: dto.sectionId,
    spatial,
    attributes: dto.attributes,
    isReservable: dto.isReservable,
    session: dto.session ?? null,
  };
}

export function toDomainStructure(dto: CanvasStructureDto): CanvasStructure {
  return {
    id: dto._id ?? dto.id ?? '',
    floorPlanId: dto.floorPlan,
    kind: dto.kind,
    label: dto.label,
    floor: dto.floor,
    spatial: {
      floorPlanId: dto.floorPlan,
      x: dto.spatial.x,
      y: dto.spatial.y,
      width: dto.spatial.width,
      height: dto.spatial.height,
      rotation: dto.spatial.rotation ?? 0,
      shape: (dto.spatial.shape ?? 'rect') as EntityShape,
      layer: 'structure',
      floor: dto.spatial.floor,
    },
  };
}

export function toCorePlan(dto: FloorPlanDto): FloorPlan {
  return {
    floorPlanId: dto._id ?? dto.id ?? '',
    vertical: dto.vertical as FloorVertical,
    name: dto.name,
    width: dto.width,
    height: dto.height,
    building: dto.building,
    wing: dto.wing,
    floor: dto.floor,
    floors: dto.floors ?? [],
    sectionFloors: dto.sectionFloors,
    areas: dto.areas ?? [],
    activeArea: dto.activeArea,
    entities: [],
  };
}

/**
 * Builds the `FloorEntity[]` the canvas consumes from units + structures.
 * NOTE: area zones are stored as strings on the plan, so their geometry is not
 * reconstructed here (documented limitation of the API layer).
 */
export function buildPlanEntities(
  plan: FloorPlan,
  units: PhysicalUnit[],
  structures: CanvasStructure[],
  blueprints: InventoryBlueprint[]
): FloorEntity[] {
  const byId = new Map(blueprints.map((blueprint) => [blueprint.id, blueprint]));
  const unitEntities = units.map((unit) => unitToEntity(unit, byId.get(unit.blueprintId)));
  const structureEntities = structures.map(structureToEntity);
  return [...structureEntities, ...unitEntities];
}

export function categoryToVertical(category: BlueprintCategoryDto): FloorPlanVertical {
  if (category === 'room') return 'hotel';
  if (category === 'club_table') return 'club';
  return 'restaurant';
}

/** Maps a canonical `UnitReservation` DTO onto the domain `Reservation`. */
export function toDomainReservation(dto: UnitReservationDto): Reservation {
  return {
    id: dto._id ?? dto.id ?? '',
    unitId: dto.unitId ?? '',
    blueprintId: dto.blueprintId ?? '',
    guestName: dto.guestName,
    partySize: dto.partySize ?? 1,
    start: dto.start,
    end: dto.end,
    status: dto.status,
    posSpend: dto.posSpend,
    notes: dto.notes,
  };
}
