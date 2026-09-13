import type { FloorPlan } from '../../core/types';
import { finalizePlan, makeEntity } from '../generator';

const tableDefs = [
  { id: 'T01', x: 120, y: 140, cap: 2, stage: 'Entree', minutes: 32, status: 'occupied' },
  { id: 'T02', x: 300, y: 140, cap: 4, stage: 'Dessert', minutes: 45, status: 'occupied' },
  { id: 'T03', x: 480, y: 140, cap: 4, stage: 'Reserved', minutes: 0, status: 'reserved' },
  { id: 'T04', x: 660, y: 140, cap: 6, stage: 'Appetizer', minutes: 12, status: 'occupied' },
  { id: 'T05', x: 120, y: 320, cap: 2, stage: 'Check', minutes: 68, status: 'occupied' },
  { id: 'T06', x: 300, y: 320, cap: 4, stage: 'Entree', minutes: 24, status: 'occupied' },
  { id: 'T07', x: 480, y: 320, cap: 8, stage: 'Available', minutes: 0, status: 'available' },
  { id: 'T08', x: 660, y: 320, cap: 4, stage: 'Available', minutes: 0, status: 'available' },
  { id: 'T09', x: 120, y: 500, cap: 2, stage: 'Entree', minutes: 18, status: 'occupied' },
  { id: 'T10', x: 300, y: 500, cap: 6, stage: 'Reserved', minutes: 0, status: 'reserved' },
  { id: 'T11', x: 120, y: 140, cap: 4, stage: 'Appetizer', minutes: 8, status: 'occupied', floor: 'Rooftop' },
  { id: 'T12', x: 320, y: 140, cap: 10, stage: 'Available', minutes: 0, status: 'available', floor: 'First Floor' },
];

export function createRestaurantPlan(): FloorPlan {
  const structure = [
    makeEntity({
      entityId: 'r_wall_top',
      type: 'wall',
      x: 40,
      y: 40,
      width: 1120,
      height: 14,
      layer: 'structure',
      floor: 'Ground Floor',
      businessData: { name: 'Wall' },
    }),
    makeEntity({
      entityId: 'r_bar',
      type: 'bar',
      x: 900,
      y: 80,
      width: 260,
      height: 110,
      layer: 'structure',
      floor: 'Ground Floor',
      businessData: { name: 'Bar' },
    }),
    makeEntity({
      entityId: 'r_kitchen',
      type: 'kitchen_pass',
      x: 900,
      y: 610,
      width: 260,
      height: 110,
      layer: 'structure',
      floor: 'Ground Floor',
      businessData: { name: 'Kitchen Pass' },
    }),
    makeEntity({
      entityId: 'r_entry',
      type: 'entry',
      x: 40,
      y: 690,
      width: 160,
      height: 60,
      layer: 'structure',
      floor: 'Ground Floor',
      businessData: { name: 'Entrance' },
    }),
  ];

  const areaZones = [
    makeEntity({
      entityId: 'r_area_main',
      type: 'area',
      x: 60,
      y: 80,
      width: 820,
      height: 560,
      layer: 'area',
      floor: 'Ground Floor',
      businessData: { name: 'Main Dining Area', area: 'Main Dining Area' },
    }),
  ];

  const tables = tableDefs.map((t) =>
    makeEntity({
      entityId: `r_${t.id}`,
      type: 'table',
      x: t.x,
      y: t.y,
      width: 140,
      height: 100,
      shape: t.cap > 4 ? 'rectangle' : 'round',
      floor: t.floor ?? 'Ground Floor',
      businessData: {
        name: t.id,
        capacity: t.cap,
        area: 'Main Dining Area',
        section: 'Main Dining Area',
        mealStage: t.stage,
        minutesSeated: t.minutes,
        status: t.status,
      },
    })
  );

  return finalizePlan({
    floorPlanId: 'floor_main_01',
    vertical: 'restaurant',
    name: 'Main Floor',
    width: 2400,
    height: 1600,
    floor: 'Ground Floor',
    floors: ['Ground Floor', 'First Floor', 'Rooftop'],
    areas: ['Main Dining Area'],
    activeArea: 'Main Dining Area',
    entities: [...structure, ...areaZones, ...tables],
  });
}
