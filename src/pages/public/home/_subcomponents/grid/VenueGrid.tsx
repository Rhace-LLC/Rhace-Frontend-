import { useVenues } from '../hooks/useVenues';
import {
  getImagesForVenue,
  hasMultipleVenueImages,
  useVenueCarousel,
} from '../hooks/useVenueCarousel';
import type { VenueFilter, VenueVertical } from '../config/venue.config';
import { SectionHeader } from './SectionHeader';
import { VenueGridCard, type VenueGridItem } from './VenueGridCard';
import { VenueGridSkeleton } from './VenueGridSkeleton';

interface VenueGridProps {
  title: string;
  vertical: VenueVertical;
  filter?: VenueFilter;
}

/**
 * Single generic listing grid. Replaces TableGrid (restaurant),
 * TableGridTwo (hotel) and TableGridThree (club) from
 * `src/components/Tablegrid.tsx`.
 *
 * NOTE: the old grids had a dead "Show more" button (`let limit = 4`
 * mutated without setState, so it never re-rendered). This grid renders
 * the full list, matching what users actually saw.
 */
export const VenueGrid = ({ title, vertical, filter }: VenueGridProps) => {
  const { currentIndices, handleMouseEnter, handleMouseLeave, handleDotClick } =
    useVenueCarousel();
  const { venues, isLoading } = useVenues(vertical, filter);

  if (isLoading) return <VenueGridSkeleton />;

  const list = (venues as VenueGridItem[]) || [];
  if (list.length === 0) return null;

  return (
    <div className="mb-12 md:mb-20 lg:mb-[92px] px- sm:px-6 lg:px-8">
      <SectionHeader title={title} />

      <div className="flex flex-nowrap sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-6 overflow-x-auto sm:overflow-x-visible scrollbar-hide sm:scrollbar-default pb-4 sm:pb-0 sm:mx-0 px-2 sm:px-0">
        {list.map((venue) => {
          const images = getImagesForVenue(venue);
          const venueId = venue._id || String(venue.id);
          return (
            <VenueGridCard
              key={venueId}
              venue={venue}
              vertical={vertical}
              images={images}
              currentIndex={currentIndices[venueId] || 0}
              multipleImages={hasMultipleVenueImages(venue)}
              onDotClick={(index, e) => handleDotClick(venueId, index, e)}
              onHoverStart={() =>
                handleMouseEnter(venueId, venue, getImagesForVenue, hasMultipleVenueImages)
              }
              onHoverEnd={() => handleMouseLeave(venueId)}
            />
          );
        })}
      </div>
    </div>
  );
};
