import type { BusinessData, EntityShape, FloorEntity, FloorPlan } from '../core/types';

export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

let counter = 0;
export function uid(prefix = 'entity'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function makeEntity(params: {
  entityId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: EntityShape;
  rotation?: number;
  layer?: 'structure' | 'area' | 'entities' | 'overlay';
  floor?: string;
  businessData: BusinessData;
}): FloorEntity {
  return {
    entityId: params.entityId,
    type: params.type,
    businessData: params.businessData,
    spatialData: {
      floorPlanId: '',
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
      rotation: params.rotation ?? 0,
      shape: params.shape ?? 'rect',
      layer: params.layer ?? 'entities',
      floor: params.floor,
    },
  };
}

export function finalizePlan(plan: FloorPlan): FloorPlan {
  return {
    ...plan,
    entities: plan.entities.map((entity) => ({
      ...entity,
      spatialData: { ...entity.spatialData, floorPlanId: plan.floorPlanId },
    })),
  };
}
