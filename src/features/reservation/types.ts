export type ReservationVertical = 'restaurant' | 'hotel' | 'club';

export interface ReservationVendorSnapshot {
  _id: string;
  businessName?: string;
  name?: string;
  address?: string;
  profileImages?: ({ url?: string } | string)[];
  [key: string]: unknown;
}

export interface BaseReservationDraft {
  id: string;
  vertical: ReservationVertical;
  vendorId: string;
  step: number;
  createdAt: number;
  updatedAt: number;
  payLater?: boolean;
  partPay?: boolean;
  vendorSnapshot?: ReservationVendorSnapshot | null;
  booking?: Record<string, unknown> | null;
}

export interface RestaurantDraft extends BaseReservationDraft {
  vertical: 'restaurant';
  date?: string;
  time?: string;
  guests: number;
  seatingPreference: string;
  occasion: string;
  specialRequest: string;
  additionalNote: string;
  menuItems: Array<Record<string, unknown>>;
}

export interface HotelRoomSelection {
  room: Record<string, unknown> & { _id: string };
  quantity: number;
  checkInDate?: string;
  checkOutDate?: string;
  guests: number;
  guestBreakdown?: Record<string, number> | null;
}

export interface HotelDraft extends BaseReservationDraft {
  vertical: 'hotel';
  roomSelections: HotelRoomSelection[];
  specialRequest: string;
  partPay?: boolean;
}

export interface ClubDraft extends BaseReservationDraft {
  vertical: 'club';
  date?: string;
  time?: string;
  guests: number;
  specialRequest: string;
  tableId?: string;
  comboItems: Array<Record<string, unknown>>;
  bottleItems: Array<Record<string, unknown>>;
  vipExtraItems: Array<Record<string, unknown>>;
  table: Array<Record<string, unknown>>;
}

export type ReservationDraft = RestaurantDraft | HotelDraft | ClubDraft;
