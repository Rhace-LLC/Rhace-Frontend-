import { useSearchParams } from 'react-router-dom';
import { PrototypeFloorPlanView, hotelPlugin } from '@/features/floor-plan';

export default function PrototypeFloorPlanHotel() {
  const [searchParams] = useSearchParams();
  return (
    <PrototypeFloorPlanView
      plugin={hotelPlugin}
      planId={searchParams.get('planId') ?? undefined}
    />
  );
}
