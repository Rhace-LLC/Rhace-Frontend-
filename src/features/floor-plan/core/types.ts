export type CanvasMode = 'edit' | 'manage';
export type FloorVertical = 'restaurant' | 'club' | 'hotel';
export type EntityShape =
  | 'rect'
  | 'round'
  | 'square'
  | 'rectangle'
  | 'oval'
  | 'booth'
  | 'cabana'
  | 'room'
  | 'bar-seat';

export interface BusinessData {
  name: string;
  capacity?: number;
  minimumSpend?: number;
  currentSpend?: number;
  status?: string;
  // restaurant
  mealStage?: string;
  minutesSeated?: number;
  section?: string;
  area?: string;
  combinedWith?: string;
  // club
  tier?: string;
  partyName?: string;
  hostName?: string;
  // hotel
  roomType?: string;
  housekeeping?: string;
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  [key: string]: unknown;
}

export interface SpatialData {
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

export interface FloorEntity {
  entityId: string;
  type: string;
  businessData: BusinessData;
  spatialData: SpatialData;
}

export interface FloorPlan {
  floorPlanId: string;
  vertical: FloorVertical;
  name: string;
  width: number;
  height: number;
  entities: FloorEntity[];
  // hotel metadata
  building?: string;
  wing?: string;
  floor?: string;
  /** Available floors (restaurant + hotel). */
  floors?: string[];
  /** Per-section floors (e.g. each building maintains its own floors). */
  sectionFloors?: Record<string, string[]>;
  /** Available dining areas (restaurant). */
  areas?: string[];
  /** Currently selected area for new entities. */
  activeArea?: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}
