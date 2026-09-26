/* eslint-disable react-refresh/only-export-components */
import { Clock, Users } from 'lucide-react';
import type { BusinessData, FloorEntity, FloorPlan, SpatialData } from '../core/types';
import type { DrawerContext, ManageCardActions, TileContext, TopBarContext, ToolbarItem, VerticalPlugin } from '../core/plugin';
import { uid } from '../core/ids';
import { SectionHeatmap } from '../components/overlays/SectionHeatmap';
import { ScopeNav } from '../components/overlays/ScopeNav';
import { BlueprintSpecs } from '../components/BlueprintSpecs';
import { ManageUnitCard } from '../components/ManageUnitCard';
import { stateMetaFor } from '../domain/states';
import { canTransition } from '../domain/transitions';
import { allBlueprints } from '../domain/blueprintStore';
import { findBlueprint } from '../domain/blueprints';
import type { RestaurantTableState } from '../domain/types';
import { formatBlueprintPricing, getBlueprintPricing } from '../domain/pricing';

const RESTAURANT_STATE_ORDER: RestaurantTableState[] = [
  'available',
  'reserved_held',
  'seated_ordering',
  'entrees_served',
  'awaiting_check',
  'dirty_bussing',
];

function ServiceRing({ state }: { state: string }) {
  const idx = Math.max(0, RESTAURANT_STATE_ORDER.indexOf(state as RestaurantTableState));
  const pct = (idx + 1) / RESTAURANT_STATE_ORDER.length;
  const circumference = 2 * Math.PI * 9;
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 -rotate-90">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="#0A6C6D"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${pct * circumference} ${circumference}`}
      />
    </svg>
  );
}

