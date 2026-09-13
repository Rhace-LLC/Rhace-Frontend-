import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { FloorPlanStore } from '../core/store';
import type { FloorEntity, FloorPlan, FloorVertical, SpatialData } from '../core/types';
import { floorPlanService } from '@/services/floorPlan.service';
import { physicalUnitService } from '@/services/physicalUnit.service';
import { canvasStructureService } from '@/services/canvasStructure.service';
import {
  buildPlanEntities,
  toCorePlan,
  toDomainBlueprint,
  toDomainStructure,
  toDomainUnit,
} from './adapter';
import { useBlueprints, useFloorPlanLayout } from './hooks';
import { floorPlanKeys } from './keys';
import type { UpdateUnitInput } from '@/types';

function toSpatialPatch(spatial: Partial<SpatialData>): UpdateUnitInput['spatial'] {
  const patch: UpdateUnitInput['spatial'] = {};
  if (spatial.x !== undefined) patch.x = spatial.x;
  if (spatial.y !== undefined) patch.y = spatial.y;
  if (spatial.width !== undefined) patch.width = spatial.width;
  if (spatial.height !== undefined) patch.height = spatial.height;
  if (spatial.rotation !== undefined) patch.rotation = spatial.rotation;
  if (spatial.shape !== undefined) patch.shape = spatial.shape;
  if (spatial.floor !== undefined) patch.floor = spatial.floor;
  return patch;
}

/**
 * API-backed implementation of `FloorPlanStore`.
 * Drop-in for `FloorPlanWorkbench`/`ManagerBoard` when a `planId` is available:
 *   const store = useApiFloorPlanStore(vertical, planId);
 *
 * Writes are fire-and-forget followed by a React Query invalidation (the layout
 * refetches). Undo/redo are not supported server-side and are no-ops.
 */
