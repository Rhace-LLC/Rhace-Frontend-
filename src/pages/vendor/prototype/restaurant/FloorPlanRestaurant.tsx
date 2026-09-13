import { useSearchParams } from 'react-router-dom';
import { PrototypeFloorPlanView, restaurantPlugin } from '@/features/floor-plan';

export default function PrototypeFloorPlanRestaurant() {
  const [searchParams] = useSearchParams();
  return (
    <PrototypeFloorPlanView
      plugin={restaurantPlugin}
      planId={searchParams.get('planId') ?? undefined}
    />
  );
}
