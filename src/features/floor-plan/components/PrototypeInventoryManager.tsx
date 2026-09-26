import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Armchair, BedDouble, Eye, Pencil, Plus } from 'lucide-react';
import type { VerticalPlugin } from '../core/plugin';
import { useBlueprints } from '../api/hooks';
import { floorPlanKeys } from '../api/keys';
import { toDomainBlueprint } from '../api/adapter';
import { CreateBlueprintModal } from './CreateBlueprintModal';
import { BlueprintDetailView } from './BlueprintDetailView';
import type { InventoryBlueprint, Vertical } from '../domain/types';
import { formatBlueprintPricing, getBlueprintPricing } from '../domain/pricing';

interface PrototypeInventoryManagerProps {
  plugin: VerticalPlugin;
}

const CONFIG_LABEL: Record<Vertical, string> = {
  hotel: 'Room',
  club: 'Table',
  restaurant: 'Table',
};

const KIND_PLURAL: Record<Vertical, string> = {
  hotel: 'room types',
  club: 'table types',
  restaurant: 'table types',
};

export function PrototypeInventoryManager({ plugin }: PrototypeInventoryManagerProps) {
  const vertical = plugin.id as Vertical;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { blueprintId } = useParams<{ blueprintId?: string }>();
  const query = useBlueprints(vertical);

  const blueprints = useMemo(
    () => (query.data?.items ?? []).map(toDomainBlueprint),
    [query.data]
  );

  const [modal, setModal] = useState<{ open: boolean; initial: InventoryBlueprint | null }>({
    open: false,
    initial: null,
  });

  const closeModal = () => setModal({ open: false, initial: null });

  if (blueprintId) {
    const basePath = location.pathname.replace(new RegExp(`/${blueprintId}$`), '');
    return (
      <BlueprintDetailView
        plugin={plugin}
        blueprint={blueprints.find((entry) => entry.id === blueprintId)}
        onBack={() => navigate(basePath)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-res-surface p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="type-res-h2 text-res-ink">Inventory</h1>
            <p className="type-res-body mt-1 font-normal text-res-ink-muted">
              {blueprints.length} {KIND_PLURAL[vertical]} set up. Edit details, pricing,
              extras and house rules.
            </p>
          </div>
          <button
            onClick={() => setModal({ open: true, initial: null })}
            className="type-res-body flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            <Plus size={15} /> Add {CONFIG_LABEL[vertical].toLowerCase()}
          </button>
        </div>

        {query.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-res-md bg-res-card p-1.5 shadow-res-low">
                <div className="h-32 animate-pulse rounded-res-sm bg-res-surface" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-res-surface" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-res-surface" />
                </div>
              </div>
            ))}
          </div>
        ) : blueprints.length === 0 ? (
          <div className="rounded-res-lg bg-res-card px-6 py-14 text-center shadow-res-low">
            <p className="type-res-h3 text-res-ink">No {KIND_PLURAL[vertical]} yet</p>
            <p className="type-res-small mt-1 font-normal text-res-ink-muted">
              Add your first one to start taking bookings.
            </p>
            <button
              onClick={() => setModal({ open: true, initial: null })}
              className="type-res-body mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
            >
              <Plus size={15} /> Add {CONFIG_LABEL[vertical].toLowerCase()}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blueprints.map((blueprint) => (
              <article
                key={blueprint.id}
                className="flex flex-col overflow-hidden rounded-res-md border border-res-line bg-res-card shadow-res-low transition-all duration-200 hover:shadow-res-medium"
              >
                <div className="bg-res-card p-1.5 pb-0">
                  <BlueprintCover blueprint={blueprint} />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="type-res-h3 line-clamp-1 text-res-ink">{blueprint.name}</h2>
                      <p className="type-res-small line-clamp-1 font-normal text-res-ink-muted">
                        {blueprint.type}
                      </p>
                    </div>
                    <span className="type-res-small shrink-0 rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
                      {CONFIG_LABEL[vertical]}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-2">
                    <div className="rounded-res-sm bg-res-surface p-2.5">
                      <dt className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        {getBlueprintPricing(blueprint).mode === 'room' ? 'Per night' : 'Deposit'}
                      </dt>
                      <dd className="type-res-body mt-0.5 font-semibold text-res-ink">
                        {formatBlueprintPricing(getBlueprintPricing(blueprint))}
                      </dd>
                    </div>
                    <div className="rounded-res-sm bg-res-surface p-2.5">
                      <dt className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        Seats
                      </dt>
                      <dd className="type-res-body mt-0.5 font-semibold text-res-ink">
                        {blueprint.capacity}
                        {blueprint.maxCapacity && blueprint.maxCapacity !== blueprint.capacity
                          ? `–${blueprint.maxCapacity}`
                          : ''}
                      </dd>
                    </div>
                  </dl>

                  {blueprint.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {blueprint.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity.id}
                          className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-medium text-res-ink-muted"
                        >
                          {amenity.label}
                        </span>
                      ))}
                      {blueprint.amenities.length > 3 && (
                        <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink">
                          +{blueprint.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex flex-col gap-2 pt-1">
                    <button
                      onClick={() => setModal({ open: true, initial: blueprint })}
                      className="type-res-small flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-res-surface px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
                    >
                      <Pencil size={13} /> Edit details
                    </button>
                    <button
                      onClick={() => navigate(`${location.pathname}/${blueprint.id}`)}
                      className="type-res-small flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 font-semibold text-res-ink-muted transition-colors outline-none hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
                    >
                      <Eye size={13} /> View
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <CreateBlueprintModal
        vertical={vertical}
        isOpen={modal.open}
        initial={modal.initial}
        onClose={closeModal}
        onSaved={() => {
          closeModal();
          queryClient.invalidateQueries({ queryKey: floorPlanKeys.all });
        }}
      />
    </div>
  );
}

function BlueprintCover({ blueprint }: { blueprint: InventoryBlueprint }) {
  const src = blueprint.images[0];
  if (src) {
    return (
      <img src={src} alt={blueprint.name} loading="lazy" className="h-32 w-full rounded-res-sm object-cover" />
    );
  }
  const Icon = blueprint.vertical === 'hotel' ? BedDouble : Armchair;
  const initials = blueprint.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-res-sm bg-res-surface">
      <span className="rounded-full bg-res-card p-2 shadow-res-low">
        <Icon className="h-5 w-5 text-res-brand" />
      </span>
      <span className="type-res-small font-semibold text-res-ink-muted">{initials || blueprint.type}</span>
    </div>
  );
}
