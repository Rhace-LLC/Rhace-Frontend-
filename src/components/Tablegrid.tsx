import {
  getImagesForRestaurant,
  hasMultipleImages,
  useCarouselLogic,
  useRestaurantData,
} from '@/hooks/favorites';
import { HeartIcon } from '@/public/icons/icons';
import { userService } from '@/services/user.service';
import { formatOfferText } from '@/utils/helper';
import { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa6';
import { FiChevronRight, FiChevronsDown } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import UniversalLoader from './user/ui/LogoLoader';
import { FavoriteButton } from './user/ui/favoritebutton';

// ── Local vendor shape used in these grids ────────────────────────────────────
interface RestaurantCard {
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

// Common cuisine color palette
const cuisineColorPalette = [
  'bg-orange-100 border-orange-200',
  'bg-green-100 border-green-200',
  'bg-blue-100 border-blue-200',
  'bg-purple-100 border-purple-200',
  'bg-pink-100 border-pink-200',
  'bg-yellow-100 border-yellow-200',
  'bg-teal-100 border-teal-200',
];

interface TableGridProps {
  title: string;
  type?: string;
}

const parseList = (value?: string[] | string): string[] =>
  Array.isArray(value)
    ? value
    : (value
        ?.split(',')
        .map((c) => c.trim())
        .filter(Boolean) as string[]) || [];

const TableGrid = ({ title, type }: TableGridProps) => {
  const { currentIndices, handleMouseEnter, handleMouseLeave, handleDotClick } = useCarouselLogic();
  const { restaurants, isLoading } = useRestaurantData('restaurant', type);
  const navigate = useNavigate();

  if (isLoading) return <UniversalLoader type="cards" />;

  const list = (restaurants as RestaurantCard[]) || [];
  if (list.length === 0) return null;

  let limit = 4;

  return (
    <div className="mb-12 md:mb-20 lg:mb-[92px] px- sm:px-6 lg:px-8">
      <Button
        variant="outline"
        className="flex cursor-pointer bg-transparent sm:bg-white justify-between items-center sm:mb-6 w-auto text-gray-900 text-sm sm:text-base font-medium leading-none border-0 md:border shadow-none"
      >
        <h2 className="">{title}</h2>
        <FiChevronRight className="ml-1 sm:ml-2" />
      </Button>

      {/* Responsive grid container */}
      <div className="flex flex-nowrap sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-6 overflow-x-auto sm:overflow-x-visible scrollbar-hide sm:scrollbar-default pb-4 sm:pb-0 sm:mx-0 px-2 sm:px-0">
        {list.map((restaurant) => {
          const images = getImagesForRestaurant(restaurant);
          const restaurantId = restaurant._id || String(restaurant.id);
          const currentIndex = currentIndices[restaurantId] || 0;
          const multipleImages = hasMultipleImages(restaurant);
          const cuisinesArray = parseList(restaurant.cuisines);

          return (
            <div
              key={restaurantId}
              onClick={() => navigate(`/restaurants/${restaurant._id}`)}
              className="snap-start min-w-[185px] sm:min-w-0 w-[185px] sm:w-auto h-auto sm:h-full shrink-0 sm:shrink cursor-pointer pb-2 sm:pb-4 flex flex-col bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-300 transition-all duration-300 active:scale-[0.98] hover:shadow-md hover:-translate-y-1"
              onMouseEnter={() =>
                handleMouseEnter(
                  restaurantId,
                  restaurant,
                  getImagesForRestaurant,
                  hasMultipleImages
                )
              }
              onMouseLeave={() => handleMouseLeave(restaurantId)}
            >
              {/* Image Section */}
              <div className="relative px-2 pt-2 h-30 sm:h-44 w-full  cursor-pointer aspect-video group">
                <div className="relative h-full w-full overflow-hidden rounded-lg sm:rounded-xl bg-gray-100">
                  {images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={restaurant.businessName || 'restaurant'}
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
                  {/* Right Arrow */}
                  {multipleImages && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-40 
                                sm:hidden 
                                bg-white/80 backdrop-blur-sm 
                                text-gray-700 
                                rounded-full p-2 
                                shadow-md 
                                active:scale-95"
                      aria-label="Next image"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
                  {restaurant.specialCategory && (
                    <span className="absolute top-2 left-2 bg-yellow-500/95 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-gray-800 rounded-full shadow-lg transition-all duration-300 hover:bg-white whitespace-nowrap">
                      {restaurant.specialCategory}
                    </span>
                  )}

                  <div className="absolute top-2 right-2 text-white cursor-pointer text-base sm:text-lg transition-all duration-300 hover:scale-110 drop-shadow-md">
                    <FavoriteButton vendor={restaurant} />
                  </div>
                </div>

                {multipleImages && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-1.5">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => handleDotClick(restaurantId, index, e)}
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

              {/* Info Section */}
              <div className="pt-3 px-2 mb-1 sm:px-3 flex-1 flex flex-col justify-between ">
                <div className="space-y-1.5">
                  <div className="flex items-center">
                    <FaStar className="text-yellow-500 mr-1 text-base" />
                    <span className="text-sm font-normal text-gray-900">
                      {restaurant.rating?.toFixed(1)}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500 ml-1">
                      ({restaurant.reviews?.toLocaleString() || 0} reviews)
                    </span>
                  </div>
                  <div className="flex w-full justify-between">
                    <h3 className="text-base sm:text-lg font-semibold capitalize text-gray-900 leading-tight line-clamp-1">
                      {restaurant.businessName}
                    </h3>
                  </div>

                  {cuisinesArray.length > 0 && (
                    <div className=" line-clamp-1 mt-2 text-sm text-gray-500 ">
                      {cuisinesArray.join(', ')}
                    </div>
                  )}
                  <div className="flex  mt-2 items-center gap-1 sm:text-sm text-xs text-gray-500 ">
                    <p className="line-clamp-1 ">
                      <span>{restaurant.address}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more - responsive */}
      {list.length > limit && (
        <div className="mt-6 sm:mt-8 hidden lg:flex text-center">
          <button
            onClick={() => {
              limit += 4;
            }}
            className="text-teal-700 hover:underline flex items-center justify-center mx-auto transition-colors duration-200 text-sm sm:text-base font-medium"
          >
            <span>Show more offers</span>
            <FiChevronsDown className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export const TableGridTwo = ({ title, type }: TableGridProps) => {
  const { currentIndices, handleMouseEnter, handleMouseLeave, handleDotClick } = useCarouselLogic();
  const { restaurants, isLoading } = useRestaurantData('hotel', type);
  const navigate = useNavigate();

  if (isLoading) return <UniversalLoader type="cards" />;

  const list = (restaurants as RestaurantCard[]) || [];
  if (list.length === 0) return null;

  let limit = 4;

  return (
    <div className="mb-12 md:mb-20 lg:mb-[92px] px- sm:px-6 lg:px-8">
      <Button
        variant="outline"
        className="flex cursor-pointer bg-transparent sm:bg-white justify-between items-center sm:mb-6 w-auto text-gray-900 text-sm sm:text-base font-medium leading-none border-0 md:border shadow-none"
      >
        <h2 className="">{title}</h2>
        <FiChevronRight className="ml-1 sm:ml-2" />
      </Button>

      {/* Responsive grid container */}
      <div className="flex flex-nowrap sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-6 overflow-x-auto sm:overflow-x-visible scrollbar-hide sm:scrollbar-default pb-4 sm:pb-0 sm:mx-0 px-2 sm:px-0">
        {list.map((restaurant) => {
          const images = getImagesForRestaurant(restaurant);
          const restaurantId = restaurant._id || String(restaurant.id);
          const currentIndex = currentIndices[restaurantId] || 0;
          const multipleImages = hasMultipleImages(restaurant);
          return (
            <div
              key={restaurantId}
              className="snap-start min-w-[185px] sm:min-w-0 w-[185px] sm:w-auto p-2 h-auto sm:h-full shrink-0 sm:shrink cursor-pointer pt-2 pb-2 flex flex-col bg-white rounded-2xl sm:rounded-3xl overflow-hidden border transition-all duration-300  active:scale-[0.98] hover:shadow-md hover:-translate-y-1"
              onMouseEnter={() =>
                handleMouseEnter(
                  restaurantId,
                  restaurant,
                  getImagesForRestaurant,
                  hasMultipleImages
                )
              }
              onMouseLeave={() => handleMouseLeave(restaurantId)}
              onClick={() => navigate(`/hotels/${restaurant._id}`)}
            >
              {/* Image Section */}
              <div className="relative h-30 sm:h-44 w-full  cursor-pointer aspect-video">
                <div className="relative h-full w-full overflow-hidden rounded-lg sm:rounded-xl bg-gray-100">
                  {images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={restaurant.businessName || 'hotel'}
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

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
                </div>

                {restaurant.specialCategory && (
                  <span className="absolute top-2 left-2 bg-yellow-500/95 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-gray-800 rounded-full shadow-lg transition-all duration-300 hover:bg-white whitespace-nowrap">
                    {restaurant.specialCategory}
                  </span>
                )}
                <div className="absolute top-2 right-2 text-white cursor-pointer text-base sm:text-lg transition-all duration-300 hover:scale-110 drop-shadow-md">
                  <FavoriteButton vendor={restaurant} />
                </div>

                {multipleImages && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-1.5">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => handleDotClick(restaurantId, index, e)}
                        className={`block rounded-full  transition-all duration-300 ease-out cursor-pointer focus:outline-none ${
                          index === currentIndex
                            ? 'bg-white scale-125 w-4 sm:w-6 h-1.5 sm:h-2 shadow-md'
                            : 'bg-white/70 w-1.5 sm:w-2 h-1.5 sm:h-2 hover:bg-white/90'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="pt-3 px-2 sm:px-3 flex-1 flex space-y-1.5 flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex w-full justify-between">
                    <div className="flex items-center">
                      <FaStar className="text-yellow-500 mr-1 text-base" />
                      <span className="text-sm font-normal text-gray-900">
                        {restaurant.rating?.toFixed(1)}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 ml-1">
                        ({restaurant.reviews?.toLocaleString() || 0} reviews)
                      </span>
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 capitalize leading-tight line-clamp-1">
                    {restaurant.businessName}
                  </h3>

                  <div className="flex items-center gap-1 sm:text-sm text-xs  text-gray-500 mt-2">
                    <p className="line-clamp-1 ">
                      <span>{restaurant.address}</span>
                    </p>
                  </div>
                </div>

                <div className="w-full">
                  <div className="flex justify-between items-center mb-1.5 mt-2">
                    <div className="flex text-black justify-start items-center gap-1">
                      <div className=" text-[15px] sm:text-normal sm:font-medium leading-none">
                        ₦{Number(restaurant.priceRange).toLocaleString()}
                      </div>
                      <div className="text-[14px] sm:text-[xs] font-normal leading-none text-gray-500">
                        /night
                      </div>
                    </div>
                    {restaurant.offer && (
                      <div className="text-sm text-black border-[#E0B300] border hidden md:flex items-center gap-1 px-2 py-1 rounded-md">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_88_1055)">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M6.27005 1.93187C6.73365 1.53683 7.31852 1.3124 7.92738 1.2959C8.53624 1.27941 9.1324 1.47184 9.61671 1.8412L9.73005 1.93187L9.98071 2.1452C10.1632 2.30096 10.3843 2.4046 10.6207 2.4452L10.7394 2.45987L11.068 2.48653C11.6769 2.53511 12.2506 2.79123 12.6933 3.21206C13.136 3.63289 13.4207 4.19292 13.5 4.79853L13.514 4.93187L13.5407 5.2612C13.5596 5.50008 13.6425 5.72946 13.7807 5.9252L13.854 6.01987L14.0687 6.27053C14.4638 6.73414 14.6882 7.31901 14.7047 7.92787C14.7212 8.53673 14.5287 9.13289 14.1594 9.6172L14.0687 9.73054L13.8547 9.9812C13.699 10.1637 13.5953 10.3848 13.5547 10.6212L13.54 10.7399L13.514 11.0685C13.4655 11.6774 13.2094 12.2511 12.7885 12.6938C12.3677 13.1364 11.8077 13.4212 11.202 13.5005L11.068 13.5145L10.7394 13.5412C10.5005 13.5601 10.2711 13.643 10.0754 13.7812L9.98071 13.8552L9.72938 14.0685C9.26585 14.4637 8.68103 14.6882 8.07216 14.7048C7.4633 14.7215 6.8671 14.5291 6.38271 14.1599L6.27005 14.0692L6.01938 13.8552C5.83692 13.6994 5.61582 13.5958 5.37938 13.5552L5.26071 13.5412L4.93205 13.5145C4.3232 13.466 3.74948 13.2098 3.30681 12.789C2.86414 12.3682 2.57935 11.8081 2.50005 11.2025L2.48605 11.0692L2.45938 10.7399C2.4405 10.501 2.35759 10.2716 2.21938 10.0759L2.14538 9.9812L1.93138 9.72987C1.53634 9.26627 1.31191 8.6814 1.29541 8.07254C1.27892 7.46367 1.47135 6.86751 1.84071 6.3832L1.93138 6.27053L2.14471 6.01987C2.30047 5.83741 2.40411 5.61631 2.44471 5.37987L2.45938 5.2612L2.48605 4.93253C2.53463 4.32369 2.79074 3.74997 3.21157 3.3073C3.6324 2.86463 4.19243 2.57983 4.79805 2.50053L4.93138 2.48653L5.26071 2.45987C5.49959 2.44099 5.72897 2.35808 5.92471 2.21987L6.01938 2.14587L6.27005 1.93187ZM9.66671 8.6672C9.4015 8.6672 9.14714 8.77256 8.95961 8.96009C8.77207 9.14763 8.66671 9.40199 8.66671 9.6672C8.66671 9.93242 8.77207 10.1868 8.95961 10.3743C9.14714 10.5618 9.4015 10.6672 9.66671 10.6672C9.93193 10.6672 10.1863 10.5618 10.3738 10.3743C10.5614 10.1868 10.6667 9.93242 10.6667 9.6672C10.6667 9.40199 10.5614 9.08186C10.5614 8.81664 10.456 8.56228 10.2685 8.37475C10.081 8.18722 9.8266 8.08186 9.56138 8.08186C9.29617 8.08186 9.0418 8.18722 8.85427 8.37475C8.66673 8.56228 8.56138 8.81664 8.56138 9.08186C8.56138 9.16616 8.59464 9.25053 8.6545 9.31039C8.71436 9.37025 8.79873 9.40351 8.88304 9.40351C8.96735 9.40351 9.05172 9.37025 9.11158 9.31039C9.17143 9.25053 9.2047 9.16616 9.2047 9.08186C9.2047 9.01728 9.18978 8.95532 9.16086 8.89843L9.17278 8.88499C9.21568 8.83924 9.27161 8.79349 9.32786 8.77493C9.38412 8.75638 9.45372 8.76923 9.51086 8.81125C9.56801 8.85326 9.61375 8.90918 9.63231 8.96544C9.65087 9.02169 9.63802 9.0913 9.596 9.14844C9.55791 9.20558 9.52072 9.26272 9.53215 9.31986C9.54358 9.377 9.6043 9.43414 9.63919 9.49128L9.66671 8.6672Z"
                              fill="#E0B300"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_88_1055">
                              <rect width="16" height="16" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>
                        {formatOfferText(restaurant.offer)}
                      </div>
                    )}
                  </div>

                  <div className="mt-0 sm:mt-4  w-full flex "></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more - responsive */}
      {list.length > limit && (
        <div className="mt-6 sm:mt-8 hidden lg:flex text-center">
          <button
            onClick={() => {
              limit += 4;
            }}
            className="text-teal-700 hover:underline flex items-center justify-center mx-auto transition-colors duration-200 text-sm sm:text-base font-medium"
          >
            <span>Show more offers</span>
            <FiChevronsDown className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export const TableGridThree = ({ title, type }: TableGridProps) => {
  const { currentIndices, handleMouseEnter, handleMouseLeave, handleDotClick } = useCarouselLogic();
  const { restaurants, isLoading } = useRestaurantData('club', type);

  if (isLoading) return <UniversalLoader type="cards" />;

  const list = (restaurants as RestaurantCard[]) || [];
  if (list.length === 0) return null;

  let limit = 4;

  return (
    <div className="mb-12 md:mb-20 lg:mb-[92px] px-4 sm:px-6 lg:px-8">
      <Button
        variant="outline"
        className="flex cursor-pointer bg-transparent sm:bg-white justify-between items-center sm:mb-6 w-auto text-gray-900 text-sm sm:text-base font-medium leading-none border-0 md:border shadow-none"
      >
        <h2 className="">{title}</h2>
        <FiChevronRight className="ml-1 sm:ml-2" />
      </Button>

      {/* Responsive grid container */}
      <div className="flex flex-nowrap sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 overflow-x-auto sm:overflow-x-visible scrollbar-hide sm:scrollbar-default pb-4 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0">
        {list.map((restaurant) => {
          const images = getImagesForRestaurant(restaurant);
          const restaurantId = restaurant._id || String(restaurant.id);
          const currentIndex = currentIndices[restaurantId] || 0;
          const multipleImages = hasMultipleImages(restaurant);
          const categories = parseList(restaurant.categories);

          return (
            <div
              key={restaurantId}
              className="snap-start min-w-[185px] sm:min-w-0 w-[185px] sm:w-auto h-auto sm:h-full shrink-0 sm:shrink cursor-pointer pt- pb-2 sm:pb-4 flex flex-col bg-white border border-gray-300 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300"
              onMouseEnter={() =>
                handleMouseEnter(
                  restaurantId,
                  restaurant,
                  getImagesForRestaurant,
                  hasMultipleImages
                )
              }
              onMouseLeave={() => handleMouseLeave(restaurantId)}
            >
              {/* Image Section */}
              <div className="relative px-2 pt-2  h-30 sm:h-44 w-full  cursor-pointer aspect-video">
                <div className="relative h-full w-full overflow-hidden rounded-lg sm:rounded-xl bg-gray-100">
                  {images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={restaurant.businessName || 'club'}
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

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
                  {restaurant.specialCategory && (
                    <span className="absolute top-1 left-2 bg-yellow-500/95 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-gray-800 rounded-full shadow-lg transition-all duration-300 hover:bg-white whitespace-nowrap">
                      {restaurant.specialCategory}
                    </span>
                  )}

                  <div className="absolute top-2 right-2 text-white cursor-pointer text-base sm:text-lg transition-all duration-300 hover:scale-110 drop-shadow-md">
                    <FavoriteButton vendor={restaurant} />
                  </div>
                </div>

                {multipleImages && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-1.5">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => handleDotClick(restaurantId, index, e)}
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

              {/* Info Section */}
              <a
                href={`/clubs/${restaurant._id}`}
                className="pt-3 flex-1 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-col-reverse px-2 sm:px-3  w-full justify-between">
                    <h3 className="text-sm sm:text-lg font-semibold capitalize text-gray-900 leading-tight line-clamp-1">
                      {restaurant.businessName}
                    </h3>
                  </div>

                  {categories.length > 0 && (
                    <div className="flex gap-1 overflow-x-auto hide-scrollbar px-2 sm:px-3 ">
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

                  <div className="flex px-2 sm:px-3 items-center mt-1.5">
                    <FaStar className="text-yellow-500 mr-1 text-sm sm:text-base" />
                    <span className="text-sm font-normal text-gray-900">
                      {restaurant.rating?.toFixed(1)}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500 ml-1">
                      ({restaurant.reviews?.toLocaleString() || 0} reviews)
                    </span>
                  </div>

                  <div className="flex px-2 sm:px-3 text-gray-500 mt-1.5 justify-start items-center gap-1">
                    <div className="font-medium text-xs sm:text-sm leading-none">Table from</div>
                    <div className="text-[13px] sm:text-sm text-black leading-none">
                      ₦{Number(restaurant.priceRange).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="px-2 sm:px-3  w-full cursor-pointer flex "></div>
              </a>
            </div>
          );
        })}
      </div>

      {/* Show more - responsive */}
      {list.length > limit && (
        <div className="mt-6 sm:mt-8 hidden lg:flex text-center">
          <button
            onClick={() => {
              limit += 4;
            }}
            className="text-teal-700 hover:underline flex items-center justify-center mx-auto transition-colors duration-200 text-sm sm:text-base font-medium"
          >
            <span>Show more offers</span>
            <FiChevronsDown className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TableGrid;

interface OfferMenu {
  _id?: string;
  id?: string;
  name?: string;
  coverImage?: string;
  mealTimes?: string[];
  vendor?: {
    businessName?: string;
    rating?: number;
  };
  menuType?: string[];
  price?: number;
  pricingModel?: string;
  [key: string]: unknown;
}

export const TableGridFour = ({ title }: { title: string }) => {
  const [menus, setMenus] = useState<OfferMenu[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setIsLoading(true);
        const res = await userService.getOffers();
        setMenus((res.data as OfferMenu[]) || []);
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRestaurant();
  }, []);

  if (isLoading) return <UniversalLoader type="cards" />;

  if (!menus || menus.length === 0) return null;

  let limit = 4;

  return (
    <div className="mb-12 md:mb-20 lg:mb-[92px] px-4 sm:px-6 lg:px-8">
      <Button
        variant="outline"
        className="flex cursor-pointer bg-transparent sm:bg-white justify-between items-center sm:mb-6 w-auto text-gray-900 text-sm sm:text-base font-medium leading-none border-0 md:border shadow-none"
      >
        <h2 className="">{title}</h2>
        <FiChevronRight className="ml-1 sm:ml-2" />
      </Button>

      <div className="flex flex-nowrap sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 overflow-x-auto sm:overflow-x-visible scrollbar-hide sm:scrollbar-default pb-4 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0">
        {menus.slice(0, limit)?.map((menu) => (
          <div
            key={menu._id}
            className="snap-start min-w-[185px] sm:min-w-0 w-[185px] sm:w-auto h-auto sm:h-full shrink-0 sm:shrink cursor-pointer pt- pb-2 sm:pb-4 flex flex-col bg-white overflow-hidden border rounded-3xl transition-all duration-300 group"
          >
            {/* Image Container */}
            <div className="relative h-40 sm:h-48 w-full overflow-hidden bg-gray-100">
              <img
                src={menu.coverImage}
                alt={menu.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />

              {/* Badge */}
              <div className="absolute top-3 left-3 bg-orange-500/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                {menu.mealTimes?.[0] || 'Special'}
              </div>

              <button className="absolute top-2 right-4 text-white cursor-pointer text-base sm:text-lg transition-all duration-300 hover:scale-110 hover:text-red-400 drop-shadow-md">
                <HeartIcon className="text-[#F9FAFB] hover:text-red-400" />
              </button>
            </div>

            {/* Content Section */}
            <div
              onClick={() => navigate(`/menus/${menu._id}`)}
              className="px-3 pt-3 sm:px-4 sm:pt-4 flex-1 flex flex-col justify-between"
            >
              <div className="space-y-2">
                {/* Dish Name */}
                <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 leading-tight">
                  {menu.name}
                </h3>

                {/* Restaurant Info */}
                <div className="flex items-center gap-2">
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">
                    {menu.vendor?.businessName}
                  </div>
                  {menu.vendor?.rating && (
                    <div className="flex items-center gap-1">
                      <FaStar className="text-yellow-500 text-xs" />
                      <span className="text-xs font-semibold text-gray-700">
                        {menu.vendor.rating?.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {menu.menuType && menu.menuType.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {menu.menuType.slice(0, 2).map((type, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-medium"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Price and Button */}
              <div className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    ₦{(menu.price ?? 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">{menu.pricingModel}</span>
                </div>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/menus/${menu._id}`);
                  }}
                  className="w-full py-2.5 sm:py-3 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-full transition-all duration-300 text-sm sm:text-base shadow-md hover:shadow-lg active:scale-95"
                >
                  Order Now
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show more */}
      {menus.length > limit && (
        <div className="mt-6 sm:mt-8 hidden lg:flex text-center">
          <button
            onClick={() => {
              limit += 4;
            }}
            className="text-teal-700 hover:underline flex items-center justify-center mx-auto transition-colors duration-200 text-sm sm:text-base font-medium"
          >
            <span>Show more offers</span>
            <FiChevronsDown className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}
    </div>
  );
};