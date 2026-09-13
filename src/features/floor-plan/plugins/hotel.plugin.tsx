/* eslint-disable react-refresh/only-export-components */
import { Wrench } from 'lucide-react';
import type { BusinessData, FloorEntity, FloorPlan, SpatialData } from '../core/types';
import type { DrawerContext, TileContext, TopBarContext, ToolbarItem, VerticalPlugin } from '../core/plugin';
import { createHotelPlan } from '../mock/fixtures/hotel';
import { ScopeNav } from '../components/overlays/ScopeNav';

function renderScopeNav(ctx: TopBarContext) {
  const { plan, mode, setPlanMeta, addSection, deleteSection, addFloor, deleteFloor } = ctx;
  const sections = plan.areas ?? [];
  const activeSection = plan.activeArea || sections[0] || '';
  const floors = plan.sectionFloors?.[activeSection] ?? plan.floors ?? [];
  const currentFloor = plan.floor && floors.includes(plan.floor) ? plan.floor : floors[0] ?? '';

  return (
    <ScopeNav
      mode={mode}
      areaLabel="Section"
      areaOptions={sections}
      activeArea={activeSection}
      onSelectArea={(value) =>
        setPlanMeta({
          activeArea: value,
          floor: plan.sectionFloors?.[value]?.[0] ?? plan.floor,
        })
      }
      onAddArea={(name) => addSection(name)}
      onDeleteArea={() => deleteSection(activeSection)}
      floorOptions={floors}
      activeFloor={currentFloor}
      onSelectFloor={(value) => setPlanMeta({ floor: value })}
      onAddFloor={(name) => addFloor(activeSection, name)}
      onDeleteFloor={() => deleteFloor(activeSection, currentFloor)}
    />
  );
}

const STATUS_STYLE: Record<string, string> = {
  clean: 'bg-green-100 text-green-700',
  occupied: 'bg-amber-100 text-amber-700',
  dirty: 'bg-yellow-100 text-yellow-700',
  checkout: 'bg-orange-100 text-orange-700',
  ooo: 'bg-red-100 text-red-700',
};

