import { useCallback, useState } from 'react';
import type {
  BusinessData,
  FloorEntity,
  FloorPlan,
  FloorVertical,
  SpatialData,
} from '../core/types';
import { createRestaurantPlan } from './fixtures/restaurant';
import { createClubPlan } from './fixtures/club';
import { createHotelPlan } from './fixtures/hotel';
import { uid } from './generator';
import { normalizePlan } from '../domain/normalize';

const STORAGE_PREFIX = 'prototype:floor-plan:';

function fixtureFor(vertical: FloorVertical): FloorPlan {
  const plan =
    vertical === 'restaurant'
      ? createRestaurantPlan()
      : vertical === 'club'
        ? createClubPlan()
        : createHotelPlan();
  return normalizePlan(plan);
}

function load(vertical: FloorVertical): FloorPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + vertical);
    if (!raw) return null;
    const plan = JSON.parse(raw) as FloorPlan;
    // Migrate older drafts to the larger canvas (1200x800 -> 2400x1600).
    if (plan.width === 1200 && plan.height === 800) {
      plan.width = 2400;
      plan.height = 1600;
    }
    return normalizePlan(plan);
  } catch {
    return null;
  }
}

function persist(vertical: FloorVertical, plan: FloorPlan) {
  try {
    localStorage.setItem(STORAGE_PREFIX + vertical, JSON.stringify(plan));
  } catch {
    /* ignore quota errors */
  }
}

export interface EntityPatch {
  businessData?: Partial<BusinessData>;
  spatialData?: Partial<SpatialData>;
}

