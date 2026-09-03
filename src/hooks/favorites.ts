import { userService } from '@/services/user.service';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import type { AuthUser, VendorBase } from '@/types';

interface VendorRef {
  _id?: string;
  id?: string;
  name?: string;
  image?: string;
  [key: string]: unknown;
}

interface Favorite {
  _id?: string;
  vendor?: VendorRef;
  vendorId?: string;
  vendorType?: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface FavoriteVendorData {
  type?: string;
  vendorType?: string;
  vendor?: VendorRef;
  name?: string;
  image?: string;
  [key: string]: unknown;
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoadingFav, setIsLoadingFav] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Fetch user favorites
  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = (await userService.getFavorites()) as Record<string, unknown>;
      const res = response.favorites || response.data || response;

      let favoritesArray: Favorite[] = [];
      if (Array.isArray(res)) {
        favoritesArray = res as Favorite[];
      } else if ((res as Record<string, unknown>)?.data) {
        const resData = (res as Record<string, unknown>).data as
          | Favorite[]
          | { favorites?: Favorite[] };
        if (Array.isArray(resData)) {
          favoritesArray = resData;
        } else if (Array.isArray((resData as { favorites?: Favorite[] }).favorites)) {
          favoritesArray = (resData as { favorites: Favorite[] }).favorites;
        }
      }

      setFavorites(favoritesArray);
      return favoritesArray;
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // INSTANT toggle with optimistic updates
  const toggleFavorite = async (vendorId: string, vendorData: FavoriteVendorData = {}) => {
    if (!vendorId) return;

    const vendorType = vendorData.type || vendorData.vendorType || 'restaurant';

    // Check current status
    const isCurrentlyFavorite = favorites.some(
      (fav) => fav.vendor?._id === vendorId || fav.vendorId === vendorId || fav._id === vendorId
    );

    // ⚡ INSTANT UI UPDATE (no waiting!)
    if (isCurrentlyFavorite) {
      // Remove immediately
      setFavorites((prev) =>
        prev.filter((fav) => {
          const favId = fav.vendor?._id || fav.vendorId || fav._id;
          return favId !== vendorId;
        })
      );
    } else {
      // Add immediately with optimistic data
      const optimisticFavorite: Favorite = {
        _id: `temp-${vendorId}`,
        vendor: vendorData.vendor || {
          _id: vendorId,
          name: vendorData.name,
          image: vendorData.image,
          ...vendorData,
        },
        vendorId: vendorId,
        vendorType: vendorType,
        createdAt: new Date().toISOString(),
      };

      setFavorites((prev) => [...prev, optimisticFavorite]);
    }

    // 🔄 Background sync (user doesn't wait for this)
    try {
      setIsLoadingFav(vendorId);

      if (isCurrentlyFavorite) {
        await userService.removeFromFavorites(vendorId);
      } else {
        await userService.addToFavorites(vendorId, vendorType);
      }

      // Silently sync with server to get complete data
      await fetchFavorites();
    } catch (error) {
      console.error('Error syncing favorite:', error);

      // ⚠️ Revert on error
      toast.error(
        isCurrentlyFavorite ? "Couldn't remove from favorites" : "Couldn't add to favorites"
      );

      // Refetch to restore correct state
      await fetchFavorites();
    } finally {
      setIsLoadingFav('');
    }
  };

