import { useMemo } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Hash,
  Home,
  MapPin,
  Receipt,
  Users,
  UtensilsCrossed,
  Wine,
  Table2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SvgIcon, SvgIcon2, SvgIcon3 } from '@/public/icons/icons';
import RenderCustomerQR from './RenderCustomerQR';

const paymentModeMap = {
  full_payment: { label: 'Full Payment' },
  partial_payment: { label: 'Partial Payment' },
  hotel_deposit: { label: 'Hotel Deposit' },
  pay_later: { label: 'Pay at Property' },
  balance_payment: { label: 'Balance Payment' },
  offline_balance_payment: { label: 'Offline Balance Payment' },
  offline_partial_payment: { label: 'Offline Partial Payment' },
};

const paymentMethodMap = {
  card: 'Card',
  bank_transfer: 'Transfer',
  transfer: 'Transfer',
  ussd: 'USSD',
  qr: 'QR',
  mobile_money: 'Mobile Money',
  pos: 'POS',
};

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeString) {
  if (!timeString) return '-';
  return timeString;
}

function formatCurrency(amount = 0) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusColor(status) {
  if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'confirmed':
      return 'bg-green-100 text-green-700 border-green-800';
    case 'upcoming':
      return 'bg-yellow-100 text-yellow-700 border-yellow-800';
    case 'no_show':
      return 'bg-amber-100 text-amber-700 border-amber-800';
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-800';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function formatReservationType(type) {
  if (!type) return '';
  const normalized = type.toLowerCase();
  if (normalized.includes('hotel')) return 'Hotel';
  if (normalized.includes('restaurant')) return 'Restaurant';
  if (normalized.includes('club')) return 'Club';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getReservationIcon(type) {
  if (!type) return <Home className="w-4 h-4" />;
  const normalized = type.toLowerCase();
  if (normalized.includes('hotel')) return <SvgIcon2 className="w-4 h-4 text-black" />;
  if (normalized.includes('restaurant')) return <SvgIcon className="w-4 h-4 text-black" />;
  if (normalized.includes('club')) return <SvgIcon3 className="w-4 h-4 text-black" />;
  return <Home className="w-4 h-4" />;
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || '-'}</p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function HotelDetails({ booking }) {
  const rooms = booking.rooms || [];
  return (
    <Section title="Hotel Reservation">
      {rooms.map((room, i) => {
        const roomData = room.roomId || {};
        return (
          <div key={i} className="sm:col-span-2 bg-gray-50 rounded-lg p-3 space-y-2">
            {rooms.length > 1 && (
              <p className="text-xs font-semibold text-gray-500">Room {i + 1}</p>
            )}
            <InfoRow
              icon={<Building2 className="w-4 h-4" />}
              label="Room"
              value={roomData.name || 'N/A'}
            />
            <div className="grid grid-cols-2 gap-2">
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Check-in"
                value={formatDate(room.checkInDate)}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Check-out"
                value={formatDate(room.checkOutDate)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoRow
                icon={<Users className="w-4 h-4" />}
                label="Guests"
                value={room.guests || '-'}
              />
              <InfoRow
                icon={<Hash className="w-4 h-4" />}
                label="Quantity"
                value={room.quantity || 1}
              />
            </div>
            {roomData.pricePerNight && (
              <InfoRow
                icon={<Banknote className="w-4 h-4" />}
                label="Price per night"
                value={formatCurrency(roomData.pricePerNight)}
              />
            )}
            {roomData.amenities?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Amenities</p>
                <div className="flex flex-wrap gap-1">
                  {roomData.amenities.map((a, j) => (
                    <span key={j} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );
}

function RestaurantDetails({ booking }) {
  return (
    <>
      <Section title="Reservation Schedule">
        <InfoRow
          icon={<Calendar className="w-4 h-4" />}
          label="Date"
          value={formatDate(booking.date)}
        />
        <InfoRow
          icon={<Clock className="w-4 h-4" />}
          label="Time"
          value={formatTime(booking.time)}
        />
        <InfoRow
          icon={<Users className="w-4 h-4" />}
          label="Guests"
          value={booking.guests}
        />
        <InfoRow
          icon={<Building2 className="w-4 h-4" />}
          label="Seating Preference"
          value={booking.seatingPreference || 'Not specified'}
        />
      </Section>
      {booking.menus?.length > 0 && (
        <Section title="Pre-selected Menu Items">
          {booking.menus.map((item, i) => {
            const menuData = item.menu || {};
            return (
              <div key={i} className="sm:col-span-2 bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{menuData.name || 'Menu Item'}</p>
                  {menuData.description && (
                    <p className="text-xs text-gray-500">{menuData.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(menuData.price)}</p>
                  <p className="text-xs text-gray-500">x{item.quantity}</p>
                </div>
              </div>
            );
          })}
        </Section>
      )}
      {(booking.specialOccasion || booking.specialRequest) && (
        <Section title="Additional Info">
          {booking.specialOccasion && (
            <InfoRow
              icon={<UtensilsCrossed className="w-4 h-4" />}
              label="Special Occasion"
              value={booking.specialOccasion}
            />
          )}
          {booking.specialRequest && (
            <InfoRow
              icon={<UtensilsCrossed className="w-4 h-4" />}
              label="Special Request"
              value={booking.specialRequest}
            />
          )}
        </Section>
      )}
    </>
  );
}

function ClubDetails({ booking }) {
  return (
    <>
      <Section title="Reservation Schedule">
        <InfoRow
          icon={<Calendar className="w-4 h-4" />}
          label="Date"
          value={formatDate(booking.date)}
        />
        <InfoRow
          icon={<Clock className="w-4 h-4" />}
          label="Time"
          value={formatTime(booking.time)}
        />
        <InfoRow
          icon={<Users className="w-4 h-4" />}
          label="Guests"
          value={booking.guests}
        />
      </Section>
      {booking.tables?.length > 0 && (
        <Section title="Tables Booked">
          {booking.tables.map((t, i) => {
            const tableData = t.tableType || {};
            return (
              <div key={i} className="sm:col-span-2 bg-gray-50 rounded-lg p-3 space-y-2">
                <InfoRow
                  icon={<Table2 className="w-4 h-4" />}
                  label="Table"
                  value={tableData.name || 'N/A'}
                />
                <div className="grid grid-cols-2 gap-2">
                  <InfoRow
                    icon={<Hash className="w-4 h-4" />}
                    label="Category"
                    value={tableData.category || '-'}
                  />
                  <InfoRow
                    icon={<Hash className="w-4 h-4" />}
                    label="Quantity"
                    value={t.quantity || 1}
                  />
                </div>
                {tableData.seatingCapacity && (
                  <InfoRow
                    icon={<Users className="w-4 h-4" />}
                    label="Seating Capacity"
                    value={tableData.seatingCapacity}
                  />
                )}
                {tableData.price && (
                  <InfoRow
                    icon={<Banknote className="w-4 h-4" />}
                    label="Price"
                    value={formatCurrency(tableData.price)}
                  />
                )}
                {tableData.addOns?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Add-ons</p>
                    <div className="flex flex-wrap gap-1">
                      {tableData.addOns.map((a, j) => (
                        <span key={j} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Section>
      )}
      {booking.drinks?.length > 0 && (
        <Section title="Drinks Ordered">
          {booking.drinks.map((d, i) => {
            const drinkData = d.drink || {};
            return (
              <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wine className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-sm">{drinkData.name || 'Drink'}</p>
                    {drinkData.volume && (
                      <p className="text-xs text-gray-500">{drinkData.volume}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(drinkData.price)}</p>
                  <p className="text-xs text-gray-500">x{d.quantity}</p>
                </div>
              </div>
            );
          })}
        </Section>
      )}
      {booking.specialRequest && (
        <Section title="Additional Info">
          <InfoRow
            icon={<UtensilsCrossed className="w-4 h-4" />}
            label="Special Request"
            value={booking.specialRequest}
          />
        </Section>
      )}
    </>
  );
}

function PaymentDetails({ booking, onPayBalance }) {
  const payments = useMemo(() => {
    return [...(booking.paymentRefs || [])]
      .filter(Boolean)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [booking.paymentRefs]);

  const successfulPayments = payments.filter((p) => p.status === 'success');
  const totalAmount = booking.totalAmount || 0;
  const amountPaid = successfulPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const balance = Math.max(totalAmount - amountPaid, 0);
  const paymentPercentage = totalAmount > 0 ? Math.min(100, Math.round((amountPaid / totalAmount) * 100)) : 0;
  const fullyPaid = balance <= 0;

  return (
    <Section title="Payment Information">
      <div className="sm:col-span-2 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
            <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Paid</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(amountPaid)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Balance</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(balance)}</p>
          </div>
        </div>

        {totalAmount > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{paymentPercentage}% Paid</span>
              <span className="text-gray-500">{formatCurrency(amountPaid)} of {formatCurrency(totalAmount)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-teal-700 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${paymentPercentage}%` }}
              />
            </div>
          </div>
        )}

        {fullyPaid && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 py-3 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Reservation Fully Paid</span>
          </div>
        )}

        {!fullyPaid && amountPaid > 0 && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-3 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Balance Still Due</span>
          </div>
        )}

        {!fullyPaid && amountPaid === 0 && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 py-3 text-orange-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Awaiting Payment</span>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-1">
          Payment Mode:{' '}
          <span className="font-medium text-gray-700">
            {paymentModeMap[payments[0]?.paymentMode]?.label || payments[0]?.paymentMode || '-'}
          </span>
        </p>

        {!fullyPaid && amountPaid > 0 && onPayBalance && (
          <Button
            className="w-full mt-3 min-h-12 rounded-full"
            onClick={onPayBalance}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Remaining Balance ({formatCurrency(balance)})
          </Button>
        )}
      </div>

      {payments.length > 0 && (
        <div className="sm:col-span-2 space-y-3 mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Transactions</p>
          {payments.map((payment, index) => {
            const authData = payment.paystackData?.authorization;
            return (
              <div key={payment._id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-sm">Payment #{index + 1}</p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      payment.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-medium text-right">{formatCurrency(payment.amountPaid)}</span>
                  <span className="text-gray-500">Method</span>
                  <span className="text-right capitalize">
                    {paymentMethodMap[payment.paymentMethod] || payment.paymentMethod || '-'}
                  </span>
                  <span className="text-gray-500">Reference</span>
                  <span className="text-right font-mono text-xs break-all">
                    {payment.paystackReference || '-'}
                  </span>
                  <span className="text-gray-500">Date</span>
                  <span className="text-right">{formatDate(payment.paidAt || payment.createdAt)}</span>
                  <span className="text-gray-500">Pay Mode</span>
                  <span className="text-right">
                    {paymentModeMap[payment.paymentMode]?.label || payment.paymentMode || '-'}
                  </span>
                </div>
                {authData && (
                  <div className="border-t border-gray-100 pt-2 mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-gray-500">Card</span>
                    <span className="text-right">
                      {authData.card_type} •••• {authData.last4 || ''}
                    </span>
                    <span className="text-gray-500">Bank</span>
                    <span className="text-right">{authData.bank || '-'}</span>
                  </div>
                )}
                {payment.offlinePayment && (
                  <div className="border-t border-gray-100 pt-2 mt-2 space-y-1 text-sm">
                    <p className="text-gray-500">Offline Payment</p>
                    <p className="text-gray-700">
                      Ref: {payment.offlinePayment.reference || '-'}
                      {payment.offlinePayment.note && ` — ${payment.offlinePayment.note}`}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function BookingOverviewUserPOV({ booking, open, onOpenChange, onPayBalance }) {
  const isHotel = booking.reservationType?.toLowerCase().includes('hotel');
  const isRestaurant = booking.reservationType?.toLowerCase().includes('restaurant');
  const isClub = booking.reservationType?.toLowerCase().includes('club');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {getReservationIcon(booking.reservationType)}
              {booking.vendor?.businessName || 'Reservation Details'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-gray-50 text-gray-700 border-gray-200">
              {getReservationIcon(booking.reservationType)}
              {formatReservationType(booking.reservationType)}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.reservationStatus)}`}
            >
              {booking.reservationStatus?.split('_').join(' ')}
            </span>
            <span className="text-xs text-gray-500 font-mono">#{booking.bookingCode}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{booking.location}</span>
          </div>

          {isHotel && <HotelDetails booking={booking} />}
          {isRestaurant && <RestaurantDetails booking={booking} />}
          {isClub && <ClubDetails booking={booking} />}

          <PaymentDetails booking={booking} onPayBalance={onPayBalance} />

          <Section title="Booking Info">
            <InfoRow
              icon={<Receipt className="w-4 h-4" />}
              label="Booking Code"
              value={booking.bookingCode}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Booked On"
              value={formatDate(booking.createdAt)}
            />
            <InfoRow
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Confirmed On"
              value={formatDate(booking.confirmedAt)}
            />
            <InfoRow
              icon={<Hash className="w-4 h-4" />}
              label="Reservation ID"
              value={booking._id}
            />
          </Section>

          <div className="flex justify-center pt-2">
            <RenderCustomerQR reservation={booking} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BookingOverviewUserPOV;
