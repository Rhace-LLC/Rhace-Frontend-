import { useMemo, useState } from 'react';
import type { VerticalPlugin } from '../core/plugin';
import { setRuntimeBlueprints } from '../domain/blueprintStore';import { useAuth } from '@/contexts/AuthContext';
import { toDomainBlueprint, toDomainReservation } from '../api/adapter';
import { useApiFloorPlanStore } from '../api/useApiFloorPlanStore';
import { useEnsureBlueprints, useResolvedFloorPlan } from '../api/useResolvedFloorPlan';
import { useFloorPlanRealtimeInvalidation } from '../api/useFloorPlanRealtime';
import { useFloorPlanTimeline } from '../api/hooks';
import { FloorPlanWorkbench } from './FloorPlanWorkbench';
import type { Reservation, Vertical } from '../domain/types';
import type { FloorPlanVertical } from '@/types';

/** Layout Canvas page — dedicated to canvas editing only. */
export function PrototypeWorkbench({
  plugin,
  planId: preferredPlanId,
}: {
  plugin: VerticalPlugin;
  planId?: string;
}) {
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

  // Publish live blueprints so plugin render functions can resolve them by id.
  setRuntimeBlueprints(vertical, apiBlueprints);

  const store = useApiFloorPlanStore(plugin.id, planId);
  useFloorPlanRealtimeInvalidation(vendor?._id, planId);

  const [highlightUnitId, setHighlightUnitId] = useState<string | null>(null);
  const [reservationOverrides, setReservationOverrides] = useState<Record<string, Reservation>>({});

  // Canonical reservations come from the API timeline; local overrides layer on top.
  const timelineQuery = useFloorPlanTimeline(planId);
  const reservations = useMemo(() => {
    const base = (timelineQuery.data?.reservations ?? []).map(toDomainReservation);
    return base.map((reservation) => reservationOverrides[reservation.id] ?? reservation);
  }, [timelineQuery.data, reservationOverrides]);

  const handleReservationChange = (next: Reservation) => {
    setReservationOverrides((prev) => ({ ...prev, [next.id]: next }));
  };

  if (isLoading && !planId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Preparing your floor plan…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2 md:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-900">{plugin.label} — Layout Canvas</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <FloorPlanWorkbench
          plugin={plugin}
          store={store}
          highlightUnitId={highlightUnitId}
          onHighlightUnit={setHighlightUnitId}
          reservations={reservations}
          onReservationChange={handleReservationChange}
        />
      </div>
    </div>
  );
}