  // Check if a venue is favorite
  const isFavorite = (vendorId: string): boolean => {
    if (!vendorId || !Array.isArray(favorites)) return false;

    return favorites.some((fav) => {
      const favId = fav.vendor?._id || fav.vendorId || fav._id;
      return favId === vendorId;
    });
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  return {
    favorites,
    loading,
    error,
    isLoadingFav,
    fetchFavorites,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
};

// Common carousel logic hook
export const useCarouselLogic = () => {
  const [currentIndices, setCurrentIndices] = useState<Record<string, number>>({});
  const [intervalIds, setIntervalIds] = useState<Record<string, ReturnType<typeof setInterval>>>({});

  const startImageRotation = (restaurantId: string, images: unknown[]) => {
    // Clear any existing interval for this restaurant
    if (intervalIds[restaurantId]) {
      clearInterval(intervalIds[restaurantId]);
    }

    // Start new interval to rotate images every 1.5 seconds
    const intervalId = setInterval(() => {
      setCurrentIndices((prev) => {
        const currentIndex = prev[restaurantId] || 0;
        const nextIndex = (currentIndex + 1) % images.length;
        return { ...prev, [restaurantId]: nextIndex };
      });
    }, 1500); // Change image every 1.5 seconds

    setIntervalIds((prev) => ({
      ...prev,
      [restaurantId]: intervalId,
    }));
  };

  const stopImageRotation = (restaurantId: string) => {
    if (intervalIds[restaurantId]) {
      clearInterval(intervalIds[restaurantId]);
      setIntervalIds((prev) => {
        const newIntervals = { ...prev };
        delete newIntervals[restaurantId];
        return newIntervals;
      });
    }
  };

  const handleMouseEnter = (
    restaurantId: string,
    restaurant: Record<string, unknown> | null | undefined,
    getImagesForRestaurant: (r: Record<string, unknown>) => string[],
    hasMultipleImages: (r: Record<string, unknown>) => boolean
  ) => {
    if (!restaurant || !hasMultipleImages(restaurant)) return;

    const images = getImagesForRestaurant(restaurant);
    if (images.length <= 1) return;

    // Reset to first image when hover starts
    setCurrentIndices((prev) => ({
      ...prev,
      [restaurantId]: 0,
    }));

    // Start rotating images
    startImageRotation(restaurantId, images);
  };

  const handleMouseLeave = (restaurantId: string) => {
    stopImageRotation(restaurantId);

    // Reset to first image when hover ends
    setCurrentIndices((prev) => ({
      ...prev,
      [restaurantId]: 0,
    }));
  };

  // Manual navigation for dots
  const handleDotClick = (
    restaurantId: string,
    index: number,
    e: { stopPropagation: () => void }
  ) => {
    e.stopPropagation(); // Prevent card click event
    stopImageRotation(restaurantId);
    setCurrentIndices((prev) => ({
      ...prev,
      [restaurantId]: index,
    }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalIds).forEach((intervalId) => clearInterval(intervalId));
    };
  }, [intervalIds]);

  return {
    currentIndices,
    handleMouseEnter,
    handleMouseLeave,
    handleDotClick,
  };
};

// Common restaurant data fetching hook
export const useRestaurantData = (vendorType: string, type?: string) => {
  const [restaurants, setRestaurants] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const user = useSelector((state: { auth: { user: AuthUser | null } }) => state.auth.user);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setIsLoading(true);
        if (type && type === 'nearby') {
          const location = localStorage.getItem('rhace_user_location');
          const loc = JSON.parse(location || '{}');
          const res = (await userService.getNearest({
            longitude: loc.lng,
            latitude: loc.lat,
            type: vendorType,
          })) as { data: unknown[] };
          setRestaurants(res.data);
        } else {
          const res = (await userService.getVendors(
            vendorType,
            user
              ? ((user as unknown as { user?: { _id?: string } }).user?._id as string) || ''
              : ''
          )) as { data: unknown[] };
          console.log('Fetched restaurants:', res.data);
          setRestaurants(res.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRestaurant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorType, type]);

  return { restaurants, isLoading };
};

type VenueLike = Partial<VendorBase> & {
  profileImages?: ({ url?: string } | string)[];
  image?: string;
};

// Common image handling functions
export const getImagesForRestaurant = (restaurant: VenueLike | null | undefined): string[] => {
  if (restaurant?.profileImages && restaurant?.profileImages?.length > 1) {
    return restaurant?.profileImages?.map((image) =>
      typeof image === 'string' ? image : image.url || ''
    ) as string[];
  }
  return restaurant?.image ? [restaurant.image] : ['/placeholder.jpg'];
};

export const hasMultipleImages = (restaurant: VenueLike | null | undefined): boolean => {
  const images = getImagesForRestaurant(restaurant);
  return images.length > 1;
};

// Common cuisine color palette
export const cuisineColorPalette = [
  'bg-orange-100 outline-orange-200',
  'bg-green-100 outline-green-200',
  'bg-blue-100 outline-blue-200',
  'bg-purple-100 outline-purple-200',
  'bg-pink-100 outline-pink-200',
  'bg-yellow-100 outline-yellow-200',
  'bg-teal-100 outline-teal-200',
];

// Image handling functions
export const getImagesForVenue = (venue: VenueLike | null | undefined) => {
  if (venue?.profileImages && venue?.profileImages?.length > 1) {
    return venue.profileImages;
  }
  return venue?.profileImages?.[0] ? [venue.profileImages[0]] : ['/restaurant.jpg'];
};
