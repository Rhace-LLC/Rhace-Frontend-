import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import MapComponent from '@/components/user/ui/mapComponent';
import Images from '@/components/user/ui/Image';
import Images2 from '@/components/user/ui/Image2';
import { Link, useParams } from 'react-router';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import ClubInfo from './_subcomponents/ClubInfo';
import SaveCopy from '@/components/user/ui/SaveCopy';
import Header from '@/components/user/Header';
import { MakeReservationSection } from '@/components/user/inventory/MakeReservationSection';
import { useEffect, useState } from 'react';
import { userService } from '@/services/user.service';
import StarRating from '@/components/ui/starrating';
import UniversalLoader from '@/components/user/ui/LogoLoader';

const ClubPage = () => {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [club, setClub] = useState<any>(null);

  useEffect(() => {
    const fetchClub = async () => {
      try {
        const res = await userService.getVendor(id);
        setClub(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClub();
  }, []);

  if (isLoading) return <UniversalLoader fullscreen type="vendor-page" />;
  if (!club) return null;

  const rating = Number(club.rating) || 0;
  const reviewCount = Number(club.reviews) || 0;

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
                {club.offer ? (
                  <span className="type-res-small rounded-full bg-res-secondary px-3 py-1 font-semibold text-res-brand">
                    {club.offer}
                  </span>
                ) : (
                  <span className="type-res-small rounded-full bg-res-secondary px-3 py-1 font-semibold text-res-brand">
                    Open
                  </span>
                )}
                {club.dressCode ? (
                  <span className="type-res-small rounded-full bg-res-surface px-3 py-1 font-medium text-res-ink-muted">
                    {club.dressCode}
                  </span>
                ) : null}
                {club.agePolicy ? (
                  <span className="type-res-small rounded-full bg-res-surface px-3 py-1 font-medium text-res-ink-muted">
                    {club.agePolicy}+
                  </span>
                ) : null}
              </div>

              <h1 className="type-res-h1 mt-3 truncate text-res-ink">{club.businessName}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <StarRating size={16} rating={rating} readOnly />
                <span className="type-res-body font-semibold text-res-ink">
                  {rating.toFixed ? rating.toFixed(1) : rating}
                </span>
                <span className="type-res-small text-res-ink-muted">
                  ({reviewCount.toLocaleString()} reviews)
                </span>
                {club.openingTime ? (
                  <span className="type-res-small flex items-center gap-1 text-res-ink-muted">
                    <span className="inline-block size-1 rounded-full bg-res-line" />
                    <Clock className="h-3.5 w-3.5" />
                    {club.openingTime} – {club.closingTime}
                  </span>
                ) : null}
              </div>

              {club.businessDescription ? (
                <p className="type-res-body mt-3 line-clamp-2 max-w-2xl font-normal text-res-ink-muted">
                  {club.businessDescription}
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
                  href="#drinks"
                  className="type-res-body rounded-full bg-res-surface px-6 py-3 text-center font-semibold text-res-ink transition-colors hover:text-res-brand"
                >
                  View drinks
                </a>
              </div>

              <div className="mt-4 hidden md:block">
                <SaveCopy type="clubs" id={id} vendor={club} />
              </div>
            </div>

            <aside className="w-full shrink-0 rounded-res-md bg-res-surface p-4 lg:w-[320px]">
              <p className="type-res-small font-semibold tracking-wide text-res-ink-muted uppercase">
                Visit / Contact
              </p>
              <div className="type-res-body mt-3 space-y-3 font-normal text-res-ink">
                <div className="flex items-start gap-2.5">
                  <span className="rounded-res-sm bg-res-card p-2 shadow-res-low">
                    <MapPin className="h-4 w-4 text-res-brand" />
                  </span>
                  <p className="pt-1">{club.address}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-res-sm bg-res-card p-2 shadow-res-low">
                    <Phone className="h-4 w-4 text-res-brand" />
                  </span>
                  <a href={`tel:${club.phone}`} className="hover:text-res-brand">
                    {club.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-res-sm bg-res-card p-2 shadow-res-low">
                    <Mail className="h-4 w-4 text-res-brand" />
                  </span>
                  <a href={`mailto:${club.email}`} className="truncate hover:text-res-brand">
                    {club.email}
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Row 2 — gallery */}
        <section className="rounded-res-lg bg-res-card p-2 shadow-res-low">
          <Images images={club?.profileImages ?? []} name={club.businessName} />
          <Images2
            vendor={club}
            images={club?.profileImages ?? []}
            name={club.businessName}
          />
        </section>

        {/* Row 3 — tabs */}
        <section id="drinks" className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
          <ClubInfo data={club} />
        </section>

        {/* Row 4 — reservations */}
        <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
          <MakeReservationSection vendorId={id!} vertical="club" />
        </section>

        {/* Row 5 — map */}
        <section className="rounded-res-lg bg-res-card p-2 shadow-res-low">
          <div className="overflow-hidden rounded-res-md">
            <MapComponent address={club.address} />
          </div>
        </section>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default ClubPage;
