import { DEBOUNCE_MS, LS_RECENT, MAX_RECENT } from '@/utils/constants';

// ─── recent searches (localStorage) ───────────────────────────────────────────
export const getRecentSearches = (): string[] => {
  try {
    const raw = localStorage.getItem(LS_RECENT);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

export const saveRecentSearch = (term?: string) => {
  if (!term?.trim() || term.trim().length < 2) return;
  localStorage.setItem(
    LS_RECENT,
    JSON.stringify(
      [term.trim(), ...getRecentSearches().filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(
        0,
        MAX_RECENT
      )
    )
  );
};

export const deleteRecentSearch = (term: string) =>
  localStorage.setItem(LS_RECENT, JSON.stringify(getRecentSearches().filter((s) => s !== term)));

export const clearRecentSearches = () => localStorage.removeItem(LS_RECENT);

export { DEBOUNCE_MS };

// ─── search URL ───────────────────────────────────────────────────────────────
interface BuildSearchUrlParams {
  q?: string;
  type?: string;
  date?: string;
  time?: string;
  guests?: number;
}

export const buildVenueSearchUrl = ({ q, type, date, time, guests }: BuildSearchUrlParams) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (date) params.set('date', date);
  if (time) params.set('time', time);
  if (guests && guests > 0) params.set('guests', String(guests));
  params.set('page', '1');
  return `/search?${params.toString()}`;
};

// ─── best-effort user location ────────────────────────────────────────────────
export interface VenueUserLocation {
  lat?: number | null;
  lng?: number | null;
  city?: string;
  country?: string;
  [key: string]: unknown;
}

const LS_LOCATION_KEY = 'rhace_user_location';

export const getVenueUserLocation = (): VenueUserLocation => {
  try {
    const raw = localStorage.getItem(LS_LOCATION_KEY);
    if (raw) return JSON.parse(raw) as VenueUserLocation;
  } catch {
    /* ignore */
  }
  return {};
};
