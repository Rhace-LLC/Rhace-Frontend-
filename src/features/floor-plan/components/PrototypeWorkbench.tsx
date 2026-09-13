import { useEffect, useMemo, useState } from 'react';
import type { VerticalPlugin } from '../core/plugin';
import { useFloorPlanStore } from '../mock/mockStore';
import { entityToUnit } from '../domain/adapter';
import { allBlueprints } from '../domain/blueprintStore';
import { seedReservations } from '../domain/reservations.fixture';
import { FloorPlanWorkbench } from './FloorPlanWorkbench';
import { ManagerBoard } from './ManagerBoard';
import { GrandTimeline } from './GrandTimeline';
import { StorefrontSimulator } from './StorefrontSimulator';
import type { Reservation, Vertical } from '../domain/types';

type WorkbenchView = 'canvas' | 'board' | 'timeline';

const VIEWS: Array<{ id: WorkbenchView; label: string }> = [
  { id: 'canvas', label: 'Layout Canvas' },
  { id: 'board', label: 'Manager Board' },
  { id: 'timeline', label: 'Grand Timeline' },
];

export function PrototypeWorkbench({ plugin }: { plugin: VerticalPlugin }) {
  const store = useFloorPlanStore(plugin.id);
  const vertical = plugin.id as Vertical;
  const plan = store.plan;
  const blueprints = allBlueprints(vertical);
  const [view, setView] = useState<WorkbenchView>('canvas');
  const [highlightUnitId, setHighlightUnitId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const allUnits = useMemo(
    () =>
      plan.entities
        .filter((e) => e.spatialData.layer !== 'structure' && e.spatialData.layer !== 'area')
        .map((entity) => entityToUnit(entity, vertical, blueprints)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan.entities, vertical]
  );

  // (Re)seed reservations whenever the unit set changes.
  useEffect(() => {
    setReservations(seedReservations(vertical, allUnits, blueprints));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical, allUnits.length]);

  const handleReservationChange = (next: Reservation) => {
    setReservations((prev) => prev.map((r) => (r.id === next.id ? next : r)));
  };

  const handleReassign = (reservationId: string, targetUnitId: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === reservationId ? { ...r, unitId: targetUnitId } : r))
    );
    setHighlightUnitId(targetUnitId);
  };

  const unitReservations = highlightUnitId
    ? reservations.filter((r) => r.unitId === highlightUnitId)
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2 md:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-900">{plugin.label} Workbench</h1>
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

      <StorefrontSimulator
        vertical={vertical}
        blueprints={blueprints}
        units={allUnits}
        reservations={reservations}
        onBooked={(unitId) => setHighlightUnitId(unitId)}
      />

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
              highlightUnitId={highlightUnitId}
              onBooked={() => undefined}
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
    </div>
  );
}
