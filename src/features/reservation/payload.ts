import { RESTAURANT_RESERVATION_FEE, calculateNights, hotelRoomNightlyRate } from './pricing';
import type { HotelDraft, HotelRoomSelection, RestaurantDraft, ClubDraft } from './types';

type AnyRecord = Record<string, any>;

interface Customer {
  firstName?: string;
  lastName?: string;
  email?: string;
  _id?: string;
}

function customerFields(user?: Customer | null) {
  return {
    customerName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
    customerEmail: user?.email,
    customerId: user?._id,
  };
}

export function generateReservationId(): string {
  return Date.now().toString(36).substring(0, 8).toUpperCase();
}

// ── Reservation "booking" builders (what Payment + PrePayment consume) ─────────

export function buildRestaurantBooking(input: {
  resId: string;
  user?: Customer | null;
  vendor: AnyRecord;
  draft: RestaurantDraft;
  selectedMeals: AnyRecord[];
  payLater: boolean;
}): AnyRecord {
  const { resId, user, vendor, draft, selectedMeals, payLater } = input;
  const totalMeals = selectedMeals.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  return {
    resId,
    reservationType: 'restaurant',
    ...customerFields(user),
    date: draft.date,
    time: draft.time,
    guests: draft.guests,
    seatingPreference: draft.seatingPreference,
    specialOccasion: draft.occasion || 'other',
    specialRequest: draft.specialRequest,
    mealPreselected: selectedMeals.length > 0,
    menus: selectedMeals,
    totalAmount: payLater ? RESTAURANT_RESERVATION_FEE : totalMeals,
    vendor: vendor?._id,
    payLater,
    location: vendor?.address,
    image: vendor?.profileImages?.[0],
  };
}

export function buildHotelBooking(input: {
  resId: string;
  user?: Customer | null;
  vendor: AnyRecord;
  draft: HotelDraft;
  roomSelections: HotelRoomSelection[];
  partPay: boolean;
  totalAmount: number;
}): AnyRecord {
  const { resId, user, vendor, roomSelections, partPay, totalAmount, draft } = input;
  return {
    resId,
    reservationType: 'hotel',
    ...customerFields(user),
    specialRequest: draft.specialRequest,
    rooms: roomSelections.map((selection) => {
      const nights = calculateNights(selection.checkInDate, selection.checkOutDate);
      const rate = hotelRoomNightlyRate(selection.room);
      return {
        roomId: selection.room._id,
        quantity: selection.quantity || 1,
        pricePerNight: rate,
        name: selection.room.name,
        category: selection.room.category,
        checkInDate: selection.checkInDate,
        checkOutDate: selection.checkOutDate,
        guests: selection.guests,
        nights,
        subtotal: rate * (selection.quantity || 1) * nights,
      };
    }),
    partPaid: partPay,
    totalAmount: partPay ? totalAmount / 2 : totalAmount,
    vendor: vendor?._id,
    location: vendor?.address,
    image: vendor?.profileImages?.[0],
  };
}

export function buildClubBooking(input: {
  resId: string;
  user?: Customer | null;
  vendor: AnyRecord;
  draft: ClubDraft;
  combos: AnyRecord[];
  bottles: AnyRecord[];
  vipExtras: AnyRecord[];
  tableSelected: AnyRecord[];
  proposedPayment: number;
  partPay: boolean;
  totalAmount: number;
}): AnyRecord {
  const { resId, user, vendor, draft, combos, bottles, vipExtras, tableSelected, proposedPayment, partPay, totalAmount } =
    input;
  return {
    resId,
    reservationType: 'club',
    ...customerFields(user),
    date: draft.date,
    time: draft.time,
    guests: draft.guests,
    specialRequest: draft.specialRequest,
    combos: combos.map((item) => item._id),
    drinks: bottles.map((item) => ({ drink: item._id, quantity: item.quantity || 1 })),
    vipExtras: vipExtras.filter((item) => item.selected),
    proposedPayment,
    partPaid: partPay,
    totalAmount: partPay ? totalAmount / 2 : totalAmount,
    vendor: vendor?._id,
    businessName: vendor?.businessName,
    table: tableSelected.map((item) => ({ _id: item._id, quantity: item.quantity || 1 })),
    location: vendor?.address,
    image: vendor?.profileImages?.[0],
  };
}

// ── Payment initialization payload (server-facing) ────────────────────────────

export function buildInitializePayload(
  booking: AnyRecord,
  opts: { amount: number; payLater: boolean }
): AnyRecord {
  const { amount, payLater } = opts;
  return {
    vendorId: booking?.vendor,
    reservationType: booking?.reservationType,
    location: booking?.location,
    customerName: booking?.customerName,
    customerEmail: booking?.customerEmail,
    customerPhone: `${booking?.customerPhone || ''}`,
    amount,
    payLater,
    partPaid: booking?.partPaid,
    resId: booking?.resId,
    ...(booking?.reservationType === 'restaurant' && {
      date: booking.date,
      time: booking.time,
      guests: booking.guests,
      mealPreselected: booking.mealPreselected,
      menus: booking.menus?.map((m: AnyRecord) => ({
        menuId: m._id,
        quantity: m.quantity,
        specialRequest: m.specialRequest,
      })),
      specialOccasion: booking.specialOccasion,
      seatingPreference: booking.seatingPreference,
      specialRequest: booking.specialRequest,
    }),
    ...(booking?.reservationType === 'hotel' && {
      rooms: booking.rooms,
      checkInDate: booking.checkInDate || booking.rooms?.[0]?.checkInDate,
      checkOutDate: booking.checkOutDate || booking.rooms?.[0]?.checkOutDate,
      guests: booking.guests || booking.rooms?.[0]?.guests,
      specialRequest: booking.specialRequest || booking.rooms?.[0]?.specialRequest,
    }),
    ...(booking?.reservationType === 'club' && {
      date: booking.date,
      time: booking.time,
      guests: booking.guests,
      drinks: booking.drinks,
      combos: booking.combos,
      table: booking.table,
    }),
  };
}
