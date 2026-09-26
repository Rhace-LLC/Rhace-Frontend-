import ClubImg from '@/public/images/find-club.png';
import HotelImg from '@/public/images/find-hotel.jpg';
import RestaurantImg from '@/public/images/find.png';

// ─── Tabs / verticals ─────────────────────────────────────────────────────────
// URL-style plural tab (used in localStorage + page state) vs singular vertical
// (used by the API + TYPE_CONFIG paths).
export type VenueTab = 'restaurants' | 'hotels' | 'clubs';
export type VenueVertical = 'restaurant' | 'hotel' | 'club';
export type VenueFilter = 'top-rate' | 'nearby' | undefined;

export const VENUE_TABS: VenueTab[] = ['restaurants', 'hotels', 'clubs'];

export const TAB_TO_VERTICAL: Record<VenueTab, VenueVertical> = {
  restaurants: 'restaurant',
  hotels: 'hotel',
  clubs: 'club',
};

export const VERTICAL_TO_TAB: Record<VenueVertical, VenueTab> = {
  restaurant: 'restaurants',
  hotel: 'hotels',
  club: 'clubs',
};

export const isVenueTab = (v: unknown): v is VenueTab =>
  v === 'restaurants' || v === 'hotels' || v === 'clubs';

// ─── Hero copy (previously a 3-way ternary in home/index.tsx) ─────────────────
interface HeroCopy {
  image: string;
  title: string;
  subtitle: string;
}

export const VENUE_HERO: Record<VenueTab, HeroCopy> = {
  restaurants: {
    image: RestaurantImg,
    title: 'Find your Perfect Table',
    subtitle: 'Discover and reserve the best restaurants in your city',
  },
  hotels: {
    image: HotelImg,
    title: 'Start Living Your Dream',
    subtitle: 'Discover and reserve the best hotels in your city',
  },
  clubs: {
    image: ClubImg,
    title: 'Get Your Groove On',
    subtitle: 'Discover and reserve the best clubs in your city',
  },
};

// ─── Listing sections per tab (previously 3 conditional blocks x3 grids) ─────
export interface VenueSection {
  title: string;
  filter: VenueFilter;
}

export const VENUE_SECTIONS: Record<VenueTab, VenueSection[]> = {
  restaurants: [
    { title: 'Popular Restaurants', filter: undefined },
    { title: 'Top-Rated Restaurants', filter: 'top-rate' },
    { title: 'Nearby Restaurants', filter: 'nearby' },
  ],
  hotels: [
    { title: 'Popular Hotels', filter: undefined },
    { title: 'Top-Rated Hotels', filter: 'top-rate' },
    { title: 'Nearby Hotels', filter: 'nearby' },
  ],
  clubs: [
    { title: 'Popular Clubs', filter: undefined },
    { title: 'Top-Rated Clubs', filter: 'top-rate' },
    { title: 'Nearby Clubs', filter: 'nearby' },
  ],
};

// ─── Search bar config (previously ternaries inside SearchSection) ────────────
export const VENUE_SEARCH_PLACEHOLDER: Record<VenueTab, string> = {
  restaurants: 'Search Restaurants, Cuisine...',
  hotels: 'Enter Hotel name or area',
  clubs: 'Enter Club name or area',
};

export const VENUE_SEARCH_LABEL: Record<VenueTab, string> = {
  restaurants: 'Restaurant/Cuisine',
  hotels: 'Hotels',
  clubs: 'Clubs',
};

export const VENUE_TIME_SLOTS: Record<VenueTab, string[]> = {
  restaurants: [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '12:00 PM',
    '12:30 PM',
    '01:00 PM',
    '01:30 PM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:00 PM',
    '04:30 PM',
    '05:00 PM',
    '05:30 PM',
    '06:00 PM',
    '06:30 PM',
    '07:00 PM',
    '07:30 PM',
    '08:00 PM',
    '08:30 PM',
  ],
  hotels: [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '11:30 AM',
    '01:00 PM',
    '02:00 PM',
    '04:00 PM',
    '04:30 PM',
    '05:00 PM',
    '06:00 PM',
    '06:30 PM',
    '07:30 PM',
    '08:00 PM',
    '09:00 PM',
  ],
  clubs: [
    '09:00 PM',
    '09:30 PM',
    '10:00 PM',
    '10:30 PM',
    '11:00 PM',
    '11:30 PM',
    '12:00 AM',
    '12:30 AM',
    '01:00 AM',
    '01:30 AM',
    '02:00 AM',
    '02:30 AM',
    '03:00 AM',
  ],
};
