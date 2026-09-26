import api from '@/lib/axios';
import type { VenueUserLocation } from './venueSearch.utils';

export interface VenueSuggestion {
  _id?: string;
  id?: string;
  text?: string;
  businessName?: string;
  name?: string;
  title?: string;
  value?: string;
  vendorType?: string;
  type?: string;
  profileImages?: string[] | ({ url?: string } | string)[];
  images?: string[];
  image?: string;
  address?: string;
  location?: string;
  rating?: number;
  label?: string;
  vendorTypeCategory?: string;
  category?: string;
  [key: string]: unknown;
}

/** Normalise whatever the API returns into a VenueSuggestion. */
export const normalizeSuggestion = (item: unknown, fallbackType?: string): VenueSuggestion | null => {
  if (!item) return null;
  if (typeof item === 'string')
    return {
      _id: item,
      businessName: item,
      vendorType: fallbackType || 'restaurant',
      profileImages: [],
      address: '',
      rating: 0,
    };
  const it = item as Record<string, unknown>;
  return {
    _id:
      (it._id as string) ||
      (it.id as string) ||
      (it.businessName as string) ||
      (it.name as string) ||
      '',
    businessName:
      (it.businessName as string) ||
      (it.name as string) ||
      (it.title as string) ||
      (it.value as string) ||
      '',
    vendorType: (it.vendorType as string) || (it.type as string) || fallbackType || 'restaurant',
    profileImages:
      (it.profileImages as VenueSuggestion['profileImages']) || (it.images as string[]) || [],
    address: (it.address as string) || (it.location as string) || '',
    rating: (it.rating as number) || 0,
    vendorTypeCategory: (it.vendorTypeCategory as string) || (it.category as string) || '',
  };
};

/** Suggestion + trending endpoints (same logic as the old SearchSection). */
export const venueSearchService = {
  suggestions: async (
    q: string,
    type?: string,
    _location?: VenueUserLocation
  ): Promise<VenueSuggestion[]> => {
    if (!q) return [];
    const params = new URLSearchParams();
    params.set('search', q);
    if (type) params.set('type', type);
    try {
      const res = await api.get(`/search/suggestions?${params}`);
      return (res.data?.suggestions as VenueSuggestion[]) || [];
    } catch {
      /* fall through to /search */
    }
    try {
      const fp = new URLSearchParams(params);
      fp.set('limit', '5');
      const res = await api.get(`/search?${fp}`);
      const data = res.data;
      const items: unknown[] = Array.isArray(data) ? data : data?.data || [];
      return items
        .map((i) => normalizeSuggestion(i, type))
        .filter((i): i is VenueSuggestion => i !== null);
    } catch {
      return [];
    }
  },
  trending: (type?: string): Promise<VenueSuggestion[]> =>
    api
      .get(`/search/trending${type ? `?type=${type}` : ''}`)
      .then((r) => (r.data?.trending as VenueSuggestion[]) || []),
};
