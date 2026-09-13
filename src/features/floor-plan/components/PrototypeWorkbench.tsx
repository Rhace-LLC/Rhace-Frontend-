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
import { FloorPlanWorkbench } from './FloorPlanWorkbench';
import { ManagerBoard } from './ManagerBoard';
import { GrandTimeline } from './GrandTimeline';
import { UnitManageModal } from './UnitManageModal';
import type { Reservation, Vertical } from '../domain/types';
import type { FloorPlanVertical } from '@/types';

type WorkbenchView = 'canvas' | 'board' | 'timeline';

const VIEWS: Array<{ id: WorkbenchView; label: string }> = [
  { id: 'canvas', label: 'Layout Canvas' },
  { id: 'board', label: 'Manager Board' },
  { id: 'timeline', label: 'Grand Timeline' },
];

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
  const blueprints = apiBlueprints.length ? apiBlueprints : allBlueprints(vertical);

  const store = useApiFloorPlanStore(plugin.id, planId);
  useFloorPlanRealtimeInvalidation(vendor?._id, planId);

  const plan = store.plan;
  const [view, setView] = useState<WorkbenchView>('canvas');
  const [highlightUnitId, setHighlightUnitId] = useState<string | null>(null);
  const [manageUnitId, setManageUnitId] = useState<string | null>(null);
  const [reservationOverrides, setReservationOverrides] = useState<Record<string, Reservation>>({});

  const allUnits = useMemo(
    () =>
      plan.entities
        .filter((e) => e.spatialData.layer !== 'structure' && e.spatialData.layer !== 'area')
        .map((entity) => entityToUnit(entity, vertical, blueprints)),
    [plan.entities, vertical, blueprints]
  );

  // Canonical reservations come from the API timeline; local overrides layer on top.
  const timelineQuery = useFloorPlanTimeline(planId);
  const reservations = useMemo(() => {
    const base = (timelineQuery.data?.reservations ?? []).map(toDomainReservation);
    return base.map((reservation) => reservationOverrides[reservation.id] ?? reservation);
  }, [timelineQuery.data, reservationOverrides]);

  const reassignMutation = useReassignUnitReservation();

  const handleReservationChange = (next: Reservation) => {
    setReservationOverrides((prev) => ({ ...prev, [next.id]: next }));
  };

  const handleReassign = (reservationId: string, targetUnitId: string) => {
    setHighlightUnitId(targetUnitId);
    reassignMutation.mutate({ reservationId, targetUnitId });
  };

  const unitReservations = highlightUnitId
    ? reservations.filter((r) => r.unitId === highlightUnitId)
    : [];

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
        <h1 className="text-sm font-semibold text-gray-900">{plugin.label} Workbench</h1>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
          LIVE API
        </span>
        <div className="ml-auto inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {VIEWS.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setView(entry.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === entry.id ? 'bg-teal-700 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {view === 'canvas' && (
          <FloorPlanWorkbench
            plugin={plugin}
            store={store}
            highlightUnitId={highlightUnitId}
            onHighlightUnit={setHighlightUnitId}
            reservations={reservations}
            onReservationChange={handleReservationChange}
          />
        )}

        {view === 'board' && (
          <div className="h-full overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
            <ManagerBoard
              plugin={plugin}
              store={store}
              reservations={reservations}
              blueprints={blueprints}
              highlightUnitId={highlightUnitId}
              onManageUnit={setManageUnitId}
            />
          </div>
        )}

        {view === 'timeline' && (
          <GrandTimeline
            vertical={vertical}
            blueprints={blueprints}
            units={allUnits}
            reservations={reservations}
            highlightUnitId={highlightUnitId}
            onReassign={handleReassign}
          />
        )}
      </div>

      {highlightUnitId && unitReservations.length > 0 && view !== 'canvas' && (
        <p className="text-[11px] text-gray-400">
          Highlighted unit has {unitReservations.length} reservation(s).
        </p>
      )}

      <UnitManageModal
        unitId={manageUnitId}
        vertical={vertical}
        blueprints={blueprints}
        onClose={() => setManageUnitId(null)}
      />
    </div>
  );
}
