import { useMemo } from 'react';
import { toDomainBlueprint, useVendorBlueprints } from '@/features/floor-plan';
import { BlueprintCard } from './BlueprintCard';
import type { Vertical } from '@/features/floor-plan/domain/types';

interface MakeReservationSectionProps {
  vendorId: string;
  vertical: Vertical;
}

export function MakeReservationSection({ vendorId, vertical }: MakeReservationSectionProps) {
  const query = useVendorBlueprints(vendorId, vertical);
  const blueprints = useMemo(
    () => (query.data?.items ?? []).map(toDomainBlueprint),
    [query.data]
  );

  return (
    <section className="mt-10 md:mt-14">
      <div className="mb-5">
        <h2 className="type-res-h2 text-res-ink">Make reservation</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose a {vertical === 'hotel' ? 'room' : 'table'} and reserve in a few steps.
        </p>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-80 animate-pulse rounded-res-md bg-gray-100" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 py-12 text-center text-sm text-red-500">
          Couldn’t load reservations. Please try again.
        </div>
      ) : blueprints.length === 0 ? (
        <div className="rounded-res-md border border-dashed border-gray-300 bg-res-card py-12 text-center text-sm text-gray-500">
          No reservations available for this venue yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
    </section>
  );
}
