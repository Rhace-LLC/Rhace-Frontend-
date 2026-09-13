import {
  ARRAY_KEYS,
  CHIP_LABEL_MAPS,
  BOOL_KEYS,
  PRICE_LABELS,
  TYPE_CONFIG,
  LS_RECENT,
  MAX_RECENT,
  type FilterState,
} from './constants';

// ─── Recent searches ──────────────────────────────────────────────────────────
export const getRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_RECENT) || '') || [];
  } catch {
    return [];
  }
};
export const saveRecent = (t: string): void => {
  if (!t?.trim() || t.trim().length < 2) return;
  localStorage.setItem(
    LS_RECENT,
    JSON.stringify(
      [t.trim(), ...getRecent().filter((s) => s.toLowerCase() !== t.toLowerCase())].slice(
        0,
        MAX_RECENT
      )
    )
  );
};
export const delRecent = (t: string): void =>
  localStorage.setItem(LS_RECENT, JSON.stringify(getRecent().filter((s) => s !== t)));

// ─── URL param helpers ────────────────────────────────────────────────────────
export const arrFromParam = (sp: URLSearchParams, key: string): string[] =>
  sp.get(key) ? sp.get(key)!.split(',').filter(Boolean) : [];

export const filtersFromParams = (sp: URLSearchParams): FilterState => ({
  type: sp.get('type') || '',
  city: sp.get('city') || '',
  minRating: sp.get('minRating') || '',
  minPrice: sp.get('minPrice') || '',
  maxPrice: sp.get('maxPrice') || '',
  sort: sp.get('sort') || 'rating',
  cuisines: arrFromParam(sp, 'cuisines'),
  dietaryOptions: arrFromParam(sp, 'dietaryOptions'),
  diningStyle: sp.get('diningStyle') || '',
  seatOptions: arrFromParam(sp, 'seatOptions'),
  occasionTags: arrFromParam(sp, 'occasionTags'),
  mealTimes: arrFromParam(sp, 'mealTimes'),
  reservationPolicy: sp.get('reservationPolicy') || '',
  hasParking: sp.get('hasParking') || '',
  hasOutdoorSeating: sp.get('hasOutdoorSeating') || '',
  starRating: sp.get('starRating') || '',
  propertyType: sp.get('propertyType') || '',
  amenities: arrFromParam(sp, 'amenities'),
  mealPlan: sp.get('mealPlan') || '',
  cancellationPolicy: sp.get('cancellationPolicy') || '',
  instantBook: sp.get('instantBook') || '',
  petFriendly: sp.get('petFriendly') || '',
  accessibilityFeatures: arrFromParam(sp, 'accessibilityFeatures'),
  venueType: sp.get('venueType') || '',
  clubTime: sp.get('clubTime') || '',
  tableType: sp.get('tableType') || '',
  musicGenres: arrFromParam(sp, 'musicGenres'),
  livePerformanceTypes: arrFromParam(sp, 'livePerformanceTypes'),
  dressCode: sp.get('dressCode') || '',
  agePolicy: sp.get('agePolicy') || '',
  hasVIPTables: sp.get('hasVIPTables') || '',
  hasGuestlist: sp.get('hasGuestlist') || '',
  hasOutdoorArea: sp.get('hasOutdoorArea') || '',
  entryFee: sp.get('entryFee') || '',
  openNow: sp.get('openNow') || '',
});

// ─── Suggestion normalizer ────────────────────────────────────────────────────
export interface NormalizedSuggestion {
  _id: string;
  businessName: string;
  vendorType: string;
  profileImages: unknown[];
  address: string;
  rating: number;
  vendorTypeCategory: string;
}

export const normalizeSuggestion = (
  item: string | Record<string, unknown> | null | undefined,
  fallbackType?: string
): NormalizedSuggestion | null => {
  if (!item) return null;
  if (typeof item === 'string')
    return {
      _id: item,
      businessName: item,
      vendorType: fallbackType || 'restaurant',
      profileImages: [],
      address: '',
      rating: 0,
      vendorTypeCategory: '',
    };
  const i = item as Record<string, any>;
  return {
    _id: i._id || i.id || i.businessName || i.name || '',
    businessName: i.businessName || i.name || i.title || i.value || '',
    vendorType: i.vendorType || i.type || fallbackType || 'restaurant',
    profileImages: i.profileImages || i.images || [],
    address: i.address || i.location || '',
    rating: i.rating || 0,
    vendorTypeCategory: i.vendorTypeCategory || i.category || '',
  };
};