export function useApiFloorPlanStore(vertical: FloorVertical, planId?: string): FloorPlanStore {
  const queryClient = useQueryClient();
  const layoutQuery = useFloorPlanLayout(planId);
  const blueprintQuery = useBlueprints(planId ? vertical : undefined);

  const blueprints = useMemo(
    () => (blueprintQuery.data?.items ?? []).map(toDomainBlueprint),
    [blueprintQuery.data]
  );
  const units = useMemo(
    () => (layoutQuery.data?.units ?? []).map(toDomainUnit),
    [layoutQuery.data]
  );
  const structures = useMemo(
    () => (layoutQuery.data?.structures ?? []).map(toDomainStructure),
    [layoutQuery.data]
  );

  const plan: FloorPlan = useMemo(() => {
    if (!layoutQuery.data?.plan) {
      return {
        floorPlanId: planId ?? '',
        vertical,
        name: 'Floor',
        width: 2400,
        height: 1600,
        entities: [],
      };
    }
    const core = toCorePlan(layoutQuery.data.plan);
    core.entities = buildPlanEntities(core, units, structures, blueprints);
    return core;
  }, [layoutQuery.data, units, structures, blueprints, planId, vertical]);

  const version = layoutQuery.data?.plan?.version ?? 1;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: floorPlanKeys.all });
  }, [queryClient]);

  const updateEntity = useCallback(
    (id: string, patch: { businessData?: Record<string, unknown>; spatialData?: Partial<SpatialData> }) => {
      if (!planId) return;
      const unit = units.find((entry) => entry.id === id);
      const structure = structures.find((entry) => entry.id === id);

      if (structure) {
        canvasStructureService
          .update(id, {
            label: patch.businessData?.name as string | undefined,
            spatial: patch.spatialData ? (toSpatialPatch(patch.spatialData) as never) : undefined,
          })
          .then(invalidate);
        return;
      }

      if (!unit) return;
      const business = patch.businessData ?? {};
      if (typeof business.status === 'string' && business.status !== unit.state) {
        physicalUnitService.transitionStatus(id, { to: business.status }).then(invalidate);
      }
      const input: UpdateUnitInput = {};
      if (business.name !== undefined) input.label = String(business.name);
      if (business.area !== undefined) input.sectionId = String(business.area);
      if (business.isReservable !== undefined) input.isReservable = Boolean(business.isReservable);
      if (patch.spatialData) input.spatial = toSpatialPatch(patch.spatialData);
      if (Object.keys(input).length) {
        physicalUnitService.update(id, input).then(invalidate);
      }
      return;
    },
    [planId, units, structures, invalidate]
  );

  const store = useMemo<FloorPlanStore>(() => {
    const noop = () => undefined;

    return {
      plan,
      canUndo: false,
      canRedo: false,
      commit: noop,
      mutate: (updater) => {
        if (!planId) return;
        const next = updater(plan);
        floorPlanService
          .update(planId, {
            version,
            name: next.name,
            width: next.width,
            height: next.height,
            floor: next.floor,
            floors: next.floors,
            sectionFloors: next.sectionFloors,
            areas: next.areas,
            activeArea: next.activeArea,
          })
          .then(invalidate);
      },
      updateEntity: (id, patch) => updateEntity(id, patch),
      updateEntities: (ids, patchFn) => {
        ids.forEach((id) => {
          const entity = plan.entities.find((entry) => entry.entityId === id);
          if (entity) updateEntity(id, patchFn(entity) as never);
        });
      },
      applyPositions: (positions) => {
        if (!planId) return;
        floorPlanService.bulkUpdateEntities(planId, { version, positions }).then(invalidate);
      },
      addEntity: (entity: FloorEntity) => {
        if (!planId) return;
        const spatial = entity.spatialData;
        if (spatial.layer === 'structure') {
          floorPlanService
            .createStructure(planId, {
              kind: entity.type,
              label: String(entity.businessData.name ?? entity.type),
              floor: spatial.floor,
              spatial: {
                x: spatial.x,
                y: spatial.y,
                width: spatial.width,
                height: spatial.height,
                rotation: spatial.rotation,
                shape: spatial.shape,
                floor: spatial.floor,
              },
            })
            .then(invalidate);
          return;
        }
        if (entity.businessData.blueprintId) {
          physicalUnitService
            .create(planId, {
              blueprintId: String(entity.businessData.blueprintId),
              label: String(entity.businessData.name ?? ''),
              floorId: spatial.floor,
              sectionId: entity.businessData.area ? String(entity.businessData.area) : undefined,
              state: entity.businessData.status ? String(entity.businessData.status) : undefined,
              spatial: {
                x: spatial.x,
                y: spatial.y,
                width: spatial.width,
                height: spatial.height,
                rotation: spatial.rotation,
                shape: spatial.shape,
                floor: spatial.floor,
              },
              isReservable: entity.businessData.isReservable !== false,
            })
            .then(invalidate);
        }
      },
      removeEntity: (id: string) => {
        const structure = structures.some((entry) => entry.id === id);
        if (structure) {
          canvasStructureService.remove(id).then(invalidate);
        } else {
          physicalUnitService.remove(id).then(invalidate);
        }
      },
      deleteEntities: (ids) => {
        ids.forEach((id) => {
          if (structures.some((entry) => entry.id === id)) {
            canvasStructureService.remove(id).then(invalidate);
          } else {
            physicalUnitService.remove(id).then(invalidate);
          }
        });
      },
      duplicateEntity: (id) => {
        physicalUnitService.duplicate(id).then(invalidate);
        return null;
      },
      duplicateEntities: (ids) => {
        ids.forEach((id) => physicalUnitService.duplicate(id).then(invalidate));
        return [];
      },
      setPlanMeta: (meta: Partial<FloorPlan>) => {
        if (!planId) return;
        floorPlanService
          .update(planId, {
            version,
            name: meta.name,
            width: meta.width,
            height: meta.height,
            floor: meta.floor,
            floors: meta.floors,
            sectionFloors: meta.sectionFloors,
            areas: meta.areas,
            activeArea: meta.activeArea,
            building: meta.building,
            wing: meta.wing,
          })
          .then(invalidate);
      },
      addSection: (name) => {
        if (planId) floorPlanService.addArea(planId, name).then(invalidate);
      },
      deleteSection: (name) => {
        if (planId) floorPlanService.deleteArea(planId, name).then(invalidate);
      },
      addFloor: (section, name) => {
        if (planId) floorPlanService.addFloor(planId, { name, area: section || undefined }).then(invalidate);
      },
      deleteFloor: (section, floor) => {
        if (planId) floorPlanService.deleteFloor(planId, floor, section || undefined).then(invalidate);
      },
      save: invalidate,
      undo: noop,
      redo: noop,
      resetDraft: invalidate,
    };
  }, [plan, planId, version, structures, invalidate, updateEntity]);

  return store;
}
