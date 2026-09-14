/**
 * Reservations domain types (canonical `UnitReservation` + `BookingGroup` engine).
 * Mirrors the backend serializer in `utils/serializeReservation.ts`.
 */

export type ReservationStatus =
  | 'pending_payment'
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partly_paid' | 'paid' | 'pay_later' | string;

export type ReservationSource =
  | 'vendor'
  | 'storefront'
  | 'seed'
  | 'legacy'
  | 'legacy_unmapped'
  | string;

export interface ReservationGroupSummary {
  totalAmount?: number;
  amountPaid?: number;
  paymentStatus?: PaymentStatus;
  paymentPlan?: string;
  paymentStrategy?: string;
  currency?: string;
}

export interface ReservationView {
  _id: string;
  id?: string;
  vendor: string;
  vendorName?: string;
  floorPlan?: string | null;
  unitId?: string | null;
  unitLabel?: string;
  unitState?: string;
  blueprintId?: string | null;
  blueprintName?: string;
  vertical?: 'hotel' | 'club' | 'restaurant' | string;
  category?: string;
  bookingGroup?: string | null;
  group?: ReservationGroupSummary;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  customerId?: string;
  partySize?: number;
  start: string;
  end: string;
  status: ReservationStatus;
  source?: ReservationSource;
  posSpend?: number;
  unitPrice?: number;
  amount?: number;
  currency?: string;
  specialRequests?: string;
  notes?: string;
  paymentStatus?: PaymentStatus;
  paymentRefs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReservationFilters {
  floorPlanId?: string;
  unitId?: string;
  status?: string;
  paymentStatus?: string;
  source?: string;
  customerId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  vendorId?: string;
}

export interface ReservationCounters {
  todays: number;
  prepaid: number;
  expectedGuests: number;
  pendingPayments: number;
}

export interface BookingGroupLine {
  _id: string;
  unitId?: string | null;
  unitLabel?: string;
  blueprintId?: string | null;
  blueprintName?: string;
  guestName: string;
  partySize?: number;
  start: string;
  end: string;
  status: ReservationStatus;
  amount?: number;
  currency?: string;
  paymentStatus?: PaymentStatus;
}

export interface BookingGroupView {
  _id: string;
  vendor: string | { _id: string; businessName?: string };
  vendorName?: string;
  vertical?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  partySize?: number;
  status: ReservationStatus;
  paymentStatus?: PaymentStatus;
  totalAmount?: number;
  amountPaid?: number;
  depositAmount?: number;
  paymentStrategy?: string;
  paymentPlan?: string;
  paymentDeadline?: string | null;
  currency?: string;
  notes?: string;
  createdAt?: string;
  lines?: BookingGroupLine[];
  paymentRefs?: Array<{
    _id: string;
    amount?: number;
    amountPaid?: number;
    status?: string;
    paymentMode?: string;
    paidAt?: string;
    createdAt?: string;
  }>;
}

export interface UnitSummary {
  todayStats: { details: number; change: number }[];
  todaysReservations: ReservationView[];
  reservationTrends: {
    weekly: { label: string; count: number }[];
    monthly: { label: string; count: number }[];
    last7Days: number;
    prev7Days: number;
    trendChange: number;
  };
  revenueData: {
    weekly: { items: { label: string; revenue: number }[]; total: number };
    monthly: { items: { label: string; revenue: number }[]; total: number };
  };
  reservationSource: {
    weekly: { total: number; sources: { label: string; count: number }[] };
    monthly: { total: number; sources: { label: string; count: number }[] };
  };
  customerFrequency: { new: number; returning: number };
  hotelRoomsBreakdown: { roomName: string; count: number }[];
  restaurantMenuBreakdown: { menuName: string; count: number }[];
  clubDrinksBreakdown: { drinkName: string; quantity: number }[];
  clubCombosBreakdown: { comboName: string; count: number }[];
  [key: string]: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export type TimeBucket = 'today' | 'upcoming' | 'past';
