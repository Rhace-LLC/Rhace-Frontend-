type AnyRecord = Record<string, any>;

/** Payment initialization payload (server-facing). */
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
