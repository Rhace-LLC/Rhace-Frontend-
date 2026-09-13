import type { BusinessData, FloorEntity, FloorPlan, SpatialData } from './types';

export interface EntityPatch {
  businessData?: Partial<BusinessData>;
  spatialData?: Partial<SpatialData>;
}

/**
 * Contract consumed by the canvas/board components. Implemented by the
 * API-backed store (`useApiFloorPlanStore`). Kept UI-facing so components do
 * not depend on a concrete data source.
 */
export interface FloorPlanStore {
  plan: FloorPlan;
  commit: (next: FloorPlan, record?: boolean) => void;
  mutate: (updater: (plan: FloorPlan) => FloorPlan) => void;
  updateEntity: (id: string, patch: EntityPatch, record?: boolean) => void;
  updateEntities: (
    ids: string[],
    patchFn: (entity: FloorEntity) => EntityPatch,
    record?: boolean
  ) => void;
  applyPositions: (positions: Record<string, { x: number; y: number }>, record?: boolean) => void;
  addEntity: (entity: FloorEntity) => void;
  removeEntity: (id: string) => void;
  deleteEntities: (ids: string[]) => void;
  duplicateEntity: (id: string) => string | null;
  duplicateEntities: (ids: string[]) => string[];
  setPlanMeta: (meta: Partial<FloorPlan>) => void;
  addSection: (name: string, defaultFloor?: string) => void;
  deleteSection: (name: string) => void;
  addFloor: (section: string, name: string) => void;
  deleteFloor: (section: string, floor: string) => void;
  save: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetDraft: () => void;
}
