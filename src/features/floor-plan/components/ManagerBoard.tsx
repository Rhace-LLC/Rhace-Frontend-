import type { VerticalPlugin } from '../core/plugin';
import type { FloorPlanStore } from '../core/store';
import { entityToUnit } from '../domain/adapter';
import { isAvailableState, isLocked } from '../domain/reservations';
import { allBlueprints } from '../domain/blueprintStore';
import { LockBadge } from './LockBadge';
import type { InventoryBlueprint, Reservation, Vertical } from '../domain/types';

interface ManagerBoardProps {
  plugin: VerticalPlugin;
  store: FloorPlanStore;
  reservations: Reservation[];
  highlightUnitId?: string | null;
  /** Overrides the built-in (mock) blueprint catalog — used by the API layer. */
  blueprints?: InventoryBlueprint[];
  onManageUnit?: (unitId: string) => void;
}

export function ManagerBoard({
  plugin,
  store,
  reservations: _reservations,
  highlightUnitId,
  blueprints: blueprintsProp,
  onManageUnit,
}: ManagerBoardProps) {
  const vertical = plugin.id as Vertical;
  const plan = store.plan;
  const blueprints = blueprintsProp ?? allBlueprints(vertical);

  const scopedEntities = plugin.filterEntities
    ? plugin.filterEntities(plan, plan.entities)
    : plan.entities;

  const scopedUnits = scopedEntities
    .filter((e) => e.spatialData.layer !== 'structure' && e.spatialData.layer !== 'area')
    .map((entity) => ({ unit: entityToUnit(entity, vertical, blueprints), entity }));

  const groups = blueprints
    .map((blueprint) => ({
      blueprint,
      entries: scopedUnits.filter((s) => s.unit.blueprintId === blueprint.id),
    }))
    .filter((group) => group.entries.length > 0);

  const summary = {
    units: scopedUnits.length,
    available: scopedUnits.filter(
      (s) => isAvailableState(vertical, s.unit.state) && !isLocked(s.unit.id)
    ).length,
    locked: scopedUnits.filter((s) => isLocked(s.unit.id)).length,
  };

  return (
    <div className="space-y-6">
      {plugin.renderManageHeader && (
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          {plugin.renderManageHeader({
            plan,
            mode: 'manage',
            setPlanMeta: store.setPlanMeta,
            mutate: store.mutate,
            addSection: store.addSection,
            deleteSection: store.deleteSection,
            addFloor: store.addFloor,
            deleteFloor: store.deleteFloor,
            addEntity: store.addEntity,
            updateEntity: (id, patch) => store.updateEntity(id, patch),
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-white px-3 py-1 font-medium text-gray-700 shadow-sm">
          {summary.units} units
        </span>
        <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
          {summary.available} available
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
          {summary.units - summary.available} reserved
        </span>
        {summary.locked > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
            {summary.locked} locked
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center text-sm text-gray-500">
          No units on this floor.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ blueprint, entries }) => {
            const available = entries.filter(
              (e) => isAvailableState(vertical, e.unit.state) && !isLocked(e.unit.id)
            ).length;
            return (
              <section key={blueprint.id}>
                <header className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-3">
                    <BlueprintThumb blueprint={blueprint} />
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">{blueprint.name}</h2>
                      <p className="text-xs text-gray-500">
                        {blueprint.type} · ${blueprint.basePrice.toLocaleString()} · capacity{' '}
                        {blueprint.capacity}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                      {entries.length} total
                    </span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                      {available} available
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                      {entries.length - available} reserved
                    </span>
                  </div>
                </header>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {entries.map(({ entity, unit }) => (
                    <div
                      key={entity.entityId}
                      className={`relative min-h-[10rem] rounded-xl ${
                        highlightUnitId === entity.entityId
                          ? 'ring-4 ring-teal-400/80 animate-pulse'
                          : ''
                      }`}
                    >
                      {isLocked(unit.id) && (
                        <div className="absolute right-2 top-2 z-10">
                          <LockBadge />
                        </div>
                      )}
                      {plugin.renderManageCard ? (
                        plugin.renderManageCard(entity)
                      ) : (
                        <div className="h-40 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                          {plugin.renderTile(entity, {
                            mode: 'manage',
                            selected: false,
                            vertical: plugin.id,
                          })}
                        </div>
                      )}
                      {onManageUnit && (
                        <button
                          onClick={() => onManageUnit(entity.entityId)}
                          className="absolute bottom-2 right-2 z-10 rounded-md border border-teal-200 bg-white/95 px-2 py-0.5 text-[10px] font-medium text-teal-700 hover:bg-teal-50"
                        >
                          Manage
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BlueprintThumb({ blueprint }: { blueprint: InventoryBlueprint }) {
  const src = blueprint.images[0];
  if (src) {
    return (
      <img
        src={src}
        alt={blueprint.name}
        className="h-12 w-12 rounded-lg object-cover ring-1 ring-gray-200"
      />
    );
  }
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-lg text-xs font-semibold text-white"
      style={{ backgroundColor: blueprint.accent ?? '#0d9488' }}
    >
      {blueprint.type.slice(0, 2)}
    </div>
  );
}
