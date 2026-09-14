import { useMemo, useState } from 'react';
import type { VerticalPlugin } from '../core/plugin';
import { entityToUnit } from '../domain/adapter';
import { allBlueprints, setRuntimeBlueprints } from '../domain/blueprintStore';
import { useAuth } from '@/contexts/AuthContext';
import { toDomainBlueprint, toDomainReservation } from '../api/adapter';
import { useApiFloorPlanStore } from '../api/useApiFloorPlanStore';
import { useEnsureBlueprints, useResolvedFloorPlan } from '../api/useResolvedFloorPlan';
import { useFloorPlanRealtimeInvalidation } from '../api/useFloorPlanRealtime';
import { useFloorPlanTimeline, useReassignUnitReservation } from '../api/hooks';
import { GrandTimeline } from './GrandTimeline';
import type { Vertical } from '../domain/types';
import type { FloorPlanVertical } from '@/types';

interface PrototypeTimelineViewProps {
  plugin: VerticalPlugin;
  planId?: string;
}

/** Standalone Reservation Calendar / Grand Timeline page. */
export function PrototypeTimelineView({ plugin, planId: preferredPlanId }: PrototypeTimelineViewProps) {
  const vertical = plugin.id as Vertical;
  const { vendor } = useAuth();

  const { planId, isLoading } = useResolvedFloorPlan(
    plugin.id as FloorPlanVertical,
    preferredPlanId
  );
  const blueprintQuery = useEnsureBlueprints(plugin.id as FloorPlanVertical);
  const apiBlueprints = useMemo(
    () => (blueprintQuery.data?.items ?? []).map(toDomainBlueprint),
    [blueprintQuery.data]
  );
  setRuntimeBlueprints(vertical, apiBlueprints);
  const blueprints = apiBlueprints.length ? apiBlueprints : allBlueprints(vertical);

  const store = useApiFloorPlanStore(plugin.id, planId);
  useFloorPlanRealtimeInvalidation(vendor?._id, planId);

  const plan = store.plan;
  const allUnits = useMemo(
    () =>
      plan.entities
        .filter((e) => e.spatialData.layer !== 'structure' && e.spatialData.layer !== 'area')
        .map((entity) => entityToUnit(entity, vertical, blueprints)),
    [plan.entities, vertical, blueprints]
  );

  const timelineQuery = useFloorPlanTimeline(planId);
  const reservations = useMemo(
    () => (timelineQuery.data?.reservations ?? []).map(toDomainReservation),
    [timelineQuery.data]
  );

  const reassignMutation = useReassignUnitReservation();
  const [highlightUnitId, setHighlightUnitId] = useState<string | null>(null);

  const handleReassign = (reservationId: string, targetUnitId: string) => {
    setHighlightUnitId(targetUnitId);
    reassignMutation.mutate({ reservationId, targetUnitId });
  };

  if (isLoading && !planId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Preparing your reservation calendar…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2 md:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-900">
          {plugin.label} — Reservation Calendar
        </h1>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
          LIVE API
        </span>
        <span className="text-[11px] text-gray-400">
          Drag a booking onto another unit of the same blueprint to reassign.
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <GrandTimeline
          vertical={vertical}
          blueprints={blueprints}
          units={allUnits}
          reservations={reservations}
          highlightUnitId={highlightUnitId}
          onReassign={handleReassign}
        />
      </div>

      {highlightUnitId && (
        <p className="text-[11px] text-gray-400">
          Highlighted unit has {reservations.filter((r) => r.unitId === highlightUnitId).length}{' '}
          reservation(s).
        </p>
      )}
    </div>
  );
}
