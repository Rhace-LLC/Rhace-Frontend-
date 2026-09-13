import { PrototypeManageView, restaurantPlugin } from '@/features/floor-plan';

export default function PrototypeManageTableRestaurant() {
  return (
    <PrototypeManageView
      plugin={restaurantPlugin}
      floorPlanPath="/dashboard/restaurant/table/layouts/prototype"
      description="Mock restaurant table states: capacity, meal stage and minutes seated. No live data."
    />
  );
}
