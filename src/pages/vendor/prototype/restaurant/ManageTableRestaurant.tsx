import { useSearchParams } from 'react-router-dom';
import { PrototypeManageView, restaurantPlugin } from '@/features/floor-plan';

export default function PrototypeManageTableRestaurant() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId') ?? undefined;
  const query = planId ? `?planId=${planId}` : '';

  return (
    <PrototypeManageView
      plugin={restaurantPlugin}
      planId={planId}
      floorPlanPath={`/dashboard/restaurant/table/layouts/prototype${query}`}
      description="Restaurant table states: capacity, meal stage and minutes seated."
    />
  );
}
