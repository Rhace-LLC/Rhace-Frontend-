import { ReservationsProvider } from '@/contexts/club/ReservationContext';
import { Outlet, useSearchParams } from 'react-router';

const ClubReservationLayout = () => {
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

export default ClubReservationLayout;
