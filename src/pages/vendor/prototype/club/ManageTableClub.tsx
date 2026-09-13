import { useSearchParams } from 'react-router-dom';
import { PrototypeManageView, nightclubPlugin } from '@/features/floor-plan';

export default function PrototypeManageTableClub() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId') ?? undefined;
  const query = planId ? `?planId=${planId}` : '';

  return (
    <PrototypeManageView
      plugin={nightclubPlugin}
      planId={planId}
      floorPlanPath={`/dashboard/club/table/layouts/prototype${query}`}
      description="VIP tables: minimum spend, live spend progress, party and host names."
    />
  );
}
