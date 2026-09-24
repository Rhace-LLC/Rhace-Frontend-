/* eslint-disable react-refresh/only-export-components */
import type { BusinessData, FloorEntity, FloorPlan, SpatialData } from '../core/types';
import type { DrawerContext, TileContext, TopBarContext, ToolbarItem, VerticalPlugin } from '../core/plugin';
import { SpendTierHeatmap } from '../components/overlays/SpendTierHeatmap';
import { ScopeNav } from '../components/overlays/ScopeNav';
import { BlueprintSpecs } from '../components/BlueprintSpecs';
import { stateMetaFor } from '../domain/states';
import { canTransition } from '../domain/transitions';
import { allBlueprints } from '../domain/blueprintStore';
import { findBlueprint } from '../domain/blueprints';
import type { ClubTableState } from '../domain/types';

function renderScopeNav(ctx: TopBarContext) {
  const { plan, mode, setPlanMeta, addFloor, deleteFloor } = ctx;
  // `??` alone never catches `floors: []` (the backend default) — treat empty
  // lists as missing so the Floor dropdown always has options.
  const floors =
    plan.floors?.length
      ? plan.floors
      : plan.floor
        ? [plan.floor]
        : ['Ground Floor'];
  const currentFloor = plan.floor && floors.includes(plan.floor) ? plan.floor : floors[0];

  return (
    <ScopeNav
      mode={mode}
      floorOptions={floors}
      activeFloor={currentFloor}
      onSelectFloor={(value) => setPlanMeta({ floor: value })}
      onAddFloor={(name) => addFloor('', name)}
      onDeleteFloor={() => deleteFloor('', currentFloor)}
    />
  );
}

function money(value: unknown) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function clubBlueprint(entity: FloorEntity) {
  return findBlueprint(allBlueprints('club'), String(entity.businessData.blueprintId ?? ''));
}

function displayClubState(entity: FloorEntity): ClubTableState {
  const state = String(entity.businessData.status ?? 'available') as ClubTableState;
  if (state === 'arrived_seated' || state === 'under_target_spend' || state === 'target_met') {
    const min = Number(entity.businessData.minimumSpend ?? 0);
    const spend = Number(entity.businessData.currentSpend ?? 0);
    return min > 0 && spend >= min ? 'target_met' : 'under_target_spend';
  }
  return state;
}

