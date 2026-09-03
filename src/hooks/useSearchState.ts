import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { filtersFromParams, saveRecent, getRecent } from '../utils/filterUtils';
import { searchSvc, type SearchLocation } from '../services/search.service';
import { DEFAULT_FILTERS, TYPE_SPECIFIC_KEYS, DEBOUNCE_MS, type FilterState } from '../utils/constants';

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  [key: string]: unknown;
}

const EMPTY_PAGINATION: Pagination = {
  currentPage: 1,
  totalPages: 0,
  totalCount: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

export const useSearchState = (userLocation: SearchLocation) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Search input ──────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<unknown[]>([]);
  const [isSugLoading, setIsSugLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent());
  const [trending, setTrending] = useState<unknown[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState(false);

  // ── Results ───────────────────────────────────────────────────────────────
  const [results, setResults] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [facets, setFacets] = useState<Record<string, unknown>>({});
  const [activeQuery, setActiveQuery] = useState(searchParams.get('q') || '');

  // ── Discovery (no-search state) ───────────────────────────────────────────
  const [discovery, setDiscovery] = useState<Record<string, unknown>>({});
  const [isDiscLoading, setIsDiscLoading] = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(() => filtersFromParams(searchParams));

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasActiveSearch = !!searchParams.get('q');

  // ── Load trending when type changes ──────────────────────────────────────
  useEffect(() => {
    setIsTrendLoading(true);
    searchSvc
      .trending(filters.type || undefined)
      .then(setTrending)
      .catch(() => {})
      .finally(() => setIsTrendLoading(false));
  }, [filters.type]);

  // ── Load discovery data when no active search OR when type changes ────────
  useEffect(() => {
    if (hasActiveSearch) return;
    setIsDiscLoading(true);
    searchSvc
      .discover(userLocation, filters.type || undefined) // <-- pass type
      .then(setDiscovery)
      .catch(() => {})
      .finally(() => setIsDiscLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveSearch, userLocation.lat, userLocation.lng, filters.type]);

  // ── Autocomplete suggestions ──────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (inputValue.trim().length < 1) {
      setSuggestions([]);
      setIsSugLoading(false);
      return;
    }
    setIsSugLoading(true);
    debounceRef.current = setTimeout(() => {
      searchSvc
        .suggestions(inputValue, filters.type || undefined, userLocation)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setIsSugLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, filters.type, userLocation.lat, userLocation.lng]);

  // ── Execute search when URL params change ─────────────────────────────────
  useEffect(() => {
    const q = searchParams.get('q');
    if (!q) {
      setResults([]);
      setActiveQuery('');
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);
    setError(null);
    const parsed = filtersFromParams(searchParams);
    setFilters(parsed);
    searchSvc
      .search({ q, page: searchParams.get('page') || '1', limit: '30', ...parsed }, userLocation)
      .then((data) => {
        const d = data as Record<string, unknown> & {
          data?: unknown[];
          pagination?: Pagination;
          facets?: Record<string, unknown>;
        };
        setResults(d.data || []);
        setPagination((d.pagination as Pagination) || EMPTY_PAGINATION);
        setFacets(d.facets || {});
        setActiveQuery(q);
      })
      .catch((err: { name?: string; code?: string }) => {
        if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
        setError('Search failed. Please try again.');
        setResults([]);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userLocation.lat, userLocation.lng]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const submitSearch = useCallback(
    (term?: string) => {
      // 1. Determine the query and trim it
      const q = (term !== undefined ? term : inputValue).trim();

      const next = new URLSearchParams(searchParams);

      if (!q) {
        // 2. If empty, remove 'q' and reset pagination
        next.delete('q');
        next.set('page', '1');
        setInputValue(''); // Clear the actual input state
      } else {
        // 3. If exists, save to recent and set param
        saveRecent(q);
        setRecentSearches(getRecent());
        setInputValue(q);
        next.set('q', q);
        next.set('page', '1');
      }

      // 4. Update the URL
      setSearchParams(next);
      setSuggestions([]);
    },
    [inputValue, searchParams, setSearchParams]
  );

  const updateFilter = useCallback(
    (key: string, value: unknown) => {
      const next = new URLSearchParams(searchParams);
      if (Array.isArray(value)) {
        value.length ? next.set(key, value.join(',')) : next.delete(key);
      } else {
        value !== '' && value != null ? next.set(key, String(value)) : next.delete(key);
      }
      if (key === 'type') {
        const typeValue = (value as string) || '';
        TYPE_SPECIFIC_KEYS.forEach((k) => next.delete(k));
        setFilters((prev) => ({
          ...DEFAULT_FILTERS,
          type: typeValue,
          sort: prev.sort,
          city: prev.city,
          minRating: prev.minRating,
          minPrice: prev.minPrice,
          maxPrice: prev.maxPrice,
        }));
      } else {
        setFilters((prev) => ({ ...prev, [key]: value as never }));
      }
      next.set('page', '1');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const clearFilters = useCallback(() => {
    const q = searchParams.get('q');
    const type = filters.type;
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (type) next.set('type', type);
    setFilters({ ...DEFAULT_FILTERS, type });
    setSearchParams(next);
  }, [searchParams, setSearchParams, filters.type]);

  const goToPage = useCallback(
    (page: number) => {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(page));
      setSearchParams(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [searchParams, setSearchParams]
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const showRecent =
    isFocused && inputValue.trim().length === 0 && recentSearches.length > 0;
  const showTrending = isFocused && inputValue.trim().length === 0 && !showRecent;
  const showSuggestions = isFocused && inputValue.trim().length >= 1;
  const showDropdown =
    (isFocused || inputValue.length > 0) && (showRecent || showTrending || showSuggestions);

  const hasFilters =
    Object.entries(filters).some(([k, v]) => {
      if (k === 'type' || k === 'sort') return false;
      return Array.isArray(v) ? v.length > 0 : v !== '' && v != null;
    }) || filters.sort !== 'rating';

  return {
    inputValue,
    setInputValue,
    isFocused,
    setIsFocused,
    inputRef,
    suggestions,
    isSugLoading,
    recentSearches,
    setRecentSearches,
    trending,
    isTrendLoading,
    showRecent,
    showTrending,
    showSuggestions,
    showDropdown,
    results,
    isLoading,
    error,
    pagination,
    facets,
    activeQuery,
    discovery,
    isDiscLoading,
    filters,
    hasFilters,
    hasActiveSearch,
    submitSearch,
    updateFilter,
    clearFilters,
    goToPage,
  };
};