function StateChip({ state, className = '' }: { state: string; className?: string }) {
  const meta = stateMetaFor('restaurant', state);
  return (
    <span
      className={`w-max rounded-full px-1.5 py-0.5 text-[9px] font-medium ${className}`}
      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function restaurantBlueprint(entity: FloorEntity) {
  return findBlueprint(allBlueprints('restaurant'), String(entity.businessData.blueprintId ?? ''));
}

function renderScopeNav(ctx: TopBarContext) {
  const { plan, mode, setPlanMeta, mutate, deleteSection, addFloor, deleteFloor } = ctx;
  const areas = plan.areas ?? [];
  const activeArea = plan.activeArea || areas[0] || '';
  // `??` alone never catches `floors: []` (the backend default) — treat empty
  // lists as missing so the Floor dropdown always has options.
  const floors =
    plan.floors?.length
      ? plan.floors
      : plan.floor
        ? [plan.floor]
        : ['Ground Floor'];
  const currentFloor = plan.floor && floors.includes(plan.floor) ? plan.floor : floors[0];

  const addArea = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    mutate((p) => {
      if ((p.areas ?? []).includes(trimmed)) return { ...p, activeArea: trimmed };
      return {
        ...p,
        areas: [...(p.areas ?? []), trimmed],
        activeArea: trimmed,
        entities: [
          ...p.entities,
          {
            entityId: uid('area'),
            type: 'area',
            businessData: { name: trimmed, area: trimmed },
            spatialData: {
              floorPlanId: p.floorPlanId,
              x: 80,
              y: 80,
              width: 360,
              height: 260,
              rotation: 0,
              shape: 'rect',
              layer: 'area',
              floor: p.floor,
            },
          },
        ],
      };
    });
  };

  return (
    <ScopeNav
      mode={mode}
      areaLabel="Area"
      areaOptions={areas}
      activeArea={activeArea}
      onSelectArea={(value) => setPlanMeta({ activeArea: value })}
      onAddArea={addArea}
      onDeleteArea={() => deleteSection(activeArea)}
      floorOptions={floors}
      activeFloor={currentFloor}
      onSelectFloor={(value) => setPlanMeta({ floor: value })}
      onAddFloor={(name) => addFloor('', name)}
      onDeleteFloor={() => deleteFloor('', currentFloor)}
    />
  );
}

function renderTile(entity: FloorEntity, ctx: TileContext) {
  const { name, capacity, minutesSeated, status } = entity.businessData;
  return (
    <div
      className={`flex h-full w-full flex-col justify-between rounded-xl border bg-white p-2 shadow-sm transition-shadow ${
        ctx.selected ? 'border-teal-600 ring-2 ring-teal-500/40' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-900">{name}</div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Users size={10} /> {capacity ?? '—'}
          </div>
        </div>
        <ServiceRing state={String(status ?? 'available')} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">{restaurantBlueprint(entity)?.type ?? ''}</span>
        {Number(minutesSeated) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
            <Clock size={10} /> {minutesSeated}m
          </span>
        )}
      </div>
      <StateChip state={String(status ?? 'available')} className="mt-1" />
    </div>
  );
}

function renderAreaTile(entity: FloorEntity, ctx: TileContext) {
  return (
    <div
      className={`flex h-full w-full items-start rounded-2xl border-2 border-dashed p-3 ${
        ctx.selected ? 'border-teal-600 bg-teal-500/10' : 'border-teal-400/60 bg-teal-500/5'
      }`}
    >
      <span className="rounded bg-white/85 px-2 py-0.5 text-xs font-semibold text-teal-700">
        {entity.businessData.name}
      </span>
    </div>
  );
}

function renderManageCard(entity: FloorEntity, actions: ManageCardActions) {
  const b = entity.businessData;
  const blueprint = restaurantBlueprint(entity);
  const meta = stateMetaFor('restaurant', String(b.status ?? 'available'));
  const area = b.area ?? b.section;
  const floor = entity.spatialData.floor;
  const minutes = typeof b.minutesSeated === 'number' ? b.minutesSeated : undefined;
  return (
    <ManageUnitCard
      kind="Table"
      name={String(b.name)}
      typeLabel={blueprint?.type}
      statusLabel={meta.label}
      statusColor={meta.color}
      locationLabel={
        [area ? String(area) : '', floor ? `Floor ${floor}` : ''].filter(Boolean).join(' · ') ||
        undefined
      }
      extras={
        <div className="flex items-center justify-between gap-2">
          <p className="type-res-small font-normal text-res-ink-muted">
            Seats {String(b.capacity ?? '—')}
            {minutes !== undefined ? ` · sat ${minutes} min` : ''}
          </p>
          <span className="flex items-center gap-1.5">
            <ServiceRing state={String(b.status ?? 'available')} />
            <span className="type-res-small font-semibold text-res-ink">
              {blueprint ? formatBlueprintPricing(getBlueprintPricing(blueprint)) : ''}
            </span>
          </span>
        </div>
      }
      onManage={actions.onManage}
    />
  );
}

function renderDrawer(entity: FloorEntity, ctx: DrawerContext) {
  const b = entity.businessData;
  const set = (patch: Partial<BusinessData>) => ctx.onUpdate({ businessData: patch });
  const blueprint = restaurantBlueprint(entity);
  const meta = stateMetaFor('restaurant', String(b.status ?? 'available'));
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-y-2 text-xs">
        <dt className="text-gray-500">Blueprint</dt>
        <dd className="text-gray-900">{blueprint?.type ?? '—'}</dd>
        <dt className="text-gray-500">Area</dt>
        <dd className="text-gray-900">{String(b.area ?? b.section ?? '—')}</dd>
        <dt className="text-gray-500">Floor</dt>
        <dd className="text-gray-900">{String(entity.spatialData.floor ?? '—')}</dd>
        <dt className="text-gray-500">Capacity</dt>
        <dd className="text-gray-900">{b.capacity ?? '—'}</dd>
        <dt className="text-gray-500">State</dt>
        <dd style={{ color: meta.color }}>{meta.label}</dd>
      </dl>

      <BlueprintSpecs blueprint={blueprint} />

      <div className="space-y-2 border-t border-gray-100 pt-3">
        {(
          [
            ['seated_ordering', 'Seat Party'],
            ['entrees_served', 'Entrees Served'],
            ['awaiting_check', 'Present Check'],
            ['dirty_bussing', 'Bussing'],
            ['available', 'Clear Table'],
          ] as const
        ).map(([target, label]) =>
          canTransition('restaurant', String(b.status ?? 'available'), target) ? (
            <button
              key={target}
              onClick={() => set({ status: target })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {label}
            </button>
          ) : null
        )}
      </div>
    </div>
  );
}

function manageToolbarItems({
  plan,
  selection,
  updateEntity,
  clearSelection,
}: {
  plan: FloorPlan;
  selection: string[];
  updateEntity: (id: string, patch: { businessData?: Partial<BusinessData>; spatialData?: Partial<SpatialData> }) => void;
  clearSelection: () => void;
}): ToolbarItem[] {
  const items: ToolbarItem[] = [];
  if (selection.length === 2) {
    items.push({
      id: 'combine',
      label: 'Combine for Large Party',
      onClick: () => {
        const [a, b] = selection;
        updateEntity(a, { businessData: { combinedWith: b, status: 'seated_ordering' } });
        updateEntity(b, { businessData: { combinedWith: a, status: 'seated_ordering' } });
        clearSelection();
      },
    });
  }
  if (selection.length === 1) {
    const entity = plan.entities.find((e) => e.entityId === selection[0]);
    if (entity) {
      items.push({
        id: 'seat',
        label: 'Seat Party',
        onClick: () =>
          updateEntity(selection[0], { businessData: { status: 'seated_ordering' } }),
      });
      items.push({
        id: 'check',
        label: 'Present Check',
        onClick: () =>
          updateEntity(selection[0], { businessData: { status: 'awaiting_check' } }),
      });
      items.push({
        id: 'clear',
        label: 'Clear Table',
        onClick: () => updateEntity(selection[0], { businessData: { status: 'available' } }),
      });
    }
  }
  return items;
}

export const restaurantPlugin: VerticalPlugin = {
  id: 'restaurant',
  label: 'Restaurant',
  theme: {
    viewport: 'bg-gray-50',
    canvas: 'bg-white',
    gridLine: 'rgba(15,23,42,0.06)',
    structure: 'border-gray-300 bg-gray-100 text-gray-400',
    tile: (_entity, selected) =>
      selected ? 'border-teal-600 ring-2 ring-teal-500/40' : 'border-gray-200',
    accent: 'bg-teal-700',
  },
  entityTypes: [
    { type: 'table', label: 'Table', shape: 'round', width: 140, height: 100 },
    { type: 'wall', label: 'Wall', shape: 'rect', width: 400, height: 14, structure: true },
    { type: 'door', label: 'Door', shape: 'rect', width: 70, height: 14, structure: true },
    { type: 'window', label: 'Window', shape: 'rect', width: 110, height: 12, structure: true },
    { type: 'entry', label: 'Entrance', shape: 'rect', width: 160, height: 60, structure: true },
    { type: 'stairs', label: 'Stairs', shape: 'rect', width: 90, height: 130, structure: true },
    { type: 'bar', label: 'Bar', shape: 'rect', width: 260, height: 110, structure: true },
    { type: 'counter', label: 'Counter', shape: 'rect', width: 220, height: 60, structure: true },
    { type: 'kitchen_pass', label: 'Kitchen Pass', shape: 'rect', width: 200, height: 100, structure: true },
    { type: 'service_station', label: 'Service Station', shape: 'rect', width: 140, height: 80, structure: true },
    { type: 'host_stand', label: 'Host Stand', shape: 'rect', width: 100, height: 60, structure: true },
    { type: 'waiting_area', label: 'Waiting Area', shape: 'rect', width: 180, height: 120, structure: true },
    { type: 'restroom', label: 'Restroom', shape: 'rect', width: 110, height: 90, structure: true },
    { type: 'buffet', label: 'Buffet', shape: 'rect', width: 240, height: 80, structure: true },
    { type: 'fireplace', label: 'Fireplace', shape: 'rect', width: 140, height: 60, structure: true },
    { type: 'divider', label: 'Divider', shape: 'rect', width: 220, height: 16, structure: true },
    { type: 'planter', label: 'Planter', shape: 'rect', width: 90, height: 90, structure: true },
    { type: 'patio', label: 'Patio', shape: 'rect', width: 320, height: 200, structure: true },
  ],
  attributes: [
    { id: 'indoor', label: 'Indoor' },
    { id: 'outdoor', label: 'Outdoor' },
    { id: 'vip', label: 'VIP' },
    { id: 'near-window', label: 'Near window' },
    { id: 'wheelchair-accessible', label: 'Wheelchair accessible' },
    { id: 'high-chair', label: 'High-chair friendly' },
    { id: 'quiet', label: 'Quiet area' },
    { id: 'bar', label: 'Bar' },
  ],
  renderTopBar: (ctx) => renderScopeNav(ctx),
  renderManageHeader: (ctx) => renderScopeNav(ctx),
  filterEntities: (plan, entities) => {
    const area = plan.activeArea;
    return entities.filter((e) => {
      if ((e.spatialData.floor ?? plan.floor) !== plan.floor) return false;
      if (!area || e.spatialData.layer === 'structure') return true;
      return e.businessData.area === area;
    });
  },
  decorateNewEntity: (entity, plan) => ({
    ...entity,
    spatialData: { ...entity.spatialData, floor: plan.floor },
    businessData: {
      ...entity.businessData,
      area: plan.activeArea ?? plan.areas?.[0] ?? 'Main Dining Area',
    },
  }),
  manageToolbarItems,
  renderTile,
  renderAreaTile,
  renderManageCard,
  renderDrawer,
  overlays: [
    {
      id: 'sections',
      label: 'Dining Areas',
      render: (plan) => <SectionHeatmap plan={plan} />,
    },
  ],
};
