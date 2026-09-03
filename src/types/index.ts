// Core domain types for the Rhace frontend.

export type VendorType = 'restaurant' | 'hotel' | 'club';

export interface ApiEnvelope<T = unknown> {
  data?: T;
  message?: string;
  success?: boolean;
  [key: string]: unknown;
}

export interface PaginatedResponse<T = unknown> {
  items?: T[];
  data?: T[];
  total?: number;
  page?: number;
  pages?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface ProfileImage {
  url: string;
  public_id?: string;
}

export interface GeoPoint {
  lat?: number | null;
  lng?: number | null;
  longitude?: number;
  latitude?: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  _id: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  profilePic?: string;
  profilePicture?: string;
  expiresAt?: string | number;
  token?: string;
  role?: string;
}

export interface AuthVendor {
  _id: string;
  id?: string;
  businessName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  type?: VendorType | string;
  businessType?: string;
  vendorType?: string;
  logo?: string;
  profilePic?: string;
  expiresAt?: string | number;
  token?: string;
  isVerified?: boolean;
}

export interface AuthAdmin {
  _id: string;
  id?: string;
  fullName?: string;
  name?: string;
  email: string;
  role?: string;
  expiresAt?: string | number;
  token?: string;
}

// ─── Vendor / Venue ───────────────────────────────────────────────────────────

export interface VendorBase {
  _id: string;
  id?: string;
  businessName: string;
  vendorName?: string;
  name?: string;
  address?: string;
  location?: string;
  phone?: string;
  email?: string;
  profileImages?: ProfileImage[];
  image?: string;
  logo?: string;
  rating?: number;
  reviews?: number | string;
  openingHours?: string;
  openingTime?: string;
  closingTime?: string;
  priceRange?: number | string;
  businessDescription?: string;
  description?: string;
  slots?: number;
  ageLimit?: number;
  specials?: string;
  type?: VendorType | string;
  isVerified?: boolean;
  [key: string]: unknown;
}

export interface Restaurant extends VendorBase {
  cuisine?: string;
  cuisines?: string[];
  menu?: MenuItem[];
  availableSlots?: string[];
  [key: string]: unknown;
}

export interface Hotel extends VendorBase {
  starRating?: number;
  rooms?: Room[];
  checkInTime?: string;
  checkOutTime?: string;
  [key: string]: unknown;
}

export interface Club extends VendorBase {
  dressCode?: string[];
  genres?: string[];
  comboDeals?: Combo[];
  bottles?: Bottle[];
  [key: string]: unknown;
}

export type Venue = Restaurant | Hotel | Club;

export interface Combo {
  _id?: string;
  id?: string;
  image?: string;
  title?: string;
  name?: string;
  price?: number;
  offers?: string[];
  description?: string;
  specials?: string;
}

export interface Bottle {
  _id?: string;
  id?: string;
  image?: string;
  category?: string;
  title?: string;
  name?: string;
  price?: number;
  description?: string;
  specials?: string;
}

export interface MenuItem {
  _id?: string;
  id?: string;
  category?: string;
  dishName?: string;
  name?: string;
  itemImage?: string;
  image?: string;
  description?: string;
  price?: number;
  specialRequest?: string;
  quantity?: number;
  isAvailable?: boolean;
  [key: string]: unknown;
}

export interface Room {
  id?: number | string;
  _id?: string;
  name?: string;
  roomName?: string;
  description?: string;
  images?: string[];
  amenities?: Record<string, unknown>;
  discount?: number;
  originalPrice?: number;
  price?: number;
  discountedPrice?: number;
  roomsLeft?: number;
  cancellation?: string;
  capacity?: number;
  [key: string]: unknown;
}

// ─── Reservations / Bookings ──────────────────────────────────────────────────

export interface ReservationMeal {
  id?: string;
  name?: string;
  dishName?: string;
  description?: string;
  price?: number;
  quantity?: number;
  specialRequest?: string;
  category?: string;
}

export interface Reservation {
  _id?: string;
  id?: string;
  reservationId?: string;
  bookingId?: string;
  reservationType?: VendorType | string;
  customerEmail?: string;
  customerName?: string;
  user?: AuthUser | string;
  vendorId?: string;
  vendor?: VendorBase | string;
  businessName?: string;
  location?: string;
  image?: string;
  date?: string | Date;
  checkIn?: string | Date;
  checkOut?: string | Date;
  time?: string;
  guests?: number;
  adults?: number;
  seatingPreference?: string;
  specialOccasion?: string;
  specialRequest?: string;
  additionalNote?: string;
  meals?: ReservationMeal[];
  roomType?: string | Room;
  roomId?: string;
  tableType?: string;
  totalPrice?: number;
  amount?: number;
  status?: string;
  paymentStatus?: string;
  paymentRef?: unknown;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
}

// ─── Menu / Category ──────────────────────────────────────────────────────────

export interface MenuCategory {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  items?: MenuItem[];
  description?: string;
  [key: string]: unknown;
}

export interface BookingPaymentRef {
  _id?: string;
  id?: string;
  paymentMode?: string;
  paymentMethod?: string;
  status?: string;
  amountPaid?: number;
  totalAmount?: number;
  currency?: string;
  reference?: string;
  paystackReference?: string;
  paystackData?: {
    authorization?: {
      card_type?: string;
      last4?: string;
      bank?: string;
    };
  };
  offlinePayment?: {
    reference?: string;
    note?: string;
  };
  paidAt?: string | Date;
  createdAt?: string | Date;
  [key: string]: unknown;
}

export interface BookingRoomRef {
  roomId?: { _id?: string; name?: string; pricePerNight?: number; amenities?: unknown[] } | null;
  checkInDate?: string | Date;
  checkOutDate?: string | Date;
  guests?: number;
  quantity?: number;
  price?: number;
  [key: string]: unknown;
}

export interface BookingTableRef {
  tableType?:
    | {
        _id?: string;
        name?: string;
        category?: string;
        price?: number;
        seatingCapacity?: number;
        addOns?: unknown[];
      }
    | null;
  quantity?: number;
  [key: string]: unknown;
}

export interface BookingMenuRef {
  menu?: { _id?: string; name?: string; price?: number; description?: string } | null;
  quantity?: number;
  [key: string]: unknown;
}

export interface BookingDrinkRef {
  drink?: { name?: string; price?: number; volume?: string } | null;
  quantity?: number;
  [key: string]: unknown;
}

export interface BookingVendorRef {
  _id?: string;
  id?: string;
  businessName?: string;
  vendorType?: string;
  name?: string;
  email?: string;
  phone?: string;
  profileImages?: string[];
  image?: string;
  [key: string]: unknown;
}

export interface ReservationData {
  _id?: string;
  id?: string;
  resId?: string;
  reservationId?: string;
  bookingId?: string;
  bookingCode?: string;
  reservationType?: string;
  reservationStatus?: string;
  paymentStatus?: string;
  paymentMode?: string;
  totalAmount?: number;
  location?: string;
  date?: string | Date;
  time?: string;
  guests?: number;
  customerName?: string;
  customerEmail?: string;
  seatingPreference?: string;
  specialOccasion?: string;
  specialRequest?: string;
  payLater?: boolean;
  createdAt?: string | Date;
  confirmedAt?: string | Date;
  checkInDate?: string | Date;
  checkOutDate?: string | Date;
  room?: {
    _id?: string;
    id?: string;
    name?: string;
    adultsCapacity?: number;
    pricePerNight?: number;
    discount?: number;
    [key: string]: unknown;
  };
  vendor?: BookingVendorRef;
  rooms?: BookingRoomRef[];
  tables?: BookingTableRef[];
  menus?: BookingMenuRef[];
  drinks?: BookingDrinkRef[];
  paymentRefs?: BookingPaymentRef[];
  [key: string]: unknown;
}

// ─── Payments / Earnings ──────────────────────────────────────────────────────

export interface Payment {
  _id?: string;
  id?: string;
  transactionId?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paymentMethod?: string;
  reservationId?: string;
  bookingId?: string;
  vendorId?: string;
  userId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
}

export interface Payout {
  _id?: string;
  id?: string;
  amount?: number;
  status?: string;
  vendorId?: string;
  createdAt?: string | Date;
  [key: string]: unknown;
}

export interface EarningTrendPoint {
  date?: string;
  name?: string;
  amount?: number;
  revenue?: number;
  [key: string]: unknown;
}

export interface DashboardKpis {
  [key: string]: unknown;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  _id?: string;
  id?: string;
  rating?: number;
  comment?: string;
  review?: string;
  user?: AuthUser | string;
  vendorId?: string;
  createdAt?: string | Date;
  [key: string]: unknown;
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface LocationState {
  lat?: number | null;
  lng?: number | null;
  city?: string;
  country?: string;
  status?: 'idle' | 'loading' | 'success' | 'error' | string;
  error?: string | null;
}

export interface SearchSuggestion {
  _id?: string;
  id?: string;
  businessName?: string;
  name?: string;
  type?: string;
  address?: string;
  city?: string;
  [key: string]: unknown;
}

// ─── Navigation / Generic ─────────────────────────────────────────────────────

export interface AppRoute {
  path: string;
  element: import('react').ReactNode;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';
