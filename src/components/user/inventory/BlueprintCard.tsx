import { Link } from 'react-router';
import type { InventoryBlueprint, Vertical } from '@/features/floor-plan/domain/types';

const ROUTE_SEGMENT: Record<Vertical, string> = {
  restaurant: 'restaurants',
  club: 'clubs',
  hotel: 'hotels',
};

function priceSuffix(vertical: Vertical): string {
  if (vertical === 'hotel') return 'per night';
  if (vertical === 'club') return 'min. spend';
  return 'per table';
}

interface BlueprintCardProps {
  blueprint: InventoryBlueprint;
  vertical: Vertical;
  vendorId: string;
}

export function BlueprintCard({ blueprint, vertical, vendorId }: BlueprintCardProps) {
  const reservePath = `/${ROUTE_SEGMENT[vertical]}/${vendorId}/reserve/${blueprint.id}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {blueprint.images[0] ? (
        <img
          src={blueprint.images[0]}
          alt={blueprint.name}
          loading="lazy"
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-[#0A6C6D] text-lg font-semibold text-white">
          {blueprint.type}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{blueprint.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-gray-500">
            {blueprint.description || blueprint.type}
          </p>
        </div>

        {blueprint.amenities.length > 0 && (
          <p className="truncate text-xs text-gray-500">
            {blueprint.amenities.map((amenity) => amenity.label).join(' · ')}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="text-2xl font-bold leading-none text-gray-900">
              ₦{blueprint.basePrice.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
              {priceSuffix(vertical)}
            </p>
          </div>
          <Link
            to={reservePath}
            className="rounded-xl bg-[#0A6C6D] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0A6C6D]/90"
          >
            Reserve
          </Link>
        </div>
      </div>
    </article>
  );
}
