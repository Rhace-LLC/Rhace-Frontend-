import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RotateCcw } from 'lucide-react';
import type { VerticalPlugin } from '../core/plugin';
import { useFloorPlanStore } from '../mock/mockStore';
import { allBlueprints } from '../domain/blueprintStore';
import { entityToUnit } from '../domain/adapter';
import { isAvailableState, isLocked } from '../domain/reservations';
import { seedReservations } from '../domain/reservations.fixture';
import { canTransition, nextStates } from '../domain/transitions';
import { stateMetaFor } from '../domain/states';
import { LockBadge } from './LockBadge';
import type { InventoryBlueprint, UnitState, Vertical } from '../domain/types';

interface PrototypeManageViewProps {
  plugin: VerticalPlugin;
  floorPlanPath: string;
  description: string;
}

export function PrototypeManageView({ plugin, floorPlanPath, description }: PrototypeManageViewProps) {
  const store = useFloorPlanStore(plugin.id);
  const vertical = plugin.id as Vertical;
  const plan = store.plan;
  const blueprints = allBlueprints(vertical);

  const allUnits = plan.entities
    .filter((e) => e.spatialData.layer !== 'structure' && e.spatialData.layer !== 'area')
    .map((entity) => entityToUnit(entity, vertical, blueprints));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reservations = useMemo(
    () => seedReservations(vertical, allUnits, blueprints),
    [vertical, plan.entities.length]
  );

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

  const batchTargets = (entries: typeof scopedUnits): UnitState[] => {
    const set = new Set<UnitState>();
    entries.forEach(({ unit }) =>
      nextStates(vertical, unit.state).forEach((state) => set.add(state))
    );
    return Array.from(set);
  };

  const applyBatch = (entries: typeof scopedUnits, target: UnitState) => {
    const ids = entries
      .filter(({ unit }) => canTransition(vertical, unit.state, target))
      .map(({ entity }) => entity.entityId);
    if (!ids.length) return;
    store.updateEntities(ids, () => ({ businessData: { status: target } }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">
                {plugin.label} — Prototype Manager
              </h1>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                MOCK DATA
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={store.resetDraft}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <Link
              to={floorPlanPath}
              className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800"
            >
              Open floor plan <ExternalLink size={14} />
            </Link>
          </div>
        </div>

        {plugin.renderManageHeader && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3">
            {plugin.renderManageHeader({
              plan: store.plan,
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

        <div className="mb-6 flex flex-wrap gap-2 text-xs">
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
          <span className="rounded-full bg-white px-3 py-1 text-gray-400 shadow-sm">
            {reservations.length} seeded reservations
          </span>
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
              const targets = batchTargets(entries);
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

                  {targets.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px]">
                      <span className="font-medium text-gray-500">Batch:</span>
                      {targets.map((target) => {
                        const meta = stateMetaFor(vertical, target);
                        const count = entries.filter(({ unit }) =>
                          canTransition(vertical, unit.state, target)
                        ).length;
                        if (!count) return null;
                        return (
                          <button
                            key={target}
                            onClick={() => applyBatch(entries, target)}
                            className="rounded-full border px-2.5 py-1 font-medium transition-colors hover:bg-gray-50"
                            style={{ borderColor: `${meta.color}55`, color: meta.color }}
                          >
                            Mark {count} → {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {entries.map(({ entity, unit }) => (
                      <div key={entity.entityId} className="relative min-h-[10rem]">
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
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
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
