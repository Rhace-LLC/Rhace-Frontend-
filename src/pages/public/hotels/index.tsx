'use client';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import StarRating from '@/components/ui/starrating';
import Header from '@/components/user/Header';
import Images from '@/components/user/ui/Image';
import Images2 from '@/components/user/ui/Image2';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import MapComponent from '@/components/user/ui/mapComponent';
import HotelSaveCopy from '@/components/user/ui/SaveCopy';
import { MakeReservationSection } from '@/components/user/inventory/MakeReservationSection';
import { hotelService } from '@/services/hotel.service';
import { userService } from '@/services/user.service';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import HotelInfo from './_subcomponents/HotelInfo';
import type { HotelRoom } from './_subcomponents/Rooms';

const HotelsPage = () => {
  const location = useLocation();
  const section = location.hash ? location.hash.substring(1) : 'details';
  const [activeTab, setActiveTab] = useState(section);

  const { id } = useParams();
  const [hotel, setHotel] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [, setShow] = useState(false);
  const [rooms, setRooms] = useState<any>(null);
  const [selectedRooms, setSelectedRooms] = useState<HotelRoom[]>([]);

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const res = await userService.getVendor(id);
        setHotel(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHotel();
    const fetchRooms = async () => {
      try {
        const res = await hotelService.getRoomTypes(id!);
        setRooms(res);
      } catch (error) {
        console.error(error);
      }
    };
    fetchRooms();
  }, []);

  if (isLoading || !rooms) return <UniversalLoader fullscreen type="vendor-page" />;

  return (
    <div className="bg-white">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto md:mt-[85px] mb-[160px] md:mb-[16px] md:py-8 max-w-7xl sm:px-6 lg:px-8 space-y-8 md:space-y-10">
        {/* Row 1 — name / rating (LHS) + share-save & location-contact (RHS) */}
        <div className="flex flex-col md:flex-row md:justify-between gap-4 px-4 md:px-0">
          <div className="space-y-2">
            <div className="flex items-center gap-3 pt-2 md:pt-0">
              <h1 className="type-res-h1 text-res-ink">
                {hotel.businessName}{' '}
              </h1>{' '}
              <span className="px-2 py-0.5 rounded-full border border-[#37703F] bg-[#D1FAE5] text-xs text-[#37703F]">
                {' '}
                Open
              </span>
            </div>
            <div className="flex gap-1 items-center text-xs">
              <StarRating size={16} rating={Number(hotel.rating)} readOnly />
              <span className="font-semibold text-lg">{hotel.rating}</span>
              <span className="text-gray-600">
                ({hotel.reviews.toLocaleString()} reviews)
              </span>
            </div>
            <div className="mt-2">
              <HotelSaveCopy type="hotels" vendor={hotel} id={id} />
            </div>
          </div>
          <div className="space-y-3 md:w-[320px] md:shrink-0">
            <div className="text-sm text-gray-800 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-black mt-0.5 shrink-0" />
                <p>{hotel.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-black shrink-0" />
                <a href={`tel:${hotel.phone}`} className="hover:underline">
                  {hotel.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-black shrink-0" />
                <a href={`mailto:${hotel.email}`} className="hover:underline">
                  {hotel.email}
                </a>
              </div>
              <div>
                <a
                  href="#"
                  className="text-res-accent font-medium underline hover:text-res-brand-hover"
                >
                  Hotel website
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — bento images */}
        <div className="w-full space-y-6">
          <div className="flex md:gap-2">
            <Images images={hotel?.profileImages ?? []} name={hotel.businessName} />
            <Images2
              vendor={hotel}
              images={hotel?.profileImages ?? []}
              name={hotel.businessName}
            />
          </div>
        </div>

        {/* Row 3 — tabs (details / rooms / policies / reviews) */}
        <div>
          <HotelInfo
            id={id!}
            data={hotel}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedRooms={selectedRooms}
            setShow={setShow}
            rooms={rooms}
            setSelectedRooms={setSelectedRooms}
          />
        </div>

        {/* Row 4 — reservations */}
        <div>
          <MakeReservationSection vendorId={id!} vertical="hotel" />
        </div>

        {/* Row 5 — map */}
        {activeTab !== 'rooms' && (
          <div className="px-4 md:px-0">
            <div className="rounded-res-md bg-res-secondary shadow-res-low p-1">
              <MapComponent address={hotel.address} />
            </div>
          </div>
        )}
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default HotelsPage;
