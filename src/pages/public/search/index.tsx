import { useEffect, useState } from 'react';
import Footer from '@/navigation/user_layout/_sub_component/Footer';

import { useSearchLocation } from '@/hooks/useSearchLocations';
import { useSearchState } from '@/hooks/useSearchState';
import { SearchHeader } from '@/components/SearchHeader';
import { DiscoveryHome } from '@/components/DiscoveryHome';
import { SearchResults } from '@/components/SearchResults';
import { FilterDrawer, DesktopFilterSidebar } from '@/components/FilterDrawer';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { SearchBarProps } from '@/components/SearchBar';
import type { VendorLike } from '@/components/VenueCard';

// Strip trailing "s" from plural type names coming from URL/tabs
// e.g. "restaurants" → "restaurant", "hotels" → "hotel", "clubs" → "club"
const normalizeType = (type?: string | null): string => {
  if (!type) return '';
  const MAP: Record<string, string> = {
    restaurants: 'restaurant',
    hotels: 'hotel',
    clubs: 'club',
    restaurant: 'restaurant',
    hotel: 'hotel',
    club: 'club',
  };
  return MAP[type.toLowerCase()] || type.replace(/s$/, '');
};

const SearchPage = () => {
  const locationState = useSearchLocation();
  const searchState = useSearchState(locationState.location);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Normalise the ?type= param on mount and whenever it changes
  // e.g. /search?type=restaurants → /search?type=restaurant
  useEffect(() => {
    const rawType = searchParams.get('type');
    if (!rawType) return;
    const clean = normalizeType(rawType);
    if (clean !== rawType) {
      const next = new URLSearchParams(searchParams);
      next.set('type', clean);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // When user clicks a type tab/chip in the UI,
  // update the URL param (singular form) without resetting the query.
  const handleTypeChange = (rawType: string) => {
    const type = normalizeType(rawType);
    const next = new URLSearchParams(searchParams);
    if (type) {
      next.set('type', type);
    } else {
      next.delete('type');
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  // Override updateFilter so that type values are always normalised
  const updateFilterSafe = (key: string, value: unknown) => {
    if (key === 'type') {
      searchState.updateFilter(key, normalizeType(value as string));
    } else {
      searchState.updateFilter(key, value);
    }
  };

  const searchBarProps = {
    inputValue: searchState.inputValue,
    setInputValue: searchState.setInputValue,
    isFocused: searchState.isFocused,
    setIsFocused: searchState.setIsFocused,
    inputRef: searchState.inputRef,
    submitSearch: searchState.submitSearch,
    showDropdown: searchState.showDropdown,
    showRecent: searchState.showRecent,
    showTrending: searchState.showTrending,
    showSuggestions: searchState.showSuggestions,
    recentSearches: searchState.recentSearches,
    setRecentSearches: searchState.setRecentSearches,
    trending: searchState.trending as unknown as SearchBarProps['trending'],
    isTrendLoading: searchState.isTrendLoading,
    suggestions: searchState.suggestions as unknown as SearchBarProps['suggestions'],
    isSugLoading: searchState.isSugLoading,
  };

  return (
    <div className="min-h-screen bg-white">
      <SearchHeader
        searchProps={searchBarProps as unknown as SearchBarProps}
        filters={searchState.filters}
        updateFilter={updateFilterSafe}
        locationState={locationState}
      />

      {searchState.hasActiveSearch ? (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 bg-white lg:px-8 py-4 sm:py-6">
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0">
              <SearchResults
                results={searchState.results as VendorLike[]}
                isLoading={searchState.isLoading}
                error={searchState.error}
                pagination={searchState.pagination}
                activeQuery={searchState.activeQuery}
                filters={searchState.filters}
                updateFilter={updateFilterSafe}
                clearFilters={searchState.clearFilters}
                hasFilters={searchState.hasFilters}
                facets={searchState.facets}
                goToPage={searchState.goToPage}
                onOpenFilters={() => setIsFilterOpen(true)}
              />
            </div>
          </div>
        </div>
      ) : (
        <DiscoveryHome
          discovery={searchState.discovery as any}
          isDiscLoading={searchState.isDiscLoading}
          locationState={locationState}
          updateFilter={updateFilterSafe}
          submitSearch={searchState.submitSearch}
          inputRef={searchState.inputRef}
          activeType={normalizeType(searchState.filters.type || '')}
          recentSearches={searchState.recentSearches}
        />
      )}

      {/* Filter drawer (mobile) */}
      {isFilterOpen && (
        <FilterDrawer
          {...({
            filters: searchState.filters,
            updateFilter: updateFilterSafe,
            clearFilters: searchState.clearFilters,
            onClose: () => setIsFilterOpen(false),
          } as any)}
        />
      )}

      <Footer />
    </div>
  );
};

export default SearchPage;