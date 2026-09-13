import type { FloorPlan } from '../../core/types';
import { finalizePlan, makeEntity } from '../generator';

function daysFromNow(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

const roomDefs = [
  { id: '401', x: 120, y: 140, type: 'King Suite', hk: 'Dirty', guest: 'J. Okafor', status: 'dirty', building: 'Main Building', floor: 'Level 04', ci: -1, co: 1 },
  { id: '402', x: 320, y: 140, type: 'Double Queen', hk: 'Check-out', guest: 'A. Bello', status: 'checkout', building: 'Main Building', floor: 'Level 04', ci: -3, co: 0 },
  { id: '403', x: 520, y: 140, type: 'Deluxe King', hk: 'Occupied', guest: 'M. Chen', status: 'occupied', building: 'Main Building', floor: 'Level 04', ci: 0, co: 2 },
  { id: '404', x: 720, y: 140, type: 'Twin', hk: 'Clean', guest: '', status: 'clean', building: 'Main Building', floor: 'Level 04' },
  { id: '405', x: 120, y: 340, type: 'King Suite', hk: 'Occupied', guest: 'R. Patel', status: 'occupied', building: 'Main Building', floor: 'Level 04', ci: -2, co: 3 },
  { id: '406', x: 320, y: 340, type: 'Deluxe King', hk: 'Out of Order', guest: '', status: 'ooo', building: 'Main Building', floor: 'Level 04' },
  { id: '407', x: 520, y: 340, type: 'Double Queen', hk: 'Clean', guest: '', status: 'clean', building: 'Main Building', floor: 'Level 04' },
  { id: '408', x: 720, y: 340, type: 'Twin', hk: 'Dirty', guest: 'L. Gomez', status: 'dirty', building: 'Main Building', floor: 'Level 04', ci: -1, co: 2 },
  { id: '501', x: 120, y: 540, type: 'Executive Suite', hk: 'Occupied', guest: 'K. Adeyemi', status: 'occupied', building: 'Main Building', floor: 'Level 05', ci: 0, co: 5 },
  { id: '502', x: 320, y: 540, type: 'Deluxe King', hk: 'Clean', guest: '', status: 'clean', building: 'Main Building', floor: 'Level 05' },
  { id: '601', x: 120, y: 140, type: 'Presidential Suite', hk: 'Clean', guest: '', status: 'clean', building: 'Tower B', floor: 'Level 01' },
  { id: '602', x: 340, y: 140, type: 'Deluxe King', hk: 'Dirty', guest: 'S. Ibrahim', status: 'dirty', building: 'Tower B', floor: 'Level 01', ci: 0, co: 1 },
  { id: '701', x: 120, y: 140, type: 'Twin', hk: 'Occupied', guest: 'N. Adeleke', status: 'occupied', building: 'Tower B', floor: 'Level 02', ci: -1, co: 2 },
];

export function createHotelPlan(): FloorPlan {
  const structure = [
    makeEntity({
      entityId: 'h_corridor',
      type: 'corridor',
      x: 80,
      y: 60,
      width: 1080,
      height: 40,
      layer: 'structure',
      floor: 'Level 04',
      businessData: { name: 'Corridor', area: 'Main Building' },
    }),
    makeEntity({
      entityId: 'h_elevator',
      type: 'elevator',
      x: 1000,
      y: 340,
      width: 90,
      height: 90,
      layer: 'structure',
      floor: 'Level 04',
      businessData: { name: 'Elevator', area: 'Main Building' },
    }),
    makeEntity({
      entityId: 'h_fire_exit',
      type: 'fire_exit',
      x: 60,
      y: 340,
      width: 70,
      height: 90,
      layer: 'structure',
      floor: 'Level 04',
      businessData: { name: 'Fire Exit', area: 'Main Building' },
    }),
  ];

  const rooms = roomDefs.map((r) =>
    makeEntity({
      entityId: `h_${r.id}`,
      type: 'room',
      x: r.x,
      y: r.y,
      width: 170,
      height: 160,
      shape: 'room',
      floor: r.floor,
      businessData: {
        name: `Room ${r.id}`,
        roomType: r.type,
        housekeeping: r.hk,
        guestName: r.guest,
        status: r.status,
        capacity: 2,
        area: r.building,
        checkIn: r.ci !== undefined ? daysFromNow(r.ci) : undefined,
        checkOut: r.co !== undefined ? daysFromNow(r.co) : undefined,
      },
    })
  );

  return finalizePlan({
    floorPlanId: 'floor_towerA_04',
    vertical: 'hotel',
    name: 'Tower A',
    width: 2400,
    height: 1600,
    floor: 'Level 04',
    floors: ['Ground Floor', 'Level 01', 'Level 02', 'Level 03', 'Level 04', 'Level 05', 'Level 06'],
    sectionFloors: {
      'Main Building': ['Ground Floor', 'Level 01', 'Level 02', 'Level 03', 'Level 04', 'Level 05', 'Level 06'],
      'Tower B': ['Level 01', 'Level 02', 'Level 03'],
    },
    areas: ['Main Building', 'Tower B'],
    activeArea: 'Main Building',
    entities: [...structure, ...rooms],
  });
}
