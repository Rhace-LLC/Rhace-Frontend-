import type { BusinessData, FloorPlan } from '../../core/types';
import { finalizePlan, makeEntity } from '../generator';

const vipDefs: Array<{ id: string; x: number; y: number; min: number; spend: number; tier: string; party?: string; host?: string; status: string; shape?: 'booth' }> = [
  { id: 'VIP-01', x: 120, y: 120, min: 3000, spend: 2400, tier: 'Prime Stage View', host: 'Alex M.', status: 'reserved', shape: 'booth' },
  { id: 'VIP-02', x: 400, y: 120, min: 5000, spend: 6200, tier: 'Prime Stage View', party: 'Birthday - 8 pax', host: 'Alex M.', status: 'arrived', shape: 'booth' },
  { id: 'VIP-03', x: 700, y: 120, min: 2000, spend: 900, tier: 'Perimeter', status: 'reserved', shape: 'booth' },
  { id: 'VIP-04', x: 120, y: 360, min: 2000, spend: 2000, tier: 'Perimeter', party: 'Corporate - 6 pax', status: 'arrived', shape: 'booth' },
  { id: 'VIP-05', x: 400, y: 360, min: 3000, spend: 1200, tier: 'Prime Stage View', host: 'Sam K.', status: 'reserved', shape: 'booth' },
  { id: 'VIP-06', x: 700, y: 360, min: 5000, spend: 5400, tier: 'Prime Stage View', party: 'All white - 10 pax', status: 'arrived', shape: 'booth' },
];

export function createClubPlan(): FloorPlan {
  const structure = [
    makeEntity({
      entityId: 'c_stage',
      type: 'stage',
      x: 380,
      y: 560,
      width: 440,
      height: 120,
      layer: 'structure',
      businessData: { name: 'Main Stage' },
    }),
    makeEntity({
      entityId: 'c_dj',
      type: 'dj_booth',
      x: 540,
      y: 230,
      width: 120,
      height: 90,
      layer: 'structure',
      businessData: { name: 'DJ Booth' },
    }),
    makeEntity({
      entityId: 'c_dancefloor',
      type: 'dance_floor',
      x: 360,
      y: 340,
      width: 480,
      height: 200,
      layer: 'structure',
      businessData: { name: 'VIP Dancefloor' },
    }),
    makeEntity({
      entityId: 'c_bar_main',
      type: 'bar',
      x: 60,
      y: 560,
      width: 260,
      height: 90,
      layer: 'structure',
      businessData: { name: 'Main Bar' },
    }),
    makeEntity({
      entityId: 'c_bar_side',
      type: 'bar',
      x: 900,
      y: 560,
      width: 240,
      height: 90,
      layer: 'structure',
      businessData: { name: 'Side Bar' },
    }),
    makeEntity({
      entityId: 'c_rope_l',
      type: 'rope',
      x: 80,
      y: 80,
      width: 12,
      height: 260,
      layer: 'structure',
      businessData: { name: 'VIP Rope' },
    }),
    makeEntity({
      entityId: 'c_rope_r',
      type: 'rope',
      x: 1000,
      y: 80,
      width: 12,
      height: 260,
      layer: 'structure',
      businessData: { name: 'VIP Rope' },
    }),
  ];

  const vips = vipDefs.map((v) =>
    makeEntity({
      entityId: `c_${v.id}`,
      type: 'vip_table',
      x: v.x,
      y: v.y,
      width: 180,
      height: 130,
      shape: v.shape ?? 'booth',
      businessData: {
        name: v.id,
        minimumSpend: v.min,
        currentSpend: v.spend,
        tier: v.tier,
        partyName: v.party,
        hostName: v.host,
        status: v.status,
        capacity: 8,
      } as BusinessData,
    })
  );

  return finalizePlan({
    floorPlanId: 'floor_vip_01',
    vertical: 'club',
    name: 'VIP Dancefloor',
    width: 2400,
    height: 1600,
    floor: 'Ground Floor',
    floors: ['Ground Floor'],
    activeArea: '',
    entities: [...structure, ...vips].map((entity) => ({
      ...entity,
      spatialData: { ...entity.spatialData, floor: entity.spatialData.floor ?? 'Ground Floor' },
    })),
  });
}
