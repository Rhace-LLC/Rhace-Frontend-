import Header from '@/components/user/Header';
import { MakeReservationSection } from '@/components/user/inventory/MakeReservationSection';
import RestaurantSaveCopy from '@/components/user/ui/SaveCopy';
import RestaurantImages2 from '@/components/user/ui/Image2';
import RestaurantImages from '@/components/user/ui/Image';
import RestaurantInfo from './_subcomponents/RestaurantInfo';
import MapComponent from '@/components/user/ui/mapComponent';
import { Mail, MapPin, Phone, Star } from 'lucide-react';
import { Link, useParams } from 'react-router';
// import { RestaurantData } from "@/lib/api";
import { useEffect, useState } from 'react';
import { userService } from '@/services/user.service';
import StarRating from '@/components/ui/starrating';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import TableGrid from '@/components/TableGridRecommendations';

const RestaurantsPage = () => {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>({
    _id: '',
    businessName: '',
    address: '',
    phone: '',
    email: '',
    profileImages: [''],
    rating: 0,
    reviews: 256,
    cuisine: '',
    openingHours: '',
    priceRange: '',
    amenities: [''],
    menu: [
      {
        name: '',
        description: '',
      },
    ],
    openingTime: '',
    closingTime: '',
    cuisines: [''],
    businessDescription: '',
    availableSlots: [''],
  });

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await userService.getVendor(id);
        setRestaurant(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRestaurant();
  }, []);

  if (isLoading) return <UniversalLoader fullscreen type="vendor-page" />;

  return (
    <div className="bg-white">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto md:mt-[85px] pb-20 md:mb-4 md:py-8 max-w-7xl md:px-6 lg:px-8 space-y-8 md:space-y-10">
        {/* Row 1 — name / rating (LHS) + share-save & location-contact (RHS) */}
        <div className="flex flex-col md:flex-row md:justify-between gap-4 px-4 md:px-0">
          <div className="space-y-2">
            <div className="flex items-center gap-3 pt-2 md:pt-0">
              <h1 className="type-res-h1 text-res-ink">
                {restaurant.businessName}{' '}
              </h1>{' '}
              <span className="px-2 py-0.5 rounded-full border border-[#37703F] bg-[#D1FAE5] text-xs text-[#37703F]">
                {' '}
                Open
              </span>
            </div>
            <div className="flex gap-1 items-center text-xs">
              <StarRating size={16} rating={Number(restaurant.rating)} readOnly />
              <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
              <span className="text-gray-600">
                ({restaurant.reviews.toLocaleString()} reviews)
              </span>
            </div>
            <div className="mt-2">
              <RestaurantSaveCopy type="restaurants" id={id} vendor={restaurant} />
            </div>
            <div className="mt-4">
              <Link
                to={`/order/${id}`}
                className="block w-full md:w-auto md:min-w-[250px] text-center rounded-res-sm border border-res-brand px-4 py-2 text-sm font-medium text-res-brand hover:bg-res-brand/5"
              >
                Quick order
              </Link>
            </div>
          </div>
          <div className="space-y-3 md:w-[320px] md:shrink-0">
            <div className="text-sm text-gray-800 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-black mt-0.5 shrink-0" />
                <p>{restaurant.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-black shrink-0" />
                <a href={`tel:${restaurant.phone}`} className="hover:underline">
                  {restaurant.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-black shrink-0" />
                <a href={`mailto:${restaurant.email}`} className="hover:underline">
                  {restaurant.email}
                </a>
              </div>
              <div>
                <a href="#" className="text-res-accent font-medium underline hover:text-res-brand-hover">
                  Restaurant website
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — bento images */}
        <div className="w-full space-y-6">
          <RestaurantImages
            images={restaurant?.profileImages ?? []}
            name={restaurant.businessName}
          />
          <RestaurantImages2
            vendor={restaurant}
            images={restaurant?.profileImages ?? []}
            name={restaurant.businessName}
          />
        </div>

        {/* Row 3 — tabs (overview / menu / reviews) */}
        <div>
          <RestaurantInfo data={restaurant} />
        </div>

        {/* Row 4 — reservations */}
        <div>
          <MakeReservationSection vendorId={id!} vertical="restaurant" />
        </div>

        {/* Row 5 — map */}
        <div className="px-4 md:px-0">
          <div className="rounded-res-md bg-res-secondary shadow-res-low p-1">
            <MapComponent address={restaurant.address} />
          </div>
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default RestaurantsPage;