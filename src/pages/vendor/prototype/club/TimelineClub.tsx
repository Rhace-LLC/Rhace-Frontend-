import { useSearchParams } from 'react-router-dom';
import { PrototypeTimelineView, nightclubPlugin } from '@/features/floor-plan';

export default function PrototypeTimelineClub() {
  const [searchParams] = useSearchParams();
  return (
    <PrototypeTimelineView
      plugin={nightclubPlugin}
      planId={searchParams.get('planId') ?? undefined}
    />
  );
}
