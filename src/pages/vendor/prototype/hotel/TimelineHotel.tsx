import { useSearchParams } from 'react-router-dom';
import { PrototypeTimelineView, hotelPlugin } from '@/features/floor-plan';

export default function PrototypeTimelineHotel() {
  const [searchParams] = useSearchParams();
  return (
    <PrototypeTimelineView
      plugin={hotelPlugin}
      planId={searchParams.get('planId') ?? undefined}
    />
  );
}
