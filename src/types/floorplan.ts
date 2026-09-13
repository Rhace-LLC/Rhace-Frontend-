/**
 * API types for the floor-plan / inventory module.
 * Mirrors the backend contracts in Rhace-Backend (Layout-Inventory).
 * DTOs use an `*Dto` suffix to avoid colliding with existing types in `./index`.
 */

export type FloorPlanVertical = 'hotel' | 'restaurant' | 'club';

export type BlueprintCategoryDto = 'room' | 'club_table' | 'restaurant_table';

export type PaymentStrategyDto =
  | 'full_prepayment'
  | 'deposit_50_percent'
  | 'pay_at_venue'
  | 'hold_card_authorization';

export type PolicyKindDto =
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

export type EntityShapeDto =
  | 'rect'
  | 'round'
  | 'square'
  | 'rectangle'
  | 'oval'
  | 'booth'
  | 'cabana'
  | 'room'
  | 'bar-seat';

export interface UnitSpatialDto {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  shape?: EntityShapeDto;
  floor?: string;
}

export interface BookingPolicyDto {
  id: string;
  kind: PolicyKindDto;
  label: string;
  value?: string | number;
}

export interface AmenityDto {
  id: string;
  label: string;
}

export interface UnitSessionDto {
  guestName?: string;
  partySize?: number;
  checkedInAt?: string;
  posSpend?: number;
  notes?: string;
}

// ─── Resources ────────────────────────────────────────────────────────────────

