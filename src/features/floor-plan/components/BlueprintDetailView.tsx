import { useMemo, useState } from 'react';
import { ChevronRight, Plus, Settings2 } from 'lucide-react';
import type { VerticalPlugin } from '../core/plugin';
import {
  useCreateFloorPlan,
  useCreateUnit,
  useFloorPlans,
  usePhysicalUnits,
} from '../api/hooks';
import { DEFAULT_PLAN } from '../api/useResolvedFloorPlan';
import { defaultStateFor, stateMetaFor } from '../domain/states';
import { AddPhysicalUnitModal, type UnitPlacementInput } from './AddPhysicalUnitModal';
import { UnitManageModal } from './UnitManageModal';
import type { InventoryBlueprint, Vertical } from '../domain/types';
import type { FloorPlanVertical, PhysicalUnitDto } from '@/types';

interface BlueprintDetailViewProps {
  plugin: VerticalPlugin;
  blueprint: InventoryBlueprint | undefined;
  onBack: () => void;
}

export function BlueprintDetailView({ plugin, blueprint, onBack }: BlueprintDetailViewProps) {
  const vertical = plugin.id as Vertical;
  const [manageUnitId, setManageUnitId] = useState<string | null>(null);

  const plansQuery = useFloorPlans(vertical);
  const planId = plansQuery.data?.items?.[0]?._id;

  const unitsQuery = usePhysicalUnits(
    planId,
    blueprint ? { blueprintId: blueprint.id } : undefined
  );
  const units = useMemo<PhysicalUnitDto[]>(() => unitsQuery.data?.items ?? [], [unitsQuery.data]);

  const plan = plansQuery.data?.items?.[0];
  const floors = plan?.floors?.length ? plan.floors : plan?.floor ? [plan.floor] : [];
  const sections = plan?.areas ?? [];

  const createPlan = useCreateFloorPlan();
  const createUnit = useCreateUnit();
  const [addUnitOpen, setAddUnitOpen] = useState(false);

  const handlePlaceUnit = (input: UnitPlacementInput) => {
    const payload = {
      blueprintId: input.blueprintId,
      label: input.designation || undefined,
      floorId: input.floor,
      sectionId: input.section,
      state: input.state,
    };

    if (planId) {
      createUnit.mutate({ planId, input: payload }, { onSuccess: () => setAddUnitOpen(false) });
      return;
    }

    // No floor plan yet — create the default plan, then place the unit.
    createPlan.mutate(DEFAULT_PLAN[vertical], {
      onSuccess: (response) => {
        const newPlanId = response.data?._id;
        if (!newPlanId) {
          setAddUnitOpen(false);
          return;
        }
        createUnit.mutate(
          { planId: newPlanId, input: payload },
          { onSuccess: () => setAddUnitOpen(false) }
        );
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-4 flex items-center gap-1 text-xs text-gray-500">
          <button onClick={onBack} className="font-medium hover:text-teal-700">
            Prototype Inventory Manager
          </button>
          <ChevronRight size={12} />
          <span className="font-medium text-gray-900">{blueprint?.name ?? 'Blueprint'}</span>
        </nav>

        {!blueprint ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center text-sm text-gray-500">
            {plansQuery.isLoading ? 'Loading blueprint…' : 'Blueprint not found.'}
          </div>
        ) : (
          <>
            <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {blueprint.images[0] ? (
                <img
                  src={blueprint.images[0]}
                  alt={blueprint.name}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-44 w-full items-center justify-center text-lg font-semibold text-white"
                  style={{ backgroundColor: blueprint.accent ?? '#0d9488' }}
                >
                  {blueprint.type}
                </div>
              )}

              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-gray-900">{blueprint.name}</h1>
                    <p className="text-sm text-gray-500">{blueprint.type}</p>
                  </div>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">
                    ₦{blueprint.basePrice.toLocaleString()}
                  </span>
                </div>

                {blueprint.description && (
                  <p className="mt-3 text-sm text-gray-600">{blueprint.description}</p>
                )}

                <dl className="mt-4 grid grid-cols-2 gap-y-2 text-xs sm:grid-cols-3">
                  <dt className="text-gray-500">Capacity</dt>
                  <dd className="text-gray-900">
                    {blueprint.capacity}
                    {blueprint.maxCapacity && blueprint.maxCapacity !== blueprint.capacity
                      ? `–${blueprint.maxCapacity}`
                      : ''}
                  </dd>
                  <dt className="text-gray-500">Currency</dt>
                  <dd className="text-gray-900">NGN (₦)</dd>
                  <dt className="text-gray-500">Canvas shape</dt>
                  <dd className="text-gray-900">{blueprint.canvasShape ?? '—'}</dd>
                </dl>

                {blueprint.amenities.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium text-gray-500">Amenities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {blueprint.amenities.map((amenity) => (
                        <span
                          key={amenity.id}
                          className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-600"
                        >
                          {amenity.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {blueprint.bookingPolicies.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium text-gray-500">Booking policies</p>
                    <ul className="space-y-0.5 text-xs text-gray-600">
                      {blueprint.bookingPolicies.map((policy) => (
                        <li key={policy.id}>· {policy.label}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {blueprint.images.length > 1 && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium text-gray-500">Gallery</p>
                    <div className="flex flex-wrap gap-2">
                      {blueprint.images.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  Physical Units ({units.length})
                </h2>
                <div className="flex items-center gap-2">
                  {!planId && !plansQuery.isLoading && (
                    <span className="text-xs text-gray-400">No floor plan yet.</span>
                  )}
                  <button
                    onClick={() => setAddUnitOpen(true)}
                    className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
                  >
                    <Plus size={13} /> Create Physical Unit
                  </button>
                </div>
              </div>

              {unitsQuery.isLoading ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
                  Loading units…
                </div>
              ) : units.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
                  No physical units use this blueprint yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {units.map((unit) => {
                    const meta = stateMetaFor(vertical, unit.state);
                    return (
                      <article
                        key={unit._id}
                        className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{unit.label}</h3>
                            <p className="text-xs text-gray-500">
                              {unit.floorId || '—'}
                              {unit.sectionId ? ` · ${unit.sectionId}` : ''}
                            </p>
                          </div>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-gray-500">
                          {unit.isReservable === false ? 'Not reservable' : 'Reservable'}
                        </p>

                        <button
                          onClick={() => setManageUnitId(unit._id)}
                          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100"
                        >
                          <Settings2 size={13} /> Manage
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <UnitManageModal
        unitId={manageUnitId}
        vertical={vertical}
        blueprints={blueprint ? [blueprint] : []}
        onClose={() => setManageUnitId(null)}
      />

      <AddPhysicalUnitModal
        vertical={vertical}
        isOpen={addUnitOpen}
        blueprints={blueprint ? [blueprint] : []}
        floors={floors}
        sections={sections}
        defaultBlueprintId={blueprint?.id}
        defaultFloor={plan?.floor}
        defaultSection={plan?.activeArea}
        defaultState={defaultStateFor(vertical)}
        onClose={() => setAddUnitOpen(false)}
        onPlace={handlePlaceUnit}
      />
    </div>
  );
}
