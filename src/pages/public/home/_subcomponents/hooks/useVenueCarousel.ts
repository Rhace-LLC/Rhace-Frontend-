import { useCarouselLogic } from '@/hooks/favorites';

/**
 * Image-carousel state for venue cards (hover rotation + dot navigation).
 * Re-exported under a venue-neutral name so the homepage doesn't import
 * "carousel logic" from a file called `favorites`.
 */
export const useVenueCarousel = () => useCarouselLogic();

export {
  getImagesForRestaurant as getImagesForVenue,
  hasMultipleImages as hasMultipleVenueImages,
} from '@/hooks/favorites';
