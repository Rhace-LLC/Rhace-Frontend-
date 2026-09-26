import { useMemo } from 'react';
import { toDomainBlueprint, useVendorBlueprints } from '@/features/floor-plan';
import { BlueprintCard } from './BlueprintCard';
import type { Vertical } from '@/features/floor-plan/domain/types';

interface MakeReservationSectionProps {
  vendorId: string;
  vertical: Vertical;
}

const UNIT_LABEL: Record<Vertical, string> = {
  hotel: 'room',
  club: 'table',
  restaurant: 'table',
};

export function MakeReservationSection({ vendorId, vertical }: MakeReservationSectionProps) {
  const query = useVendorBlueprints(vendorId, vertical);
  const blueprints = useMemo(
    () => (query.data?.items ?? []).map(toDomainBlueprint),
    [query.data]
  );
  const unitLabel = UNIT_LABEL[vertical];

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="type-res-h2 text-res-ink">Make reservation</h2>
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">
            Choose a {unitLabel} and reserve in a few steps.
          </p>
        </div>
        {!query.isLoading && !query.isError && blueprints.length > 0 && (
          <span className="type-res-small w-max rounded-full bg-res-surface px-3 py-1 font-semibold text-res-ink-muted">
            {blueprints.length} {unitLabel}
            {blueprints.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="mt-4 rounded-res-md bg-res-surface p-3 sm:p-4">
        {query.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="overflow-hidden rounded-res-md bg-res-card p-1.5 shadow-res-low"
              >
                <div className="h-40 animate-pulse rounded-res-sm bg-res-surface" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-1/3 animate-pulse rounded-full bg-res-surface" />
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-res-surface" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-res-surface" />
                </div>
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div className="rounded-res-md bg-res-card px-6 py-10 text-center shadow-res-low">
            <p className="type-res-h3 text-res-ink">Couldn&apos;t load reservations</p>
            <p className="type-res-small mt-1 text-res-ink-muted">
              Please try again in a moment.
            </p>
          </div>
        ) : blueprints.length === 0 ? (
          <div className="rounded-res-md bg-res-card px-6 py-10 text-center shadow-res-low">
            <p className="type-res-h3 text-res-ink">No reservations yet</p>
            <p className="type-res-small mt-1 text-res-ink-muted">
              No {unitLabel}s available for this venue yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {blueprints.map((blueprint) => (
              <BlueprintCard
                key={blueprint.id}
                blueprint={blueprint}
                vertical={vertical}
                vendorId={vendorId}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
