import type { HotelRoomSelection } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function calculateNights(checkIn?: string | Date, checkOut?: string | Date): number {
  const start = toDate(checkIn);
  const end = toDate(checkOut);
  if (!start || !end) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
}

export function hotelRoomNightlyRate(room: Record<string, unknown>): number {
  const price = Number(room.pricePerNight ?? room.price ?? 0);
  const discount = Number(room.discount ?? 0);
  return price - price * (discount / 100);
}

export function hotelRoomSubtotal(selection: HotelRoomSelection): number {
  const rate = hotelRoomNightlyRate(selection.room);
  const nights = calculateNights(selection.checkInDate, selection.checkOutDate);
  return rate * (selection.quantity || 1) * nights;
}

export function hotelTotal(selections: HotelRoomSelection[]): number {
  return selections.reduce((total, selection) => total + hotelRoomSubtotal(selection), 0);
}

export function hotelTotalRooms(selections: HotelRoomSelection[]): number {
  return selections.reduce((total, s) => total + Number(s.quantity || 1), 0);
}

export function hotelTotalGuests(selections: HotelRoomSelection[]): number {
  return selections.reduce((total, s) => total + Number(s.guests || 1), 0);
}

export function restaurantMealTotal(menuItems: Array<Record<string, unknown>>): number {
  return menuItems
    .filter((item) => item.selected && Number(item.quantity || 0) > 0)
    .reduce(
      (total, item) => total + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
}

export const RESTAURANT_RESERVATION_FEE = 1000;

export function clubTotal(input: {
  bottles: Array<Record<string, unknown>>;
  combos: Array<Record<string, unknown>>;
  vipExtras: Array<Record<string, unknown>>;
  table: Array<Record<string, unknown>>;
}): number {
  const { bottles, combos, vipExtras, table } = input;
  return (
    bottles.reduce(
      (total, item) => total + Number(item.price || 0) * Number(item.quantity || 1),
      0
    ) +
    combos.reduce((total, item) => total + Number(item.setPrice || 0), 0) +
    vipExtras.reduce((total, item) => total + Number(item.price || 0), 0) +
    table.reduce(
      (total, item) => total + Number(item.price || 0) * Number(item.quantity || 1),
      0
    )
  );
}
