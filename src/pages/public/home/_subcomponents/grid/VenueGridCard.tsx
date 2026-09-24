import { FaStar } from 'react-icons/fa6';
import { useNavigate } from 'react-router';
import { FavoriteButton } from '@/components/user/ui/favoritebutton';
import { formatOfferText } from '@/utils/helper';
import { TYPE_CONFIG } from '@/utils/constants';
import type { VenueVertical } from '../config/venue.config';

// ─── Row shape (same fields the old TableGrid/Two/Three read) ─────────────────
export interface VenueGridItem {
  _id?: string;
  id?: string;
  businessName?: string;
  rating?: number;
  reviews?: number | string;
  address?: string;
  cuisines?: string[] | string;
  categories?: string[] | string;
  specialCategory?: string;
  priceRange?: number | string;
  offer?: string;
  [key: string]: unknown;
}

const parseList = (value?: string[] | string): string[] =>
  Array.isArray(value)
    ? value
    : ((value
        ?.split(',')
        .map((c) => c.trim())
        .filter(Boolean) as string[]) || []);

const cuisineColorPalette = [
  'bg-orange-100 border-orange-200',
  'bg-green-100 border-green-200',
  'bg-blue-100 border-blue-200',
  'bg-purple-100 border-purple-200',
  'bg-pink-100 border-pink-200',
  'bg-yellow-100 border-yellow-200',
  'bg-teal-100 border-teal-200',
];

interface VenueGridCardProps {
  venue: VenueGridItem;
  vertical: VenueVertical;
  images: string[];
  currentIndex: number;
  multipleImages: boolean;
  onDotClick: (index: number, e: React.MouseEvent) => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

/**
 * Single venue card. Replaces the three copy-pasted cards in the old
 * TableGrid (restaurant) / TableGridTwo (hotel) / TableGridThree (club).
 * Only the info footer differs per vertical.
 */
export const VenueGridCard = ({
  venue,
  vertical,
  images,
  currentIndex,
  multipleImages,
  onDotClick,
  onHoverStart,
  onHoverEnd,
}: VenueGridCardProps) => {
  const navigate = useNavigate();
  const venueId = venue._id || String(venue.id);
  const path = TYPE_CONFIG[vertical]?.path || vertical;
  const go = () => navigate(`/${path}/${venueId}`);

  const cuisines = parseList(venue.cuisines);
  const categories = parseList(venue.categories);

  return (
    <div
      onClick={go}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      className="snap-start min-w-[185px] sm:min-w-0 w-[185px] sm:w-auto h-auto sm:h-full shrink-0 sm:shrink cursor-pointer pb-2 sm:pb-4 flex flex-col bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-300 transition-all duration-300 active:scale-[0.98] hover:shadow-md hover:-translate-y-1"
    >
      {/* Image carousel */}
      <div className="relative px-2 pt-2 h-30 sm:h-44 w-full cursor-pointer aspect-video group">
        <div className="relative h-full w-full overflow-hidden rounded-lg sm:rounded-xl bg-gray-100">
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={venue.businessName || vertical}
              className={`absolute size-full object-cover transition-all duration-500 ease-in-out ${
                index === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
              style={{
                transform:
                  index === currentIndex
                    ? 'translateX(0) scale(1)'
                    : 'translateX(100%) scale(1.05)',
              }}
            />
          ))}
          <div className="absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
          {venue.specialCategory && (
            <span className="absolute top-2 left-2 bg-yellow-500/95 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-gray-800 rounded-full shadow-lg transition-all duration-300 hover:bg-white whitespace-nowrap">
              {venue.specialCategory}
            </span>
          )}
          <div className="absolute top-2 right-2 text-white cursor-pointer text-base sm:text-lg transition-all duration-300 hover:scale-110 drop-shadow-md">
            <FavoriteButton vendor={venue} />
          </div>
        </div>

        {multipleImages && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => onDotClick(index, e)}
                className={`block rounded-full transition-all duration-300 ease-out cursor-pointer focus:outline-none ${
                  index === currentIndex
                    ? 'bg-white scale-125 w-4 sm:w-6 h-1.5 sm:h-2 shadow-md'
                    : 'bg-white/70 w-1.5 sm:w-2 h-1.5 sm:h-2 hover:bg-white/90'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info footer — the only per-vertical part */}
      <div className="pt-3 px-2 sm:px-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center">
            <FaStar className="text-yellow-500 mr-1 text-base" />
            <span className="text-sm font-normal text-gray-900">
              {venue.rating?.toFixed(1)}
            </span>
            <span className="text-xs sm:text-sm text-gray-500 ml-1">
              ({venue.reviews?.toLocaleString() || 0} reviews)
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-semibold capitalize text-gray-900 leading-tight line-clamp-1">
            {venue.businessName}
          </h3>

          {vertical === 'restaurant' && cuisines.length > 0 && (
            <div className="line-clamp-1 mt-2 text-sm text-gray-500">
              {cuisines.join(', ')}
            </div>
          )}

          {vertical === 'club' && categories.length > 0 && (
            <div className="flex gap-1 overflow-x-auto hide-scrollbar">
              {categories.slice(0, 3).map((category, index) => {
                const classes = cuisineColorPalette[index % cuisineColorPalette.length];
                return (
                  <div
                    key={index}
                    className={`px-3 py-2 ${classes} rounded-lg border bg-gray-200 text-xs text-zinc-600 font-medium leading-none whitespace-nowrap`}
                  >
                    {category}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex mt-2 items-center gap-1 sm:text-sm text-xs text-gray-500">
            <p className="line-clamp-1">
              <span>{venue.address}</span>
            </p>
          </div>

          {vertical === 'hotel' && (
            <div className="flex justify-between items-center mb-1.5 mt-2">
              <div className="flex text-black justify-start items-center gap-1">
                <div className="text-[15px] sm:text-normal sm:font-medium leading-none">
                  ₦{Number(venue.priceRange).toLocaleString()}
                </div>
                <div className="text-[14px] sm:text-[xs] font-normal leading-none text-gray-500">
                  /night
                </div>
              </div>
              {venue.offer && (
                <div className="text-sm text-black border-[#E0B300] border hidden md:flex items-center gap-1 px-2 py-1 rounded-md">
                  {formatOfferText(venue.offer)}
                </div>
              )}
            </div>
          )}

          {vertical === 'club' && (
            <div className="flex text-gray-500 mt-1.5 justify-start items-center gap-1">
              <div className="font-medium text-xs sm:text-sm leading-none">Table from</div>
              <div className="text-[13px] sm:text-sm text-black leading-none">
                ₦{Number(venue.priceRange).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