function StateChip({ state }: { state: string }) {
  const meta = stateMetaFor('club', state);
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-medium"
      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function renderTile(entity: FloorEntity, ctx: TileContext) {
  const b = entity.businessData;
  const blueprint = clubBlueprint(entity);
  const blueprintMin = blueprint && blueprint.vertical === 'club' ? blueprint.minimumSpend : 0;
  const min = Number(b.minimumSpend ?? blueprintMin);
  const spend = Number(b.currentSpend ?? 0);
  const pct = min > 0 ? Math.round((spend / min) * 100) : 0;
  const met = spend >= min;
  const state = displayClubState(entity);
  const tier = String(b.tier ?? (blueprint && blueprint.vertical === 'club' ? blueprint.tier : ''));
  const prime = tier === 'Prime Stage View' || tier === "Owner's Box";

  return (
    <div
      className={`flex h-full w-full flex-col justify-between rounded-xl border bg-slate-900 p-2 text-slate-100 shadow-lg ${
        ctx.selected ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold">{b.name}</div>
          <div className="text-[10px] text-slate-400">{money(min)} min</div>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
            prime ? 'bg-amber-400/20 text-amber-300' : 'bg-blue-400/20 text-blue-300'
          }`}
        >
          {tier || 'VIP'}
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between text-[10px] text-slate-300">
          <span>{money(b.currentSpend)}</span>
          <span className={met ? 'text-emerald-400' : 'text-amber-400'}>{pct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full ${met ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] text-slate-400">
        <span>{b.hostName ? `Host: ${b.hostName}` : b.partyName ? String(b.partyName) : '—'}</span>
        <StateChip state={state} />
      </div>
    </div>
  );
}

function renderDrawer(entity: FloorEntity, ctx: DrawerContext) {
  const b = entity.businessData;
  const set = (patch: Partial<BusinessData>) => ctx.onUpdate({ businessData: patch });
  const blueprint = clubBlueprint(entity);
  const blueprintMin = blueprint && blueprint.vertical === 'club' ? blueprint.minimumSpend : 0;
  const min = Number(b.minimumSpend ?? blueprintMin);
  const spend = Number(b.currentSpend ?? 0);
  const state = displayClubState(entity);
  const meta = stateMetaFor('club', state);

  const addBottle = () => {
    const nextSpend = spend + 500;
    set({
      currentSpend: nextSpend,
      status: min > 0 && nextSpend >= min ? 'target_met' : 'under_target_spend',
    });
  };

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-y-2 text-xs">
        <dt className="text-gray-500">Blueprint</dt>
        <dd className="text-gray-900">{blueprint?.type ?? '—'}</dd>
        <dt className="text-gray-500">Tier</dt>
        <dd className="text-gray-900">
          {String(b.tier ?? (blueprint && blueprint.vertical === 'club' ? blueprint.tier : '—'))}
        </dd>
        <dt className="text-gray-500">Minimum spend</dt>
        <dd className="text-gray-900">{money(min)}</dd>
        <dt className="text-gray-500">Current spend</dt>
        <dd className="text-gray-900">{money(spend)}</dd>
        <dt className="text-gray-500">Party</dt>
        <dd className="text-gray-900">{String(b.partyName ?? '—')}</dd>
        <dt className="text-gray-500">Host</dt>
        <dd className="text-gray-900">{String(b.hostName ?? '—')}</dd>
        <dt className="text-gray-500">State</dt>
        <dd style={{ color: meta.color }}>{meta.label}</dd>
      </dl>

      <BlueprintSpecs blueprint={blueprint} />

      <div className="space-y-2 border-t border-gray-100 pt-3">
        {canTransition('club', state, 'arrived_seated') && (
          <button
            onClick={() => set({ status: 'arrived_seated' })}
            className="w-full rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800"
          >
            Check-In Guest
          </button>
        )}
        <button
          onClick={() => set({ hostName: 'You' })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Assign VIP Host
        </button>
        {['arrived_seated', 'under_target_spend', 'target_met'].includes(state) && (
          <button
            onClick={addBottle}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Add Bottle (+$500)
          </button>
        )}
        {canTransition('club', state, 'closing_payment') && (
          <button
            onClick={() => set({ status: 'closing_payment' })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Close / Payment
          </button>
        )}
      </div>
    </div>
  );
}

function manageToolbarItems({
  plan,
  selection,
  updateEntity,
}: {
  plan: FloorPlan;
  selection: string[];
  updateEntity: (id: string, patch: { businessData?: Partial<BusinessData>; spatialData?: Partial<SpatialData> }) => void;
}): ToolbarItem[] {
  if (selection.length !== 1) return [];
  const id = selection[0];
  const entity = plan.entities.find((e) => e.entityId === id);
  const spend = Number(entity?.businessData.currentSpend ?? 0);
  const min = Number(entity?.businessData.minimumSpend ?? 0);
  const nextSpend = spend + 500;
  return [
    { id: 'checkin', label: 'Check-In Guest', onClick: () => updateEntity(id, { businessData: { status: 'arrived_seated' } }) },
    { id: 'host', label: 'Assign Host', onClick: () => updateEntity(id, { businessData: { hostName: 'You' } }) },
    {
      id: 'bottle',
      label: 'Add Bottle',
      onClick: () =>
        updateEntity(id, {
          businessData: {
            currentSpend: nextSpend,
            status: min > 0 && nextSpend >= min ? 'target_met' : 'under_target_spend',
          },
        }),
    },
  ];
}

export const nightclubPlugin: VerticalPlugin = {
  id: 'club',
  label: 'Club',
  theme: {
    viewport: 'bg-slate-950',
    canvas: 'bg-slate-900',
    gridLine: 'rgba(148,163,184,0.12)',
    structure: 'border-slate-700 bg-slate-800 text-slate-400',
    tile: (_entity, selected) =>
      selected ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-700',
    accent: 'bg-amber-400',
  },
  entityTypes: [
    { type: 'vip_table', label: 'Table', shape: 'booth', width: 180, height: 130 },
    { type: 'wall', label: 'Wall', shape: 'rect', width: 400, height: 14, structure: true },
    { type: 'door', label: 'Door', shape: 'rect', width: 70, height: 14, structure: true },
    { type: 'window', label: 'Window', shape: 'rect', width: 110, height: 12, structure: true },
    { type: 'entrance', label: 'Entrance', shape: 'rect', width: 130, height: 20, structure: true },
    { type: 'vip_entrance', label: 'VIP Entrance', shape: 'rect', width: 130, height: 20, structure: true },
    { type: 'stairs', label: 'Stairs', shape: 'rect', width: 90, height: 130, structure: true },
    { type: 'dj_booth', label: 'DJ Booth', shape: 'rect', width: 120, height: 90, structure: true },
    { type: 'stage', label: 'Main Stage', shape: 'rect', width: 440, height: 120, structure: true },
    { type: 'dance_floor', label: 'Dance Floor', shape: 'rect', width: 480, height: 200, structure: true },
    { type: 'bar', label: 'Bar', shape: 'rect', width: 240, height: 90, structure: true },
    { type: 'bottle_station', label: 'Bottle Station', shape: 'rect', width: 120, height: 70, structure: true },
    { type: 'bar_back', label: 'Back Bar', shape: 'rect', width: 160, height: 60, structure: true },
    { type: 'led_screen', label: 'LED Screen', shape: 'rect', width: 260, height: 20, structure: true },
    { type: 'lighting_rig', label: 'Lighting Rig', shape: 'rect', width: 200, height: 30, structure: true },
    { type: 'speaker', label: 'Speaker', shape: 'rect', width: 40, height: 40, structure: true },
    { type: 'rope', label: 'VIP Rope', shape: 'rect', width: 12, height: 200, structure: true },
    { type: 'checkpoint', label: 'Security Checkpoint', shape: 'rect', width: 80, height: 60, structure: true },
    { type: 'coat_check', label: 'Coat Check', shape: 'rect', width: 110, height: 60, structure: true },
    { type: 'cashier', label: 'Cashier', shape: 'rect', width: 100, height: 60, structure: true },
    { type: 'photo_booth', label: 'Photo Booth', shape: 'rect', width: 90, height: 90, structure: true },
    { type: 'lounge', label: 'Lounge', shape: 'rect', width: 220, height: 160, structure: true },
    { type: 'cage', label: 'Cage', shape: 'rect', width: 140, height: 140, structure: true },
    { type: 'backstage', label: 'Backstage', shape: 'rect', width: 220, height: 160, structure: true },
    { type: 'restroom', label: 'Restroom', shape: 'rect', width: 110, height: 90, structure: true },
    { type: 'smoking_area', label: 'Smoking Area', shape: 'rect', width: 200, height: 140, structure: true },
  ],
  renderTopBar: (ctx) => renderScopeNav(ctx),
  renderManageHeader: (ctx) => renderScopeNav(ctx),
  filterEntities: (plan, entities) =>
    entities.filter((e) => (e.spatialData.floor ?? plan.floor) === plan.floor),
  decorateNewEntity: (entity, plan) => ({
    ...entity,
    spatialData: { ...entity.spatialData, floor: plan.floor },
  }),
  manageToolbarItems,
  attributes: [
    { id: 'vip', label: 'VIP' },
    { id: 'stage-view', label: 'Stage view' },
    { id: 'bottle-service', label: 'Bottle service' },
    { id: 'wheelchair-accessible', label: 'Wheelchair accessible' },
    { id: 'smoking', label: 'Smoking allowed' },
    { id: 'high-top', label: 'High-top' },
  ],
  renderTile,
  renderDrawer,
  overlays: [
    {
      id: 'spend-tiers',
      label: 'Min-Spend Tiers',
      render: (plan) => <SpendTierHeatmap plan={plan} />,
    },
  ],
};