// ─── Active filter count ──────────────────────────────────────────────────────
export const countActiveFilters = (filters: FilterState): number =>
  [
    filters.city,
    filters.minRating,
    filters.minPrice,
    filters.sort !== 'rating' ? 1 : null,
    filters.diningStyle,
    filters.reservationPolicy,
    filters.starRating,
    filters.propertyType,
    filters.mealPlan,
    filters.cancellationPolicy,
    filters.venueType,
    filters.dressCode,
    filters.agePolicy,
    filters.entryFee !== '' ? 1 : null,
    filters.clubTime,
    filters.tableType,
    ...ARRAY_KEYS.map((k) => ((filters as unknown as Record<string, string[]>)[k]?.length ? 1 : null)),
    ...BOOL_KEYS.map((k) =>
      (filters as unknown as Record<string, string>)[k] === 'true' ? 1 : null
    ),
  ].filter(Boolean).length;

// ─── Build filter chips ───────────────────────────────────────────────────────
export interface Chip {
  key: string;
  label: string | undefined;
  clear: () => void;
}

export const buildChips = (f: FilterState, onChange: (key: string, value: unknown) => void): Chip[] => {
  const chips: Chip[] = [];
  if (f.type)
    chips.push({
      key: 'type',
      label: TYPE_CONFIG[f.type as keyof typeof TYPE_CONFIG]?.label,
      clear: () => onChange('type', ''),
    });
  if (f.city) chips.push({ key: 'city', label: `📍 ${f.city}`, clear: () => onChange('city', '') });
  if (f.minRating)
    chips.push({
      key: 'minRating',
      label: `${f.minRating}+ ⭐`,
      clear: () => onChange('minRating', ''),
    });
  if (f.minPrice)
    chips.push({
      key: 'price',
      label: PRICE_LABELS[Number(f.minPrice)] || '₦',
      clear: () => {
        onChange('minPrice', '');
        onChange('maxPrice', '');
      },
    });
  if (f.sort !== 'rating')
    chips.push({
      key: 'sort',
      label: { price_asc: 'Price ↑', price_desc: 'Price ↓', newest: 'Newest' }[
        f.sort as 'price_asc' | 'price_desc' | 'newest'
      ],
      clear: () => onChange('sort', 'rating'),
    });
  if (f.diningStyle)
    chips.push({
      key: 'diningStyle',
      label: f.diningStyle,
      clear: () => onChange('diningStyle', ''),
    });
  if (f.reservationPolicy)
    chips.push({
      key: 'reservationPolicy',
      label: f.reservationPolicy,
      clear: () => onChange('reservationPolicy', ''),
    });
  if (f.starRating)
    chips.push({
      key: 'starRating',
      label: '★'.repeat(Number(f.starRating)),
      clear: () => onChange('starRating', ''),
    });
  if (f.propertyType)
    chips.push({
      key: 'propertyType',
      label: f.propertyType,
      clear: () => onChange('propertyType', ''),
    });
  if (f.mealPlan)
    chips.push({ key: 'mealPlan', label: f.mealPlan, clear: () => onChange('mealPlan', '') });
  if (f.cancellationPolicy)
    chips.push({
      key: 'cancellationPolicy',
      label: f.cancellationPolicy,
      clear: () => onChange('cancellationPolicy', ''),
    });
  if (f.venueType)
    chips.push({ key: 'venueType', label: f.venueType, clear: () => onChange('venueType', '') });
  if (f.dressCode)
    chips.push({ key: 'dressCode', label: f.dressCode, clear: () => onChange('dressCode', '') });
  if (f.agePolicy)
    chips.push({ key: 'agePolicy', label: f.agePolicy, clear: () => onChange('agePolicy', '') });
  if (f.entryFee !== '')
    chips.push({
      key: 'entryFee',
      label: f.entryFee === '0' ? 'Free Entry' : 'Paid Entry',
      clear: () => onChange('entryFee', ''),
    });
  if (f.clubTime)
    chips.push({
      key: 'clubTime',
      label: f.clubTime + ' Slot',
      clear: () => onChange('clubTime', ''),
    });
  if (f.tableType)
    chips.push({
      key: 'tableType',
      label: `${f.tableType[0]?.toUpperCase()}${f.tableType.slice(1)} Table`,
      clear: () => onChange('tableType', ''),
    });
  BOOL_KEYS.forEach((k) => {
    if ((f as unknown as Record<string, string>)[k] === 'true')
      chips.push({
        key: k,
        label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        clear: () => onChange(k, ''),
      });
  });
  ARRAY_KEYS.forEach((k) => {
    const val = (f as unknown as Record<string, string[]>)[k] || [];
    val.forEach((v) =>
      chips.push({
        key: `${k}-${v}`,
        label: CHIP_LABEL_MAPS[k]?.[v] || v,
        clear: () => onChange(k, (f as unknown as Record<string, string[]>)[k].filter((x) => x !== v)),
      })
    );
  });
  return chips;
};
