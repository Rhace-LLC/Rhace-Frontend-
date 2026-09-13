import { useEffect, useState } from 'react';
import { useCreateFloorPlan, useFloorPlans, useBlueprints } from './hooks';
import type { CreateFloorPlanInput, FloorPlanVertical } from '@/types';

/**
 * Resolves the working floor plan for a vendor: lists plans, auto-creates a
 * default when the vendor has none, and exposes the blueprint catalog.
 * NOTE: nothing is pre-seeded — vendors start from scratch.
 */

export const DEFAULT_PLAN: Record<FloorPlanVertical, CreateFloorPlanInput> = {
  restaurant: {
    vertical: 'restaurant',
    name: 'Main Floor',
    width: 2400,
    height: 1600,
    floor: 'Ground Floor',
    floors: ['Ground Floor'],
    areas: ['Main Dining Area'],
    activeArea: 'Main Dining Area',
  },
  club: {
    vertical: 'club',
    name: 'Main Floor',
    width: 2400,
    height: 1600,
    floor: 'Ground Floor',
    floors: ['Ground Floor'],
    areas: ['Main Room'],
    activeArea: 'Main Room',
  },
  hotel: {
    vertical: 'hotel',
    name: 'Main Building',
    width: 2400,
    height: 1600,
    floor: 'Floor 1',
    floors: ['Floor 1', 'Floor 2'],
    areas: ['Main Wing'],
    activeArea: 'Main Wing',
  },
};

// Cross-mount guard so React StrictMode double-invocation cannot create twice.
const planCreateGuards = new Set<string>();

export function useResolvedFloorPlan(vertical: FloorPlanVertical, preferredId?: string) {
  const plansQuery = useFloorPlans(vertical);
  const createMutation = useCreateFloorPlan();
  const [selectedId, setSelectedId] = useState<string | undefined>(preferredId);

  const plans = plansQuery.data?.items ?? [];

  useEffect(() => {
    if (!plansQuery.isSuccess) return;
    if (plans.length > 0) {
      planCreateGuards.delete(vertical);
      return;
    }
    if (planCreateGuards.has(vertical) || createMutation.isPending) return;
    planCreateGuards.add(vertical);
    createMutation.mutate(DEFAULT_PLAN[vertical], {
      onError: () => planCreateGuards.delete(vertical),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plansQuery.isSuccess, plans.length, vertical]);

  useEffect(() => {
    if (preferredId) setSelectedId(preferredId);
  }, [preferredId]);

  const planId =
    selectedId && plans.some((plan) => plan._id === selectedId) ? selectedId : plans[0]?._id;

  return {
    planId,
    plans,
    setPlanId: setSelectedId,
    isLoading:
      plansQuery.isLoading ||
      (plans.length === 0 && (createMutation.isPending || planCreateGuards.has(vertical))),
  };
}

/** Blueprint catalog for the vertical (no seeding — vendor starts from scratch). */
export function useEnsureBlueprints(vertical: FloorPlanVertical) {
  return useBlueprints(vertical);
}
