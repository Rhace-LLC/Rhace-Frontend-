import { useRestaurantData } from '@/hooks/favorites';
import type { VenueFilter, VenueVertical } from '../config/venue.config';

/**
 * Homepage listing data. Thin, well-named wrapper around the shared
 * `useRestaurantData(vendorType, filter)` hook so call sites read as
 * `useVenues('restaurant', 'nearby')` instead of restaurant-named generics.
 */
export const useVenues = (vertical: VenueVertical, filter?: VenueFilter) => {
  const { restaurants, isLoading } = useRestaurantData(vertical, filter);
  return { venues: restaurants, isLoading };
};
