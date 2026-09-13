export const floorPlanKeys = {
  all: ['floor-plan'] as const,
  lists: () => [...floorPlanKeys.all, 'list'] as const,
  list: (vertical?: string) => [...floorPlanKeys.lists(), vertical ?? 'all'] as const,
  details: () => [...floorPlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...floorPlanKeys.details(), id] as const,
  layout: (id: string) => [...floorPlanKeys.detail(id), 'layout'] as const,
  audit: (id: string) => [...floorPlanKeys.detail(id), 'audit'] as const,
  unitsRoot: (id: string) => [...floorPlanKeys.detail(id), 'units'] as const,
  units: (id: string, filters?: Record<string, unknown>) =>
    [...floorPlanKeys.unitsRoot(id), filters ?? {}] as const,
  unitRoot: () => [...floorPlanKeys.all, 'unit'] as const,
  unit: (unitId: string) => [...floorPlanKeys.unitRoot(), unitId] as const,
  unitActivity: (unitId: string) => [...floorPlanKeys.unit(unitId), 'activity'] as const,
  blueprintsRoot: () => [...floorPlanKeys.all, 'blueprints'] as const,
  blueprints: (vertical?: string) =>
    [...floorPlanKeys.blueprintsRoot(), vertical ?? 'all'] as const,
};
