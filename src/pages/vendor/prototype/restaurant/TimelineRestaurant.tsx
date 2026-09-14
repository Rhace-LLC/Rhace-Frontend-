import { useSearchParams } from 'react-router-dom';
import { PrototypeTimelineView, restaurantPlugin } from '@/features/floor-plan';

export default function PrototypeTimelineRestaurant() {
  const [searchParams] = useSearchParams();
  return (
    <PrototypeTimelineView
      plugin={restaurantPlugin}
      planId={searchParams.get('planId') ?? undefined}
    />
  );
}