export interface InventoryBlueprintDto {
  _id: string;
  id?: string;
  vendor?: string;
  isSystem?: boolean;
  vertical: FloorPlanVertical;
  category: BlueprintCategoryDto;
  type: string;
  name: string;
  description?: string;
  basePrice?: number;
  currency?: string;
  capacity?: number;
  maxCapacity?: number;
  allowedPaymentStrategies?: PaymentStrategyDto[];
  bookingPolicies?: BookingPolicyDto[];
  amenities?: AmenityDto[];
  images?: string[];
  accent?: string;
  canvasShape?: EntityShapeDto;
  canvasWidth?: number;
  canvasHeight?: number;
  roomType?: string;
  bedType?: string;
  view?: string;
  tier?: string;
  minimumSpend?: number;
  deposit?: number;
  seatingArea?: string;
  turnTimeMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FloorPlanDto {
  _id: string;
  id?: string;
  vendor?: string;
  vertical: FloorPlanVertical;
  name: string;
  width: number;
  height: number;
  building?: string;
  wing?: string;
  floor?: string;
  floors?: string[];
  sectionFloors?: Record<string, string[]>;
  areas?: string[];
  activeArea?: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PhysicalUnitDto {
  _id: string;
  id?: string;
  vendor?: string;
  floorPlan: string;
  blueprint: string;
  vertical: FloorPlanVertical;
  category: BlueprintCategoryDto;
  label: string;
  state: string;
  floorId?: string;
  sectionId?: string;
  spatial: UnitSpatialDto;
  attributes?: string[];
  isReservable?: boolean;
  session?: UnitSessionDto | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CanvasStructureDto {
  _id: string;
  id?: string;
  vendor?: string;
  floorPlan: string;
  kind: string;
  label?: string;
  floor?: string;
  spatial: UnitSpatialDto;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitActivityLogDto {
  _id: string;
  vendor?: string;
  floorPlan: string;
  unit: string;
  actor?: string | null;
  action:
    | 'status_change'
    | 'spatial_change'
    | 'duplicate'
    | 'structure_change'
    | 'check_in'
    | 'check_out';
  fromState?: string;
  toState?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface FloorPlanLayoutDto {
  plan: FloorPlanDto;
  units: PhysicalUnitDto[];
  structures: CanvasStructureDto[];
}

// ─── Envelopes ────────────────────────────────────────────────────────────────

export interface FloorPlanApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: { code?: string; details?: unknown };
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Request inputs ───────────────────────────────────────────────────────────

export interface CreateFloorPlanInput {
  vertical: FloorPlanVertical;
  name: string;
  width: number;
  height: number;
  building?: string;
  wing?: string;
  floor?: string;
  floors?: string[];
  areas?: string[];
  activeArea?: string;
}

export interface UpdateFloorPlanInput {
  version: number;
  name?: string;
  width?: number;
  height?: number;
  building?: string;
  wing?: string;
  floor?: string;
  floors?: string[];
  sectionFloors?: Record<string, string[]>;
  areas?: string[];
  activeArea?: string;
}

export interface CreateBlueprintInput {
  vertical?: FloorPlanVertical;
  category: BlueprintCategoryDto;
  name: string;
  type: string;
  description?: string;
  basePrice?: number;
  currency?: string;
  capacity?: number;
  maxCapacity?: number;
  allowedPaymentStrategies?: PaymentStrategyDto[];
  bookingPolicies?: BookingPolicyDto[];
  amenities?: AmenityDto[];
  images?: string[];
  accent?: string;
  canvasShape?: EntityShapeDto;
  canvasWidth?: number;
  canvasHeight?: number;
  roomType?: string;
  bedType?: string;
  view?: string;
  tier?: string;
  minimumSpend?: number;
  deposit?: number;
  seatingArea?: string;
  turnTimeMinutes?: number;
}

export type UpdateBlueprintInput = Partial<CreateBlueprintInput>;

export interface CreateUnitInput {
  blueprintId: string;
  label?: string;
  floorId?: string;
  sectionId?: string;
  state?: string;
  spatial?: UnitSpatialDto;
  attributes?: string[];
  isReservable?: boolean;
}

export interface UpdateUnitInput {
  label?: string;
  floorId?: string;
  sectionId?: string;
  spatial?: Partial<UnitSpatialDto>;
  attributes?: string[];
  isReservable?: boolean;
  session?: UnitSessionDto | null;
}

export interface UnitStatusInput {
  to: string;
  note?: string;
}

export interface BatchUnitStatusInput {
  unitIds: string[];
  to: string;
}

export interface BulkEntitiesInput {
  version: number;
  positions: Record<string, { x: number; y: number }>;
}

export interface CreateStructureInput {
  kind: string;
  label?: string;
  floor?: string;
  spatial: UnitSpatialDto;
}

export type UpdateStructureInput = Partial<CreateStructureInput>;

// ─── Unit reservations (canonical engine) ─────────────────────────────────────

export type UnitReservationStatusDto = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface UnitReservationDto {
  _id: string;
  id?: string;
  vendor?: string;
  floorPlan?: string;
  unitId?: string | null;
  blueprintId?: string | null;
  bookingGroup?: string | null;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  partySize?: number;
  start: string;
  end: string;
  status: UnitReservationStatusDto;
  source?: string;
  posSpend?: number;
  notes?: string;
  specialRequests?: string;
  paymentStatus?: string;
}

export interface HoldUnitInput {
  blueprintId: string;
  start: string;
  end: string;
  partySize?: number;
}

export interface HoldUnitResultDto {
  unit: PhysicalUnitDto;
  lock: { token: string; expiresAt: string };
}

export interface ConfirmHoldInput {
  lockToken: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  partySize?: number;
  notes?: string;
  specialRequests?: string;
  idempotencyKey?: string;
}

export interface CreateUnitReservationInput {
  unitId?: string;
  blueprintId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  partySize?: number;
  start: string;
  end: string;
  notes?: string;
  specialRequests?: string;
  idempotencyKey?: string;
}

export interface BlueprintAvailabilityDto {
  blueprintId: string;
  name: string;
  total: number;
  available: number;
  reserved: number;
  locked: number;
}

export interface FloorPlanAvailabilityDto {
  window: { start: string; end: string };
  totals: { total: number; available: number; reserved: number; locked: number };
  byBlueprint: BlueprintAvailabilityDto[];
}

export interface FloorPlanTimelineDto {
  window: { start: string; end: string };
  units: PhysicalUnitDto[];
  reservations: UnitReservationDto[];
}
