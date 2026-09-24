import { Mail, MapPin, Phone } from 'lucide-react';
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

  return (
    <div className="bg-white">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto md:mt-[85px] mb-[160px] md:mb-[16px] md:py-8 max-w-7xl md:px-6 lg:px-8 space-y-8 md:space-y-10">
        {/* Row 1 — name / rating (LHS) + share-save & location-contact (RHS) */}
        <div className="flex flex-col md:flex-row md:justify-between gap-4 px-4 md:px-0">
          <div className="space-y-2">
            <div className="flex items-center gap-3 pt-2 md:pt-0">
              <h1 className="type-res-h1 text-res-ink truncate max-w-[65%] md:max-w-none">
                {club.businessName}{' '}
              </h1>{' '}
              <span className="px-2 py-0.5 rounded-full border-2 border-[#37703F]  text-xs text-[#37703F]">
                {' '}
                {club.offer}
              </span>
            </div>
            <div className="flex gap-1 items-center text-xs">
              <StarRating size={16} rating={Number(club.rating)} readOnly />
              <span className="font-semibold text-lg">{club.rating}</span>
              <span className="text-gray-600">({club.reviews.toLocaleString()} reviews)</span>
            </div>
            <div className="mt-2">
              <SaveCopy type="clubs" id={id} vendor={club} />
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
                <p>{club.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-black shrink-0" />
                <a href={`tel:${club.phone}`} className="hover:underline">
                  {club.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-black shrink-0" />
                <a href={`mailto:${club.email}`} className="hover:underline">
                  {club.email}
                </a>
              </div>
              <div>
                <a href="#" className="text-res-accent font-medium underline hover:text-res-brand-hover">
                  Club website
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — bento images */}
        <div className="w-full space-y-6">
          <Images images={club?.profileImages ?? []} name={club.businessName} />
          <Images2
            vendor={club}
            images={club?.profileImages ?? []}
            name={club.businessName}
          />
        </div>

        {/* Row 3 — tabs (info / drinks / reviews / events) */}
        <div>
          <ClubInfo data={club} />
        </div>

        {/* Row 4 — reservations */}
        <div>
          <MakeReservationSection vendorId={id!} vertical="club" />
        </div>

        {/* Row 5 — map */}
        <div className="px-4 md:px-0">
          <div className="rounded-res-md bg-res-secondary shadow-res-low p-1">
            <MapComponent address={club.address} />
          </div>
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default ClubPage;
