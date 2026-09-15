import type { EntityShape } from '../core/types';

export type { EntityShape } from '../core/types';

/**
 * Domain model v2 (additive).
 *
 * This layer introduces the "Inventory Blueprint → Physical Unit → Reservation"
 * abstraction on top of the existing canvas engine types. Nothing here mutates or
 * replaces `FloorEntity`/`FloorPlan`; the adapter in `./adapter.ts` translates
 * between the two so the canvas keeps working unchanged.
 */

export type Vertical = 'hotel' | 'club' | 'restaurant';

/** The single palette object category per vertical. */
export type BlueprintCategory = 'room' | 'club_table' | 'restaurant_table';

/** How a booking may be paid for. */
export type PaymentStrategy = 'full_prepayment' | 'deposit_50_percent' | 'pay_at_venue';

export type PolicyKind =
  | 'cancellation'
  | 'age_limit'
  | 'dress_code'
  | 'turn_time'
  | 'minimum_spend'
  | 'check_in'
  | 'check_out'
  | 'entry_time'
  | 'hold_buffer'
  | 'other';

export interface BookingPolicy {
  id: string;
  kind: PolicyKind;
  label: string;
  value?: string | number;
}

export interface Amenity {
  id: string;
  label: string;
}

// ─── Inventory Blueprint ──────────────────────────────────────────────────────

export interface InventoryBlueprintBase {
  id: string;
  category: BlueprintCategory;
  /** Blueprint type name, e.g. "Deluxe King". */
  type: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  /** No-show insurance required to lock a reservation (0 = free). Tables only carry this, not a price. */
  minimumDeposit?: number;
  capacity: number;
  maxCapacity: number;
  allowedPaymentStrategies: PaymentStrategy[];
  bookingPolicies: BookingPolicy[];
  amenities: Amenity[];
  images: string[];
  accent?: string;
  /** Default canvas shape used when placing a unit of this blueprint. */
  canvasShape?: EntityShape;
  /** Default canvas size used when placing a unit. */
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface HotelRoomBlueprint extends InventoryBlueprintBase {
  vertical: 'hotel';
  category: 'room';
  roomType: string;
  bedType?: string;
  view?: string;
}

export interface ClubTableBlueprint extends InventoryBlueprintBase {
  vertical: 'club';
  category: 'club_table';
  tier: string;
  minimumSpend: number;
}

export interface RestaurantTableBlueprint extends InventoryBlueprintBase {
  vertical: 'restaurant';
  category: 'restaurant_table';
  seatingArea?: string;
  turnTimeMinutes?: number;
}

export type InventoryBlueprint =
  | HotelRoomBlueprint
  | ClubTableBlueprint
  | RestaurantTableBlueprint;

// ─── Operational state machines ───────────────────────────────────────────────

export type HotelRoomState =
  | 'vacant_clean'
  | 'vacant_dirty'
  | 'occupied'
  | 'cleaning_in_progress'
  | 'inspected'
  | 'out_of_order_ooo';

export type ClubTableState =
  | 'available'
  | 'reserved_confirmed'
  | 'arrived_seated'
  | 'under_target_spend'
  | 'target_met'
  | 'closing_payment';

export type RestaurantTableState =
  | 'available'
  | 'reserved_held'
  | 'seated_ordering'
  | 'entrees_served'
  | 'awaiting_check'
  | 'dirty_bussing';

export type UnitState = HotelRoomState | ClubTableState | RestaurantTableState;

export interface StateMeta {
  label: string;
  color: string;
}

// ─── Canvas structure (non-bookable) ──────────────────────────────────────────

export type StructureKind =
  | 'wall'
  | 'pillar'
  | 'bar_counter'
  | 'elevator'
  | 'restroom'
  | 'stage'
  | 'dj_booth'
  | 'door'
  | 'window'
  | 'stairs'
  | string;

// ─── Physical Unit ────────────────────────────────────────────────────────────

export interface UnitSpatial {
  floorPlanId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: EntityShape;
  layer?: 'structure' | 'area' | 'entities' | 'overlay';
  floor?: string;
}

export interface UnitSession {
  guestName?: string;
  partySize?: number;
  checkedInAt?: string;
  posSpend?: number;
  notes?: string;
}

export interface PhysicalUnit {
  id: string;
  blueprintId: string;
  vertical: Vertical;
  category: BlueprintCategory;
  label: string;
  state: UnitState;
  floorId: string;
  sectionId?: string;
  spatial: UnitSpatial;
  attributes?: string[];
  isReservable?: boolean;
  session?: UnitSession | null;
}

export interface CanvasStructure {
  id: string;
  floorPlanId: string;
  kind: StructureKind;
  label?: string;
  floor?: string;
  spatial: UnitSpatial;
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export type ReservationStatus =
  | 'pending_payment'
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface ReservationLock {
  token: string;
  expiresAt: string;
}

export interface Reservation {
  id: string;
  unitId: string;
  blueprintId: string;
  guestName: string;
  partySize: number;
  start: string;
  end: string;
  status: ReservationStatus;
  posSpend?: number;
  notes?: string;
  lock?: ReservationLock | null;
}

// ─── Workspace (canonical aggregate) ──────────────────────────────────────────

export interface InventoryWorkspace {
  floorPlanId: string;
  vertical: Vertical;
  name: string;
  width: number;
  height: number;
  floors: string[];
  sectionFloors?: Record<string, string[]>;
  areas?: string[];
  activeArea?: string;
  activeFloor?: string;
  blueprints: InventoryBlueprint[];
  units: PhysicalUnit[];
  structures: CanvasStructure[];
  reservations: Reservation[];
}
