import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Plus } from 'lucide-react';
import type { VerticalPlugin } from '../core/plugin';
import { useBlueprints } from '../api/hooks';
import { floorPlanKeys } from '../api/keys';
import { toDomainBlueprint } from '../api/adapter';
import { CreateBlueprintModal } from './CreateBlueprintModal';
import { BlueprintDetailView } from './BlueprintDetailView';
import type { InventoryBlueprint, Vertical } from '../domain/types';

interface PrototypeInventoryManagerProps {
  plugin: VerticalPlugin;
}

const CONFIG_LABEL: Record<Vertical, string> = {
  hotel: 'Room Config',
  club: 'Table Config',
  restaurant: 'Table Config',
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">All Inventories</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {blueprints.length} {CONFIG_LABEL[vertical]}
              {blueprints.length === 1 ? '' : 's'} configured. Edit specs, pricing, amenities and
              policies.
            </p>
          </div>
          <button
            onClick={() => setModal({ open: true, initial: null })}
            className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800"
          >
            <Plus size={14} /> Create a {CONFIG_LABEL[vertical]}
          </button>
        </div>

        {query.isLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center text-sm text-gray-500">
            Loading inventory…
          </div>
        ) : blueprints.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center text-sm text-gray-500">
            No {CONFIG_LABEL[vertical]}s yet. Create one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blueprints.map((blueprint) => (
              <article
                key={blueprint.id}
                className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <BlueprintCover blueprint={blueprint} />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-gray-900">
                        {blueprint.name}
                      </h2>
                      <p className="truncate text-xs text-gray-500">{blueprint.type}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                      {CONFIG_LABEL[vertical]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1 text-xs">
                    <span className="text-gray-500">Price</span>
                    <span className="text-right font-medium text-gray-900">
                      ₦{blueprint.basePrice.toLocaleString()}
                    </span>
                    <span className="text-gray-500">Capacity</span>
                    <span className="text-right font-medium text-gray-900">
                      {blueprint.capacity}
                      {blueprint.maxCapacity && blueprint.maxCapacity !== blueprint.capacity
                        ? `–${blueprint.maxCapacity}`
                        : ''}
                    </span>
                  </div>

                  {blueprint.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {blueprint.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity.id}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
                        >
                          {amenity.label}
                        </span>
                      ))}
                      {blueprint.amenities.length > 3 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400">
                          +{blueprint.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex flex-col gap-2">
                    <button
                      onClick={() => setModal({ open: true, initial: blueprint })}
                      className="flex items-center justify-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100"
                    >
                      <Pencil size={13} /> Edit {CONFIG_LABEL[vertical]}
                    </button>
                    <button
                      onClick={() => navigate(`${location.pathname}/${blueprint.id}`)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
    return <img src={src} alt={blueprint.name} className="h-32 w-full object-cover" />;
  }
  return (
    <div
      className="flex h-32 w-full items-center justify-center text-sm font-semibold text-white"
      style={{ backgroundColor: blueprint.accent ?? '#0d9488' }}
    >
      {blueprint.type}
    </div>
  );
}
