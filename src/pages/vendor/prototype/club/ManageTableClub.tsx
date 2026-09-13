import { PrototypeManageView, nightclubPlugin } from '@/features/floor-plan';

export default function PrototypeManageTableClub() {
  return (
    <PrototypeManageView
      plugin={nightclubPlugin}
      floorPlanPath="/dashboard/club/table/layouts/prototype"
      description="Mock VIP tables: minimum spend, live spend progress, party and host names. No live data."
    />
  );
}
