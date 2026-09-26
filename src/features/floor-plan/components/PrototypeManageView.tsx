import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Box, ExternalLink, Plus } from 'lucide-react';
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
import { formatBlueprintPricing, getBlueprintPricing } from '../domain/pricing';
import type { FloorPlanVertical } from '@/types';

interface PrototypeManageViewProps {
  plugin: VerticalPlugin;
  floorPlanPath: string;
  description: string;
  planId?: string;
}

type UnitFilter = 'all' | 'available' | 'reserved' | 'locked';

const KIND_LABEL: Record<Vertical, string> = {
  hotel: 'Room',
  club: 'Table',
  restaurant: 'Table',
};

const KIND_PLURAL: Record<Vertical, string> = {
  hotel: 'Rooms',
  club: 'Tables',
  restaurant: 'Tables',
};

export function PrototypeManageView({ plugin, floorPlanPath, description, planId: preferredPlanId }: PrototypeManageViewProps) {
  const vertical = plugin.id as Vertical;
  const kind = KIND_LABEL[vertical];
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

  const FILTERS: Array<{ id: UnitFilter; label: string }> = [
    { id: 'all', label: `${summary.units} total` },
    { id: 'available', label: `${summary.available} open` },
    { id: 'reserved', label: `${reservedCount} busy` },
    { id: 'locked', label: `${summary.locked} locked` },
  ];

  if (isLoading && !planId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-res-surface">
        <p className="type-res-body font-normal text-res-ink-muted">Setting up your floor map…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-res-surface p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="type-res-h2 text-res-ink">{KIND_PLURAL[vertical]}</h1>
            <p className="type-res-body mt-1 font-normal text-res-ink-muted">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setBlueprintModalOpen(true)}
              className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-card px-4 py-2.5 font-semibold text-res-ink shadow-res-low transition-all outline-none hover:text-res-brand hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand"
            >
              <Plus size={14} /> Add {kind.toLowerCase()} type
            </button>
            <button
              onClick={() => setAddUnitOpen(true)}
              disabled={blueprints.length === 0}
              className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-card px-4 py-2.5 font-semibold text-res-ink shadow-res-low transition-all outline-none hover:text-res-brand hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Box size={14} /> Add {kind.toLowerCase()}
            </button>
            <Link
              to={planLink}
              className="type-res-small flex items-center gap-1.5 rounded-full bg-res-brand px-4 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
            >
              Floor map <ExternalLink size={14} />
            </Link>
          </div>
        </div>

        {plugin.renderManageHeader && (
          <div className="mb-5 rounded-res-lg bg-res-card p-4 shadow-res-low">
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

        <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
          <div
            role="tablist"
            aria-label="Filter by status"
            className="flex w-full gap-1 rounded-res-md bg-res-card p-1 shadow-res-low sm:w-max sm:rounded-full"
          >
            {FILTERS.map((entry) => {
              const isActive = filter === entry.id;
              return (
                <button
                  key={entry.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilter(entry.id)}
                  className={`type-res-small flex-1 cursor-pointer rounded-full px-4 py-2 whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-res-brand sm:flex-none ${
                    isActive
                      ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                      : 'text-res-ink-muted hover:text-res-ink'
                  }`}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="mt-4 rounded-res-lg bg-res-card px-6 py-14 text-center shadow-res-low">
            <p className="type-res-h3 text-res-ink">
              {summary.units === 0
                ? `No ${kind.toLowerCase()}s yet`
                : 'Nothing matches this filter'}
            </p>
            <p className="type-res-small mt-1 font-normal text-res-ink-muted">
              {summary.units === 0
                ? `Add your first ${kind.toLowerCase()} to get started.`
                : 'Try a different status above.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {groups.map(({ blueprint, entries }) => {
              const available = entries.filter((e) => unitAvailable(e.unit)).length;
              return (
                <section key={blueprint.id} className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
                  <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-res-line pb-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <BlueprintThumb blueprint={blueprint} />
                      <div className="min-w-0">
                        <h2 className="type-res-h3 line-clamp-1 text-res-ink">{blueprint.name}</h2>
                        <p className="type-res-small line-clamp-1 font-normal text-res-ink-muted">
                          {blueprint.type} · {formatBlueprintPricing(getBlueprintPricing(blueprint))} · seats{' '}
                          {blueprint.capacity}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink-muted">
                        {entries.length} total
                      </span>
                      <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
                        {available} open
                      </span>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {entries.map(({ entity, unit }) => (
                      <div key={entity.entityId} className="relative min-h-[10rem]">
                        {isLocked(unit.id) && (
                          <div className="absolute top-2 right-2 z-10">
                            <LockBadge />
                          </div>
                        )}
                        {plugin.renderManageCard ? (
                          plugin.renderManageCard(entity, {
                            onManage: () => setManageUnitId(unit.id),
                          })
                        ) : (
                          <>
                            <div className="h-40 rounded-res-md border border-res-line bg-res-card p-2 shadow-res-low">
                              {plugin.renderTile(entity, {
                                mode: 'manage',
                                selected: false,
                                vertical: plugin.id,
                              })}
                            </div>
                            <button
                              onClick={() => setManageUnitId(unit.id)}
                              className="type-res-small absolute right-2 bottom-2 z-10 cursor-pointer rounded-full bg-res-card px-4 py-2 font-semibold text-res-ink shadow-res-low transition-all outline-none hover:text-res-brand hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand"
                            >
                              Manage
                            </button>
                          </>
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
        loading="lazy"
        className="h-12 w-12 shrink-0 rounded-res-sm object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-res-sm bg-res-surface">
      <span className="type-res-small font-semibold text-res-ink-muted">
        {blueprint.type.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
