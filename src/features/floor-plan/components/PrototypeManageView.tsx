import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Box, Plus } from 'lucide-react';
import type { VerticalPlugin } from '../core/plugin';
import { allBlueprints, setRuntimeBlueprints } from '../domain/blueprintStore';
import { entityToUnit } from '../domain/adapter';
import { toDomainBlueprint } from '../api/adapter';
import { useApiFloorPlanStore } from '../api/useApiFloorPlanStore';
import { useEnsureBlueprints, useResolvedFloorPlan } from '../api/useResolvedFloorPlan';
import { useCreateUnit } from '../api/hooks';
import { floorPlanKeys } from '../api/keys';
import { isAvailableState, isLocked } from '../domain/reservations';
import { defaultStateFor } from '../domain/states';
import { LockBadge } from './LockBadge';
import { CreateBlueprintModal } from './CreateBlueprintModal';
import { AddPhysicalUnitModal, type UnitPlacementInput } from './AddPhysicalUnitModal';
import { UnitManageModal } from './UnitManageModal';
import type { InventoryBlueprint, PhysicalUnit, Vertical } from '../domain/types';
import type { FloorPlanVertical } from '@/types';

interface PrototypeManageViewProps {
  plugin: VerticalPlugin;
  floorPlanPath: string;
  description: string;
  planId?: string;
}

type UnitFilter = 'all' | 'available' | 'reserved' | 'locked';

const CONFIG_LABEL: Record<Vertical, string> = {
  hotel: 'Create a Room Config',
  club: 'Create a Table Config',
  restaurant: 'Create a Table Config',
};

export function PrototypeManageView({ plugin, floorPlanPath, description, planId: preferredPlanId }: PrototypeManageViewProps) {
  const vertical = plugin.id as Vertical;
  const queryClient = useQueryClient();
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
  const plan = store.plan;
  const createUnit = useCreateUnit();

  const [filter, setFilter] = useState<UnitFilter>('all');
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [manageUnitId, setManageUnitId] = useState<string | null>(null);

  const scopedEntities = plugin.filterEntities
    ? plugin.filterEntities(plan, plan.entities)
    : plan.entities;

  const scopedUnits = scopedEntities
    .filter((e) => e.spatialData.layer !== 'structure' && e.spatialData.layer !== 'area')
    .map((entity) => ({ unit: entityToUnit(entity, vertical, blueprints), entity }));

  const unitAvailable = (unit: PhysicalUnit) =>
    isAvailableState(vertical, unit.state) && !isLocked(unit.id);

  const summary = {
    units: scopedUnits.length,
    available: scopedUnits.filter((s) => unitAvailable(s.unit)).length,
    locked: scopedUnits.filter((s) => isLocked(s.unit.id)).length,
  };
  const reservedCount = summary.units - summary.available - summary.locked;

  const matchesFilter = (unit: PhysicalUnit): boolean => {
    if (filter === 'all') return true;
    if (filter === 'available') return unitAvailable(unit);
    if (filter === 'locked') return isLocked(unit.id);
    return !unitAvailable(unit) && !isLocked(unit.id);
  };

  const groups = blueprints
    .map((blueprint) => ({
      blueprint,
      entries: scopedUnits
        .filter((s) => s.unit.blueprintId === blueprint.id)
        .filter((s) => matchesFilter(s.unit)),
    }))
    .filter((group) => group.entries.length > 0);

  const floors = plan.floors?.length ? plan.floors : plan.floor ? [plan.floor] : [];
  const sections = plan.areas ?? [];

  const planLink = planId
    ? `${floorPlanPath}${floorPlanPath.includes('?') ? '&' : '?'}planId=${planId}`
    : floorPlanPath;

  const handlePlaceUnit = (input: UnitPlacementInput) => {
    if (!planId) return;
    createUnit.mutate(
      {
        planId,
        input: {
          blueprintId: input.blueprintId,
          label: input.designation || undefined,
          floorId: input.floor,
          sectionId: input.section,
          state: input.state,
        },
      },
      { onSuccess: () => setAddUnitOpen(false) }
    );
  };

  const FILTERS: Array<{ id: UnitFilter; label: string; className: string }> = [
    { id: 'all', label: `${summary.units} units`, className: 'bg-white text-gray-700 shadow-sm' },
    { id: 'available', label: `${summary.available} available`, className: 'bg-green-100 text-green-700' },
    { id: 'reserved', label: `${reservedCount} reserved`, className: 'bg-gray-100 text-gray-600' },
    { id: 'locked', label: `${summary.locked} locked`, className: 'bg-amber-100 text-amber-700' },
  ];

  if (isLoading && !planId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Preparing your floor plan…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold capitalize text-gray-900">
                {plugin.label} — Manager
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setBlueprintModalOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50"
            >
              <Plus size={14} /> {CONFIG_LABEL[vertical]}
            </button>
            <button
              onClick={() => setAddUnitOpen(true)}
              disabled={blueprints.length === 0}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <Box size={14} /> Add Physical Unit
            </button>
            <Link
              to={planLink}
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
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setFilter(entry.id)}
              className={`rounded-full px-3 py-1 font-medium transition-all ${entry.className} ${
                filter === entry.id ? 'ring-2 ring-teal-500 ring-offset-1' : 'opacity-80 hover:opacity-100'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center text-sm text-gray-500">
            {summary.units === 0
              ? 'No units yet. Add a physical unit to get started.'
              : 'No units match this filter.'}
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(({ blueprint, entries }) => {
              const available = entries.filter((e) => unitAvailable(e.unit)).length;
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
                    </div>
                  </header>

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
                        <button
                          onClick={() => setManageUnitId(unit.id)}
                          className="absolute bottom-2 right-2 z-10 rounded-md border border-teal-200 bg-white/95 px-2.5 py-0.5 text-[10px] font-medium text-teal-700 hover:bg-teal-50"
                        >
                          Manage
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <CreateBlueprintModal
        vertical={vertical}
        isOpen={blueprintModalOpen}
        onClose={() => setBlueprintModalOpen(false)}
        onSaved={() => {
          setBlueprintModalOpen(false);
          queryClient.invalidateQueries({ queryKey: floorPlanKeys.all });
        }}
      />

      <AddPhysicalUnitModal
        vertical={vertical}
        isOpen={addUnitOpen}
        blueprints={blueprints}
        floors={floors}
        sections={sections}
        defaultFloor={plan.floor}
        defaultSection={plan.activeArea}
        defaultState={defaultStateFor(vertical)}
        onClose={() => setAddUnitOpen(false)}
        onPlace={handlePlaceUnit}
      />

      <UnitManageModal
        unitId={manageUnitId}
        vertical={vertical}
        blueprints={blueprints}
        onClose={() => setManageUnitId(null)}
      />
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
