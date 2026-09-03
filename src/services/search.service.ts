import api from '@/lib/axios';
import { normalizeSuggestion } from '../utils/filterUtils';

export interface SearchLocation {
  lat?: number | null;
  lng?: number | null;
}

export const searchSvc = {
  suggestions: async (
    q: string,
    type?: string,
    location?: SearchLocation
  ): Promise<ReturnType<typeof normalizeSuggestion>[]> => {
    if (!q) return [];
    const params = new URLSearchParams();
    params.set('search', q);
    if (type) params.set('type', type);
    if (location?.lat != null && location?.lng != null) {
      params.set('latitude', String(location.lat));
      params.set('longitude', String(location.lng));
    }
    const res = await api.get(`/search/suggestions?${params}`);
    return res.data.suggestions;
  },

  search: (params: Record<string, unknown>, location?: SearchLocation) => {
    const cleaned: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length) cleaned[k] = v.join(',');
      } else if (v !== '' && v != null) cleaned[k] = String(v);
    });
    if (location?.lat != null && location?.lng != null) {
      cleaned.latitude = String(location.lat);
      cleaned.longitude = String(location.lng);
    }
    if (cleaned.q) {
      cleaned.search = cleaned.q;
      delete cleaned.q;
    }
    return api.get(`/search?${new URLSearchParams(cleaned)}`).then((r) => r.data);
  },

  trending: (type?: string) =>
    api.get(`/search/trending${type ? `?type=${type}` : ''}`).then((r) => r.data.trending || []),

  discover: (location?: SearchLocation, type?: string) => {
    const params = new URLSearchParams();
    if (location?.lat != null && location?.lng != null) {
      params.set('latitude', String(location.lat));
      params.set('longitude', String(location.lng));
      params.set('type', type || '');
    }
    return api
      .get(`/search/discover${params.toString() ? `?${params}` : ''}`)
      .then((r) => r.data.data || {});
  },
};
