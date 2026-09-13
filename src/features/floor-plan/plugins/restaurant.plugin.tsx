/* eslint-disable react-refresh/only-export-components */
import { Clock, Users } from 'lucide-react';
import type { BusinessData, FloorEntity, FloorPlan, SpatialData } from '../core/types';
import type { DrawerContext, TileContext, TopBarContext, ToolbarItem, VerticalPlugin } from '../core/plugin';
import { createRestaurantPlan } from '../mock/fixtures/restaurant';
import { uid } from '../mock/generator';
import { SectionHeatmap } from '../components/overlays/SectionHeatmap';
import { ScopeNav } from '../components/overlays/ScopeNav';

const STAGES = ['Appetizer', 'Entree', 'Dessert', 'Check'];

function ServiceRing({ stage }: { stage: string }) {
  const idx = Math.max(0, STAGES.indexOf(stage));
  const pct = (idx + 1) / STAGES.length;
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

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    occupied: 'bg-blue-100 text-blue-700',
    reserved: 'bg-amber-100 text-amber-700',
    available: 'bg-green-100 text-green-700',
    combined: 'bg-purple-100 text-purple-700',
  };
  return map[status ?? ''] ?? 'bg-gray-100 text-gray-600';
}

function renderScopeNav(ctx: TopBarContext) {
  const { plan, mode, setPlanMeta, mutate, deleteSection, addFloor, deleteFloor } = ctx;
  const areas = plan.areas ?? [];
  const activeArea = plan.activeArea || areas[0] || '';
  const floors = plan.floors ?? (plan.floor ? [plan.floor] : ['Ground Floor']);
  const currentFloor = plan.floor ?? floors[0];

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
  const { name, capacity, mealStage, minutesSeated, status } = entity.businessData;
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
        <ServiceRing stage={String(mealStage ?? '')} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">{String(mealStage ?? '')}</span>
        {Number(minutesSeated) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
            <Clock size={10} /> {minutesSeated}m
          </span>
        )}
      </div>
      <span
        className={`mt-1 w-max rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize ${statusBadge(
          String(status)
        )}`}
      >
        {String(status ?? 'available')}
      </span>
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

function renderManageCard(entity: FloorEntity) {
  const b = entity.businessData;
  const rows: Array<[string, string]> = [
    ['Area', String(b.area ?? b.section ?? '—')],
    ['Floor', String(entity.spatialData.floor ?? '—')],
    ['Capacity', String(b.capacity ?? '—')],
    ['Meal stage', String(b.mealStage ?? '—')],
    ['Minutes seated', `${Number(b.minutesSeated ?? 0)} min`],
  ];
  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{b.name}</h3>
          <p className="text-xs capitalize text-gray-500">{String(b.status ?? 'available')}</p>
        </div>
        <div className="flex items-center gap-2">
          <ServiceRing stage={String(b.mealStage ?? '')} />
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusBadge(
              String(b.status)
            )}`}
          >
            {String(b.status ?? 'available')}
          </span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function renderDrawer(entity: FloorEntity, ctx: DrawerContext) {
  const b = entity.businessData;
  const set = (patch: Partial<BusinessData>) => ctx.onUpdate({ businessData: patch });
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-y-2 text-xs">
        <dt className="text-gray-500">Area</dt>
        <dd className="text-gray-900">{String(b.area ?? b.section ?? '—')}</dd>
        <dt className="text-gray-500">Floor</dt>
        <dd className="text-gray-900">{String(entity.spatialData.floor ?? '—')}</dd>
        <dt className="text-gray-500">Capacity</dt>
        <dd className="text-gray-900">{b.capacity ?? '—'}</dd>
        <dt className="text-gray-500">Meal stage</dt>
        <dd className="text-gray-900">{String(b.mealStage ?? '—')}</dd>
        <dt className="text-gray-500">Minutes seated</dt>
        <dd className="text-gray-900">{Number(b.minutesSeated ?? 0)}</dd>
        <dt className="text-gray-500">Status</dt>
        <dd className="capitalize text-gray-900">{String(b.status ?? '—')}</dd>
      </dl>
      <div className="space-y-2 border-t border-gray-100 pt-3">
        <button
          onClick={() => set({ status: 'occupied', mealStage: 'Appetizer', minutesSeated: 0 })}
          className="w-full rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800"
        >
          Seat Party
        </button>
        <button
          onClick={() => set({ mealStage: 'Check' })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Present Check
        </button>
        <button
          onClick={() => set({ status: 'available', mealStage: 'Available', minutesSeated: 0 })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Clear Table
        </button>
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
        updateEntity(a, { businessData: { combinedWith: b, status: 'combined' } });
        updateEntity(b, { businessData: { combinedWith: a, status: 'combined' } });
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
          updateEntity(selection[0], {
            businessData: { status: 'occupied', mealStage: 'Appetizer', minutesSeated: 0 },
          }),
      });
      items.push({
        id: 'clear',
        label: 'Clear Table',
        onClick: () =>
          updateEntity(selection[0], {
            businessData: { status: 'available', mealStage: 'Available', minutesSeated: 0 },
          }),
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
  createMockPlan: createRestaurantPlan,
};
