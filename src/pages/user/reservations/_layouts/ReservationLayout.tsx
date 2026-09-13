import { ReservationsProvider } from '@/contexts/restaurant/ReservationContext';
import { Outlet, useSearchParams } from 'react-router';

const ReservationLayout = () => {
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

export default ReservationLayout;
