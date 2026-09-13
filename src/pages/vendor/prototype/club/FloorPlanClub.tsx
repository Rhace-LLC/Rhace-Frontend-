import { useSearchParams } from 'react-router-dom';
import { PrototypeFloorPlanView, nightclubPlugin } from '@/features/floor-plan';

export default function PrototypeFloorPlanClub() {
  const [searchParams] = useSearchParams();
  return (
    <PrototypeFloorPlanView
      plugin={nightclubPlugin}
      planId={searchParams.get('planId') ?? undefined}
    />
  );
}