function renderTile(entity: FloorEntity, ctx: TileContext) {
  const b = entity.businessData;
  const status = String(b.status ?? 'clean');
  const isOOO = status === 'ooo';

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-lg border bg-white p-2 shadow-sm ${
        ctx.selected ? 'border-teal-600 ring-2 ring-teal-500/40' : 'border-gray-300'
      }`}
      style={
        isOOO
          ? {
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(239,68,68,0.15) 0, rgba(239,68,68,0.15) 6px, transparent 6px, transparent 12px)',
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold text-gray-900">{b.name}</div>
        {isOOO && <Wrench size={12} className="text-red-500" />}
      </div>
      <div className="text-[10px] text-gray-500">{String(b.roomType ?? 'Room')}</div>
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize ${
            STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {String(b.housekeeping ?? status)}
        </span>
        {b.guestName ? (
          <span className="max-w-[60%] truncate text-[9px] text-gray-500">
            {String(b.guestName)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TimelineGantt({ checkIn, checkOut }: { checkIn?: string; checkOut?: string }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
  const start = days[0].getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const unit = 100 / 7;

  let left = 0;
  let width = 0;
  if (checkIn && checkOut) {
    const ci = new Date(checkIn).getTime();
    const co = new Date(checkOut).getTime();
    left = Math.max(0, ((ci - start) / dayMs) * unit);
    width = Math.max(unit, ((co - ci) / dayMs) * unit);
    width = Math.min(width, 100 - left);
  }

  return (
    <div>
      <div className="grid grid-cols-7 text-[9px] text-gray-400">
        {days.map((d) => (
          <div key={d.toISOString()} className="text-center">
            {d.toLocaleDateString(undefined, { weekday: 'short' })}
          </div>
        ))}
      </div>
      <div className="relative mt-1 h-4 rounded bg-gray-100">
        {width > 0 && (
          <div
            className="absolute h-full rounded bg-teal-600/70"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        )}
      </div>
      <div className="mt-1 grid grid-cols-7 text-[9px] text-gray-400">
        {days.map((d) => (
          <div key={`${d.toISOString()}-n`} className="text-center">
            {d.getDate()}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderDrawer(entity: FloorEntity, ctx: DrawerContext) {
  const b = entity.businessData;
  const set = (patch: Partial<BusinessData>) => ctx.onUpdate({ businessData: patch });
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-y-2 text-xs">
        <dt className="text-gray-500">Room type</dt>
        <dd className="text-gray-900">{String(b.roomType ?? '—')}</dd>
        <dt className="text-gray-500">Housekeeping</dt>
        <dd className="text-gray-900">{String(b.housekeeping ?? '—')}</dd>
        <dt className="text-gray-500">Guest</dt>
        <dd className="text-gray-900">{String(b.guestName ?? '—')}</dd>
        <dt className="text-gray-500">Check-in</dt>
        <dd className="text-gray-900">
          {b.checkIn ? new Date(String(b.checkIn)).toLocaleDateString() : '—'}
        </dd>
        <dt className="text-gray-500">Check-out</dt>
        <dd className="text-gray-900">
          {b.checkOut ? new Date(String(b.checkOut)).toLocaleDateString() : '—'}
        </dd>
      </dl>

      <div className="border-t border-gray-100 pt-3">
        <p className="mb-2 text-xs font-medium text-gray-700">Next 7 days</p>
        <TimelineGantt checkIn={b.checkIn as string | undefined} checkOut={b.checkOut as string | undefined} />
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <button
          onClick={() => set({ housekeeping: 'Clean', status: 'clean' })}
          className="w-full rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800"
        >
          Mark Clean
        </button>
        <button
          onClick={() => set({ status: 'occupied', housekeeping: 'Occupied' })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Check-In
        </button>
        <button
          onClick={() => set({ housekeeping: 'Out of Order', status: 'ooo' })}
          className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Flag Out of Order
        </button>
      </div>
    </div>
  );
}

function manageToolbarItems({
  selection,
  updateEntity,
}: {
  plan: FloorPlan;
  selection: string[];
  updateEntity: (id: string, patch: { businessData?: Partial<BusinessData>; spatialData?: Partial<SpatialData> }) => void;
}): ToolbarItem[] {
  if (selection.length !== 1) return [];
  const id = selection[0];
  return [
    { id: 'clean', label: 'Mark Clean', onClick: () => updateEntity(id, { businessData: { housekeeping: 'Clean', status: 'clean' } }) },
    { id: 'checkin', label: 'Check-In', onClick: () => updateEntity(id, { businessData: { status: 'occupied', housekeeping: 'Occupied' } }) },
    { id: 'ooo', label: 'Flag OOO', onClick: () => updateEntity(id, { businessData: { housekeeping: 'Out of Order', status: 'ooo' } }) },
  ];
}

export const hotelPlugin: VerticalPlugin = {
  id: 'hotel',
  label: 'Hotel',
  theme: {
    viewport: 'bg-slate-100',
    canvas: 'bg-white',
    gridLine: 'rgba(15,23,42,0.05)',
    structure: 'border-slate-300 bg-slate-100 text-slate-400',
    tile: (_entity, selected) =>
      selected ? 'border-teal-600 ring-2 ring-teal-500/40' : 'border-gray-300',
    accent: 'bg-slate-700',
  },
  entityTypes: [
    { type: 'room', label: 'Room', shape: 'room', width: 170, height: 160 },
    { type: 'corridor', label: 'Corridor', shape: 'rect', width: 400, height: 40, structure: true },
    { type: 'wall', label: 'Wall', shape: 'rect', width: 260, height: 12, structure: true },
    { type: 'door', label: 'Door', shape: 'rect', width: 70, height: 14, structure: true },
    { type: 'window', label: 'Window', shape: 'rect', width: 110, height: 12, structure: true },
    { type: 'entrance', label: 'Entrance', shape: 'rect', width: 110, height: 18, structure: true },
    { type: 'elevator', label: 'Elevator', shape: 'rect', width: 90, height: 90, structure: true },
    { type: 'service_elevator', label: 'Service Elevator', shape: 'rect', width: 70, height: 70, structure: true },
    { type: 'stairs', label: 'Stairs', shape: 'rect', width: 90, height: 130, structure: true },
    { type: 'fire_exit', label: 'Fire Exit', shape: 'rect', width: 70, height: 90, structure: true },
    { type: 'restroom', label: 'Restroom', shape: 'rect', width: 110, height: 90, structure: true },
    { type: 'lobby', label: 'Lobby', shape: 'rect', width: 300, height: 180, structure: true },
    { type: 'reception', label: 'Reception', shape: 'rect', width: 220, height: 70, structure: true },
    { type: 'pool', label: 'Pool', shape: 'rect', width: 320, height: 200, structure: true },
    { type: 'gym', label: 'Gym', shape: 'rect', width: 300, height: 200, structure: true },
    { type: 'meeting_room', label: 'Meeting Room', shape: 'rect', width: 260, height: 180, structure: true },
    { type: 'storage', label: 'Storage', shape: 'rect', width: 140, height: 120, structure: true },
    { type: 'laundry', label: 'Laundry', shape: 'rect', width: 140, height: 120, structure: true },
    { type: 'vending', label: 'Vending', shape: 'rect', width: 40, height: 40, structure: true },
    { type: 'ice_machine', label: 'Ice Machine', shape: 'rect', width: 40, height: 40, structure: true },
    { type: 'parking', label: 'Parking', shape: 'rect', width: 200, height: 120, structure: true },
  ],
  renderTopBar: (ctx) => renderScopeNav(ctx),
  renderManageHeader: (ctx) => renderScopeNav(ctx),
  renderStructureTile: (entity, ctx) => (
    <div
      className={`flex h-full w-full items-center justify-center rounded-md border px-1 text-center text-[9px] uppercase tracking-wide ${
        ctx.selected
          ? 'border-teal-500 bg-teal-50 text-teal-700'
          : 'border-slate-300 bg-slate-100 text-slate-500'
      }`}
    >
      {entity.businessData.name}
    </div>
  ),
  filterEntities: (plan, entities) => {
    const section = plan.activeArea;
    return entities.filter((entity) => {
      const floorOk = (entity.spatialData.floor ?? plan.floor) === plan.floor;
      if (!floorOk) return false;
      if (!section) return true;
      if (entity.spatialData.layer === 'structure') return true;
      return entity.businessData.area === section;
    });
  },
  decorateNewEntity: (entity, plan) => ({
    ...entity,
    spatialData: { ...entity.spatialData, floor: plan.floor },
    businessData: {
      ...entity.businessData,
      area: plan.activeArea || plan.areas?.[0] || 'West Wing',
    },
  }),
  manageToolbarItems,
  attributes: [
    { id: 'accessible', label: 'Accessible' },
    { id: 'balcony', label: 'Balcony' },
    { id: 'connecting', label: 'Connecting' },
    { id: 'quiet', label: 'Quiet' },
    { id: 'pet-friendly', label: 'Pet friendly' },
    { id: 'smoking', label: 'Smoking' },
  ],
  renderTile,
  renderDrawer,
  createMockPlan: createHotelPlan,
};
