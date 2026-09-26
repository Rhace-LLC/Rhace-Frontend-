import Header from '@/components/user/Header';
import { MakeReservationSection } from '@/components/user/inventory/MakeReservationSection';
import RestaurantSaveCopy from '@/components/user/ui/SaveCopy';
import RestaurantImages2 from '@/components/user/ui/Image2';
import RestaurantImages from '@/components/user/ui/Image';
import RestaurantInfo from './_subcomponents/RestaurantInfo';
import MapComponent from '@/components/user/ui/mapComponent';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { userService } from '@/services/user.service';
import StarRating from '@/components/ui/starrating';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import Footer from '@/navigation/user_layout/_sub_component/Footer';

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
    menu: [{ name: '', description: '' }],
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

  const rating = Number(restaurant.rating) || 0;
  const reviewCount = Number(restaurant.reviews) || 0;
  const cuisines: string[] = Array.isArray(restaurant.cuisines)
    ? restaurant.cuisines.filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-res-surface">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto max-w-7xl space-y-5 px-4 pt-4 pb-24 md:mt-[85px] md:space-y-6 md:px-6 md:py-8 lg:px-8">
        {/* Row 1 — hero card */}
        <section className="rounded-res-lg bg-res-card p-5 shadow-res-low md:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="type-res-small rounded-full bg-res-secondary px-3 py-1 font-semibold text-res-brand">
                  Open
                </span>
                {restaurant.priceRange ? (
                  <span className="type-res-small rounded-full bg-res-surface px-3 py-1 font-semibold text-res-ink-muted">
                    {restaurant.priceRange}
                  </span>
                ) : null}
                {cuisines.slice(0, 2).map((c) => (
                  <span
                    key={c}
                    className="type-res-small rounded-full bg-res-surface px-3 py-1 font-medium text-res-ink-muted"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <h1 className="type-res-h1 mt-3 text-res-ink">{restaurant.businessName}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <StarRating size={16} rating={rating} readOnly />
                <span className="type-res-body font-semibold text-res-ink">
                  {rating.toFixed(1)}
                </span>
                <span className="type-res-small text-res-ink-muted">
                  ({reviewCount.toLocaleString()} reviews)
                </span>
                {restaurant.openingTime ? (
                  <span className="type-res-small flex items-center gap-1 text-res-ink-muted">
                    <span className="inline-block size-1 rounded-full bg-res-line" />
                    <Clock className="h-3.5 w-3.5" />
                    {restaurant.openingTime} – {restaurant.closingTime}
                  </span>
                ) : null}
              </div>

              {restaurant.businessDescription ? (
                <p className="type-res-body mt-3 line-clamp-2 max-w-2xl font-normal text-res-ink-muted">
                  {restaurant.businessDescription}
                </p>
              ) : null}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  to={`/order/${id}`}
                  className="type-res-body rounded-full bg-res-brand px-6 py-3 text-center font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                >
                  Quick order
                </Link>
                <a
                  href="#menu"
                  className="type-res-body rounded-full bg-res-surface px-6 py-3 text-center font-semibold text-res-ink transition-colors hover:text-res-brand"
                >
                  View menu
                </a>
              </div>

              <div className="mt-4 hidden md:block">
                <RestaurantSaveCopy type="restaurants" id={id} vendor={restaurant} />
              </div>
            </div>

            {/* Contact inset */}
            <aside className="w-full shrink-0 rounded-res-md bg-res-surface p-4 lg:w-[320px]">
              <p className="type-res-small font-semibold tracking-wide text-res-ink-muted uppercase">
                Visit / Contact
              </p>
              <div className="type-res-body mt-3 space-y-3 font-normal text-res-ink">
                <div className="flex items-start gap-2.5">
                  <span className="rounded-res-sm bg-res-card p-2 shadow-res-low">
                    <MapPin className="h-4 w-4 text-res-brand" />
                  </span>
                  <p className="pt-1">{restaurant.address}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-res-sm bg-res-card p-2 shadow-res-low">
                    <Phone className="h-4 w-4 text-res-brand" />
                  </span>
                  <a href={`tel:${restaurant.phone}`} className="hover:text-res-brand">
                    {restaurant.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-res-sm bg-res-card p-2 shadow-res-low">
                    <Mail className="h-4 w-4 text-res-brand" />
                  </span>
                  <a
                    href={`mailto:${restaurant.email}`}
                    className="truncate hover:text-res-brand"
                  >
                    {restaurant.email}
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Row 2 — gallery */}
        <section className="rounded-res-lg bg-res-card p-2 shadow-res-low">
          <RestaurantImages
            images={restaurant?.profileImages ?? []}
            name={restaurant.businessName}
          />
          <RestaurantImages2
            vendor={restaurant}
            images={restaurant?.profileImages ?? []}
            name={restaurant.businessName}
          />
        </section>

        {/* Row 3 — tabs */}
        <section id="menu" className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
          <RestaurantInfo data={restaurant} />
        </section>

        {/* Row 4 — reservations */}
        <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
          <MakeReservationSection vendorId={id!} vertical="restaurant" />
        </section>

        {/* Row 5 — map */}
        <section className="rounded-res-lg bg-res-card p-2 shadow-res-low">
          <div className="overflow-hidden rounded-res-md">
            <MapComponent address={restaurant.address} />
          </div>
        </section>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default RestaurantsPage;
