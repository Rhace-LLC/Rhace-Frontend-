import { ReservationsProvider } from '@/contexts/hotel/ReservationContext';
import { Outlet, useSearchParams } from 'react-router';

const HotelReservationLayout = () => {
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft') ?? undefined;

  return (
    <div>
      <ReservationsProvider draftId={draftId}>
        <Outlet />
      </ReservationsProvider>
    </div>
  );
};

export default HotelReservationLayout;