function nextEntityName(plan: FloorPlan, prefix = 'T'): string {
  const nums = plan.entities
    .map((entity) => {
      const match = /^([A-Za-z]*)(\d+)$/.exec(String(entity.businessData.name ?? ''));
      return match && match[1] === prefix ? Number(match[2]) : 0;
    })
    .filter(Boolean);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(2, '0')}`;
}

export function useFloorPlanStore(vertical: FloorVertical) {
  const [plan, setPlan] = useState<FloorPlan>(() => load(vertical) ?? fixtureFor(vertical));
  const [past, setPast] = useState<FloorPlan[]>([]);
  const [future, setFuture] = useState<FloorPlan[]>([]);

  const commit = useCallback(
    (next: FloorPlan, record = true) => {
      if (record) {
        setPast((p) => [...p, plan]);
        setFuture([]);
      }
      setPlan(next);
      persist(vertical, next);
    },
    [plan, vertical]
  );

  const mutate = useCallback(
    (updater: (plan: FloorPlan) => FloorPlan) => {
      setPast((p) => [...p, plan]);
      setFuture([]);
      setPlan((prev) => {
        const next = updater(prev);
        persist(vertical, next);
        return next;
      });
    },
    [plan, vertical]
  );

  const updateEntity = useCallback(
    (id: string, patch: EntityPatch, record = true) => {
      const next: FloorPlan = {
        ...plan,
        entities: plan.entities.map((entity) =>
          entity.entityId === id
            ? {
                ...entity,
                businessData: { ...entity.businessData, ...(patch.businessData ?? {}) },
                spatialData: { ...entity.spatialData, ...(patch.spatialData ?? {}) },
              }
            : entity
        ),
      };
      commit(next, record);
    },
    [plan, commit]
  );

  const applyPositions = useCallback(
    (positions: Record<string, { x: number; y: number }>, record = true) => {
      const next: FloorPlan = {
        ...plan,
        entities: plan.entities.map((entity) =>
          positions[entity.entityId]
            ? {
                ...entity,
                spatialData: {
                  ...entity.spatialData,
                  x: positions[entity.entityId].x,
                  y: positions[entity.entityId].y,
                },
              }
            : entity
        ),
      };
      commit(next, record);
    },
    [plan, commit]
  );

  const addEntity = useCallback(
    (entity: FloorEntity) => {
      commit({ ...plan, entities: [...plan.entities, entity] });
    },
    [plan, commit]
  );

  const removeEntity = useCallback(
    (id: string) => {
      commit({ ...plan, entities: plan.entities.filter((e) => e.entityId !== id) });
    },
    [plan, commit]
  );

  const updateEntities = useCallback(
    (ids: string[], patchFn: (entity: FloorEntity) => EntityPatch, record = true) => {
      const next: FloorPlan = {
        ...plan,
        entities: plan.entities.map((entity) => {
          if (!ids.includes(entity.entityId)) return entity;
          const patch = patchFn(entity);
          return {
            ...entity,
            businessData: { ...entity.businessData, ...(patch.businessData ?? {}) },
            spatialData: { ...entity.spatialData, ...(patch.spatialData ?? {}) },
          };
        }),
      };
      commit(next, record);
    },
    [plan, commit]
  );

  const deleteEntities = useCallback(
    (ids: string[]) => {
      commit({ ...plan, entities: plan.entities.filter((e) => !ids.includes(e.entityId)) });
    },
    [plan, commit]
  );

  const duplicateEntity = useCallback(
    (id: string): string | null => {
      const source = plan.entities.find((e) => e.entityId === id);
      if (!source) return null;
      const prefix = source.type === 'bar-seat' ? 'B' : 'T';
      const newId = uid(source.type);
      const copy: FloorEntity = {
        ...source,
        entityId: newId,
        businessData: {
          ...source.businessData,
          name: nextEntityName(plan, prefix),
        },
        spatialData: {
          ...source.spatialData,
          x: source.spatialData.x + 30,
          y: source.spatialData.y + 30,
        },
      };
      commit({ ...plan, entities: [...plan.entities, copy] });
      return newId;
    },
    [plan, commit]
  );

  const duplicateEntities = useCallback(
    (ids: string[]): string[] => {
      const copies: FloorEntity[] = [];
      let working = plan;
      ids.forEach((id) => {
        const source = working.entities.find((e) => e.entityId === id);
        if (!source) return;
        const prefix = source.type === 'bar-seat' ? 'B' : 'T';
        const copy: FloorEntity = {
          ...source,
          entityId: uid(source.type),
          businessData: { ...source.businessData, name: nextEntityName(working, prefix) },
          spatialData: {
            ...source.spatialData,
            x: source.spatialData.x + 30,
            y: source.spatialData.y + 30,
          },
        };
        copies.push(copy);
        working = { ...working, entities: [...working.entities, copy] };
      });
      if (copies.length) commit({ ...plan, entities: [...plan.entities, ...copies] });
      return copies.map((c) => c.entityId);
    },
    [plan, commit]
  );

  const save = useCallback(() => {
    persist(vertical, plan);
  }, [plan, vertical]);

  const setPlanMeta = useCallback(
    (meta: Partial<FloorPlan>) => {
      commit({ ...plan, ...meta });
    },
    [plan, commit]
  );

  const addSection = useCallback(
    (name: string, defaultFloor = 'Level 01') => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const areas = Array.from(new Set([...(plan.areas ?? []), trimmed]));
      const sectionFloors = {
        ...(plan.sectionFloors ?? {}),
        [trimmed]: plan.sectionFloors?.[trimmed] ?? [defaultFloor],
      };
      commit({ ...plan, areas, sectionFloors, activeArea: trimmed, floor: defaultFloor });
    },
    [plan, commit]
  );

  const deleteSection = useCallback(
    (name: string) => {
      const areas = (plan.areas ?? []).filter((s) => s !== name);
      const sectionFloors = { ...(plan.sectionFloors ?? {}) };
      delete sectionFloors[name];
      const nextSection = plan.activeArea === name ? areas[0] : plan.activeArea;
      const nextFloor = nextSection
        ? (sectionFloors[nextSection]?.[0] ?? plan.floor)
        : plan.floor;
      commit({
        ...plan,
        areas,
        sectionFloors,
        activeArea: nextSection,
        floor: nextFloor,
        entities: plan.entities.filter((e) => e.businessData.area !== name),
      });
    },
    [plan, commit]
  );

  const addFloor = useCallback(
    (section: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (!section) {
        commit({
          ...plan,
          floors: Array.from(new Set([...(plan.floors ?? []), trimmed])),
          floor: trimmed,
        });
        return;
      }
      const current = plan.sectionFloors?.[section] ?? plan.floors ?? [];
      const sectionFloors = {
        ...(plan.sectionFloors ?? {}),
        [section]: Array.from(new Set([...current, trimmed])),
      };
      commit({ ...plan, sectionFloors, activeArea: section, floor: trimmed });
    },
    [plan, commit]
  );

  const deleteFloor = useCallback(
    (section: string, floor: string) => {
      if (!section) {
        const floors = (plan.floors ?? []).filter((f) => f !== floor);
        const nextFloor = plan.floor === floor ? floors[0] : plan.floor;
        commit({
          ...plan,
          floors,
          floor: nextFloor,
          entities: plan.entities.filter(
            (e) => (e.spatialData.floor ?? plan.floor) !== floor
          ),
        });
        return;
      }
      const current = plan.sectionFloors?.[section] ?? plan.floors ?? [];
      const nextFloors = current.filter((f) => f !== floor);
      const sectionFloors = { ...(plan.sectionFloors ?? {}), [section]: nextFloors };
      const nextFloor = plan.floor === floor ? nextFloors[0] : plan.floor;
      commit({
        ...plan,
        sectionFloors,
        floor: nextFloor,
        entities: plan.entities.filter(
          (e) =>
            !(
              e.businessData.area === section &&
              (e.spatialData.floor ?? plan.floor) === floor
            )
        ),
      });
    },
    [plan, commit]
  );

  const undo = useCallback(() => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [plan, ...f]);
    setPlan(prev);
    persist(vertical, prev);
  }, [past, plan, vertical]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, plan]);
    setPlan(next);
    persist(vertical, next);
  }, [future, plan, vertical]);

  const resetDraft = useCallback(() => {
    const fresh = fixtureFor(vertical);
    setPast([]);
    setFuture([]);
    setPlan(fresh);
    persist(vertical, fresh);
  }, [vertical]);

  return {
    plan,
    commit,
    mutate,
    updateEntity,
    updateEntities,
    applyPositions,
    addEntity,
    removeEntity,
    deleteEntities,
    duplicateEntity,
    duplicateEntities,
    setPlanMeta,
    addSection,
    deleteSection,
    addFloor,
    deleteFloor,
    save,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetDraft,
  };
}

export type FloorPlanStore = ReturnType<typeof useFloorPlanStore>;
