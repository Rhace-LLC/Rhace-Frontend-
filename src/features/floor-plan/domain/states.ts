import type {
  ClubTableState,
  HotelRoomState,
  RestaurantTableState,
  StateMeta,
  UnitState,
  Vertical,
} from './types';

export const HOTEL_STATE_META: Record<HotelRoomState, StateMeta> = {
  vacant_clean: { label: 'Vacant · Clean', color: '#16a34a' },
  vacant_dirty: { label: 'Vacant · Dirty', color: '#f59e0b' },
  occupied: { label: 'Occupied', color: '#2563eb' },
  cleaning_in_progress: { label: 'Cleaning', color: '#06b6d4' },
  inspected: { label: 'Inspected', color: '#0d9488' },
  out_of_order_ooo: { label: 'Out of Order', color: '#dc2626' },
};

export const CLUB_STATE_META: Record<ClubTableState, StateMeta> = {
  available: { label: 'Available', color: '#16a34a' },
  reserved_confirmed: { label: 'Reserved', color: '#f59e0b' },
  arrived_seated: { label: 'Seated', color: '#2563eb' },
  under_target_spend: { label: 'Under Target', color: '#eab308' },
  target_met: { label: 'Target Met', color: '#22c55e' },
  closing_payment: { label: 'Closing / Payment', color: '#a855f7' },
};

export const RESTAURANT_STATE_META: Record<RestaurantTableState, StateMeta> = {
  available: { label: 'Available', color: '#16a34a' },
  reserved_held: { label: 'Reserved / Held', color: '#f59e0b' },
  seated_ordering: { label: 'Seated · Ordering', color: '#2563eb' },
  entrees_served: { label: 'Entrees Served', color: '#0ea5e9' },
  awaiting_check: { label: 'Awaiting Check', color: '#a855f7' },
  dirty_bussing: { label: 'Dirty · Bussing', color: '#dc2626' },
};

export const STATE_META: Record<Vertical, Record<string, StateMeta>> = {
  hotel: HOTEL_STATE_META,
  club: CLUB_STATE_META,
  restaurant: RESTAURANT_STATE_META,
};

export function stateMetaFor(vertical: Vertical, state: string): StateMeta {
  return STATE_META[vertical][state] ?? { label: state, color: '#6b7280' };
}

export function stateOptions(vertical: Vertical): Array<{ value: string; label: string; color: string }> {
  return Object.entries(STATE_META[vertical]).map(([value, meta]) => ({
    value,
    label: meta.label,
    color: meta.color,
  }));
}

export function defaultStateFor(vertical: Vertical): UnitState {
  return vertical === 'hotel' ? 'vacant_clean' : 'available';
}
