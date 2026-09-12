import type { HotelRoomSelection } from './types';

export function validateRestaurant(input: {
  date?: Date;
  time?: string;
  guests?: string;
  seatingPreference?: string;
}): string | null {
  if (!input.date || !input.time || !input.guests || !input.seatingPreference) {
    return 'Please fill in all required fields.';
  }
  const guests = parseInt(input.guests, 10);
  if (isNaN(guests) || guests < 1) {
    return 'Please enter a valid number of guests.';
  }
  return null;
}

export function validateHotel(selections: HotelRoomSelection[]): string | null {
  if (!selections || selections.length === 0) {
    return 'Please select at least one room.';
  }
  for (const selection of selections) {
    const name = selection.room?.name || 'the selected room';
    if (!selection.checkInDate || !selection.checkOutDate) {
      return `Please select check-in and check-out dates for ${name}.`;
    }
    if (new Date(selection.checkOutDate) <= new Date(selection.checkInDate)) {
      return `Check-out date must be after check-in date for ${name}.`;
    }
    if (!selection.guests || selection.guests < 1) {
      return `Please select number of guests for ${name}.`;
    }
  }
  return null;
}

export function validateClub(input: {
  date?: Date;
  guests?: string;
  selectedBottles: number;
}): string | null {
  if (!input.date || !input.guests) {
    return 'Please fill in all required fields.';
  }
  if (input.selectedBottles < 1) {
    return 'Please select a Bottle of Drink to continue!';
  }
  return null;
}
