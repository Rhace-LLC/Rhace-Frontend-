import { useSearchParams } from 'react-router-dom';
import { PrototypeManageView, hotelPlugin } from '@/features/floor-plan';

export default function PrototypeManageRoomHotel() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId') ?? undefined;
  const query = planId ? `?planId=${planId}` : '';

  return (
    <PrototypeManageView
      plugin={hotelPlugin}
      planId={planId}
      floorPlanPath={`/dashboard/hotel/room/layouts/prototype${query}`}
      description="Hotel rooms: room type, housekeeping status and current guest. Multi-floor."
    />
  );
}
