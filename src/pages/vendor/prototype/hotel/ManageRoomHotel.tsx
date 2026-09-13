import { PrototypeManageView, hotelPlugin } from '@/features/floor-plan';

export default function PrototypeManageRoomHotel() {
  return (
    <PrototypeManageView
      plugin={hotelPlugin}
      floorPlanPath="/dashboard/hotel/room/layouts/prototype"
      description="Mock hotel rooms: room type, housekeeping status and current guest. Multi-floor. No live data."
    />
  );
}
