import { Link } from 'react-router';
import { getBlueprintPricing } from '@/features/floor-plan';
import type { InventoryBlueprint, Vertical } from '@/features/floor-plan/domain/types';
import { Armchair, BedDouble, Clock, MapPin, Users } from 'lucide-react';

const ROUTE_SEGMENT: Record<Vertical, string> = {
  restaurant: 'restaurants',
  club: 'clubs',
  hotel: 'hotels',
};

interface BlueprintCardProps {
  blueprint: InventoryBlueprint;
  vertical: Vertical;
  vendorId: string;
}

function capacityLabel(blueprint: InventoryBlueprint): string {
  const min = blueprint.capacity ?? 0;
  const max = blueprint.maxCapacity ?? min;
  if (max && max !== min) return `${min}–${max} guests`;
  if (min) return `${min} guest${min === 1 ? '' : 's'}`;
  return 'Flexible capacity';
}

function categoryCaption(blueprint: InventoryBlueprint): string {
  if (blueprint.vertical === 'hotel') {
    const parts = [blueprint.roomType || blueprint.type, blueprint.bedType, blueprint.view].filter(
      Boolean
    );
    return parts.join(' · ');
  }
  if (blueprint.vertical === 'club') {
    return [blueprint.tier || blueprint.type, 'Table'].filter(Boolean).join(' · ');
  }
  const parts = [blueprint.seatingArea || blueprint.type, 'Table'].filter(Boolean);
  return parts.join(' · ');
}

function VerticalMeta({ blueprint }: { blueprint: InventoryBlueprint }) {
  if (blueprint.vertical === 'club' && blueprint.minimumSpend > 0) {
    return (
      <span className="type-res-small flex items-center gap-1.5 font-normal text-res-ink-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-res-brand" />
        ₦{blueprint.minimumSpend.toLocaleString()} minimum spend
      </span>
    );
  }
  if (blueprint.vertical === 'restaurant' && blueprint.turnTimeMinutes) {
    return (
      <span className="type-res-small flex items-center gap-1.5 font-normal text-res-ink-muted">
        <Clock className="h-3.5 w-3.5 shrink-0 text-res-brand" />
        ~{blueprint.turnTimeMinutes} min seating
      </span>
    );
  }
  if (blueprint.vertical === 'hotel' && (blueprint.view || blueprint.bedType)) {
    return (
      <span className="type-res-small flex items-center gap-1.5 font-normal text-res-ink-muted">
        <BedDouble className="h-3.5 w-3.5 shrink-0 text-res-brand" />
        {[blueprint.bedType, blueprint.view].filter(Boolean).join(' · ')}
      </span>
    );
  }
  return null;
}

function FallbackVisual({ blueprint }: { blueprint: InventoryBlueprint }) {
  const Icon = blueprint.vertical === 'hotel' ? BedDouble : Armchair;
  const initials = blueprint.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-res-sm bg-res-surface">
      <span className="rounded-full bg-res-card p-2.5 shadow-res-low">
        <Icon className="h-5 w-5 text-res-brand" />
      </span>
      <span className="type-res-h3 text-res-ink-muted">{initials || blueprint.type}</span>
    </div>
  );
}

export function BlueprintCard({ blueprint, vertical, vendorId }: BlueprintCardProps) {
  const reservePath = `/${ROUTE_SEGMENT[vertical]}/${vendorId}/reserve/${blueprint.id}`;
  const pricing = getBlueprintPricing(blueprint);
  const amenities = blueprint.amenities ?? [];
  const visibleAmenities = amenities.slice(0, 3);
  const extraAmenities = amenities.length - visibleAmenities.length;

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-res-md border border-res-line bg-res-card shadow-res-low transition-all duration-200 hover:shadow-res-medium">
      <div className="relative bg-res-card p-1.5 pb-0">
        {blueprint.images[0] ? (
          <img
            src={blueprint.images[0]}
            alt={blueprint.name}
            loading="lazy"
            className="h-40 w-full rounded-res-sm object-cover"
          />
        ) : (
          <FallbackVisual blueprint={blueprint} />
        )}
        <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5">
          <span className="type-res-small flex items-center gap-1 rounded-full bg-res-card px-2.5 py-1 font-semibold text-res-ink shadow-res-low">
            <Users className="h-3 w-3 text-res-brand" />
            {capacityLabel(blueprint)}
          </span>
          {pricing.mode === 'table' && pricing.isFree ? (
            <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand shadow-res-low">
              Free to reserve
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
          {categoryCaption(blueprint)}
        </p>
        <h3 className="type-res-h3 mt-1 line-clamp-1 text-res-ink">{blueprint.name}</h3>
        <p className="type-res-body mt-1.5 line-clamp-2 min-h-[36px] font-normal text-res-ink-muted">
          {blueprint.description || `${blueprint.type} — reservable in a few steps.`}
        </p>

        {visibleAmenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleAmenities.map((amenity) => (
              <span
                key={amenity.id}
                className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-medium text-res-ink-muted"
              >
                {amenity.label}
              </span>
            ))}
            {extraAmenities > 0 && (
              <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink">
                +{extraAmenities} more
              </span>
            )}
          </div>
        )}

        <div className="mt-3">
          <VerticalMeta blueprint={blueprint} />
        </div>

        <div className="mt-3 flex items-end justify-between gap-3 border-t border-res-line pt-3">
          <div>
            {pricing.mode === 'room' ? (
              <>
                <p className="type-res-h3 text-res-ink">₦{pricing.price.toLocaleString()}</p>
                <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                  per night
                </p>
              </>
            ) : pricing.isFree ? (
              <>
                <p className="type-res-h3 text-res-brand">Free</p>
                <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                  no deposit required
                </p>
              </>
            ) : (
              <>
                <p className="type-res-h3 text-res-ink">
                  ₦{pricing.minimumDeposit.toLocaleString()}
                </p>
                <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                  reservation deposit
                </p>
              </>
            )}
          </div>
          <Link
            to={reservePath}
            className="type-res-body rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            Reserve
          </Link>
        </div>
        {pricing.mode === 'table' && !pricing.isFree && (
          <p className="type-res-small mt-2 font-normal text-res-ink-muted">
            Credited against your bill
          </p>
        )}
      </div>
    </article>
  );
}
