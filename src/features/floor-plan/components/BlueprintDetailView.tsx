import { useMemo, useState } from 'react';
import { ChevronRight, Pencil, Plus, QrCode as QrCodeIcon, Settings2 } from 'lucide-react';
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
import { EditUnitModal } from './EditUnitModal';
import { UnitManageModal } from './UnitManageModal';
import type { InventoryBlueprint, Vertical } from '../domain/types';
import { getBlueprintPricing } from '../domain/pricing';
import { useQrToken } from '@/features/orders';
import { QrCode } from '@/components/ui/qr-code';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FloorPlanVertical, PhysicalUnitDto } from '@/types';

interface BlueprintDetailViewProps {
  plugin: VerticalPlugin;
  blueprint: InventoryBlueprint | undefined;
  onBack: () => void;
}

const KIND_LABEL: Record<Vertical, string> = {
  hotel: 'Room',
  club: 'Table',
  restaurant: 'Table',
};

function withNoun(value: string, noun: string): string {
  return value.toLowerCase().includes(noun.toLowerCase()) ? value : `${value} ${noun}`;
}

function verticalSpecs(blueprint: InventoryBlueprint): { label: string; value: string }[] {
  if (blueprint.vertical === 'club' && blueprint.minimumSpend > 0) {
    return [{ label: 'Minimum spend', value: `₦${blueprint.minimumSpend.toLocaleString()}` }];
  }
  if (blueprint.vertical === 'restaurant' && blueprint.turnTimeMinutes) {
    return [{ label: 'Seating time', value: `~${blueprint.turnTimeMinutes} min` }];
  }
  if (blueprint.vertical === 'hotel') {
    const specs: { label: string; value: string }[] = [];
    if (blueprint.bedType) specs.push({ label: 'Bed', value: withNoun(blueprint.bedType, 'Bed') });
    if (blueprint.view) specs.push({ label: 'View', value: withNoun(blueprint.view, 'View') });
    return specs;
  }
  return [];
}

export function BlueprintDetailView({ plugin, blueprint, onBack }: BlueprintDetailViewProps) {
  const vertical = plugin.id as Vertical;
  const kind = KIND_LABEL[vertical];
  const pricing = blueprint ? getBlueprintPricing(blueprint) : null;
  const [manageUnitId, setManageUnitId] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<PhysicalUnitDto | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const qrMutation = useQrToken();

  const handleShowQr = async (unitId: string) => {
    try {
      const result = await qrMutation.mutateAsync(unitId);
      setQrToken(result.token);
    } catch {
      setQrToken(null);
    }
  };

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
    <div className="min-h-screen bg-res-surface p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <nav className="type-res-small mb-4 flex items-center gap-1 font-normal text-res-ink-muted">
          <button
            onClick={onBack}
            className="cursor-pointer font-medium outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            Inventory
          </button>
          <ChevronRight size={12} />
          <span className="font-semibold text-res-ink">{blueprint?.name ?? 'Details'}</span>
        </nav>

        {!blueprint ? (
          <div className="rounded-res-lg bg-res-card px-6 py-16 text-center shadow-res-low">
            <p className="type-res-h3 text-res-ink">
              {plansQuery.isLoading ? 'Loading details…' : 'Not found'}
            </p>
            {!plansQuery.isLoading && (
              <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                This {kind.toLowerCase()} type couldn&apos;t be found.
              </p>
            )}
          </div>
        ) : (
          <>
            <section className="mb-5 overflow-hidden rounded-res-lg bg-res-card shadow-res-low">
              <div className="p-2 pb-0">
                {blueprint.images[0] ? (
                  <img
                    src={blueprint.images[0]}
                    alt={blueprint.name}
                    className="h-44 w-full rounded-res-md object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center rounded-res-md bg-res-surface">
                    <span className="type-res-h2 text-res-ink-muted">{blueprint.type}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      {kind} type · {blueprint.type}
                    </p>
                    <h1 className="type-res-h2 mt-1 text-res-ink">{blueprint.name}</h1>
                  </div>
                  <span className="type-res-body rounded-full bg-res-secondary px-4 py-2 font-semibold text-res-brand">
                    {pricing?.mode === 'room'
                      ? `₦${pricing.price.toLocaleString()} /night`
                      : pricing?.mode === 'table'
                        ? pricing.isFree
                          ? 'Free to book'
                          : `₦${pricing.minimumDeposit.toLocaleString()} deposit`
                        : '—'}
                  </span>
                </div>

                {blueprint.description && (
                  <p className="type-res-body max-w-2xl font-normal text-res-ink-muted">
                    {blueprint.description}
                  </p>
                )}

                <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <div className="rounded-res-sm bg-res-surface p-3">
                    <dt className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Seats
                    </dt>
                    <dd className="type-res-body mt-1 font-semibold text-res-ink">
                      {blueprint.capacity}
                      {blueprint.maxCapacity && blueprint.maxCapacity !== blueprint.capacity
                        ? `–${blueprint.maxCapacity}`
                        : ''}{' '}
                      guests
                    </dd>
                  </div>
                  {verticalSpecs(blueprint).map((spec) => (
                    <div key={spec.label} className="rounded-res-sm bg-res-surface p-3">
                      <dt className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        {spec.label}
                      </dt>
                      <dd className="type-res-body mt-1 font-semibold text-res-ink">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {blueprint.amenities.length > 0 && (
                  <div>
                    <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Extras & features
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {blueprint.amenities.map((amenity) => (
                        <span
                          key={amenity.id}
                          className="type-res-small rounded-full bg-res-surface px-3 py-1 font-medium text-res-ink-muted"
                        >
                          {amenity.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {blueprint.bookingPolicies.length > 0 && (
                  <div className="rounded-res-md bg-res-surface p-4">
                    <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      House rules
                    </p>
                    <ul className="type-res-small space-y-1.5 font-normal text-res-ink">
                      {blueprint.bookingPolicies.map((policy) => (
                        <li key={policy.id} className="flex gap-2">
                          <span className="mt-1.5 inline-block size-1 shrink-0 rounded-full bg-res-brand" />
                          {policy.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {blueprint.images.length > 1 && (
                  <div>
                    <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Photos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {blueprint.images.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          loading="lazy"
                          className="h-16 w-16 rounded-res-sm object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="type-res-h3 text-res-ink">
                    {kind}s ({units.length})
                  </h2>
                  {!planId && !plansQuery.isLoading && (
                    <span className="type-res-small font-normal text-res-ink-muted">
                      No floor map yet.
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setAddUnitOpen(true)}
                  className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-4 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand"
                >
                  <Plus size={13} /> Add {kind.toLowerCase()}
                </button>
              </div>

              {unitsQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-res-md bg-res-surface p-4">
                      <div className="h-4 w-1/2 animate-pulse rounded-full bg-res-card" />
                      <div className="mt-2 h-3 w-1/3 animate-pulse rounded-full bg-res-card" />
                    </div>
                  ))}
                </div>
              ) : units.length === 0 ? (
                <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
                  <p className="type-res-h3 text-res-ink">No {kind.toLowerCase()}s yet</p>
                  <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                    Add your first one to place it on the floor map.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {units.map((unit) => {
                    const meta = stateMetaFor(vertical, unit.state);
                    return (
                      <article
                        key={unit._id}
                        className="rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="type-res-h3 line-clamp-1 text-res-ink">
                              {kind} {unit.label}
                            </h3>
                            <p className="type-res-small line-clamp-1 font-normal text-res-ink-muted">
                              {unit.floorId || 'No floor'}
                              {unit.sectionId ? ` · ${unit.sectionId}` : ''}
                            </p>
                          </div>
                          <span
                            className="type-res-small shrink-0 rounded-full px-2.5 py-1 font-semibold"
                            style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </div>

                        <p className="type-res-small mt-3 font-normal text-res-ink-muted">
                          {unit.isReservable === false
                            ? 'Closed for booking'
                            : 'Open for booking'}
                        </p>

                        <button
                          onClick={() => setManageUnitId(unit._id)}
                          className="type-res-small mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-res-surface px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
                        >
                          <Settings2 size={13} /> Manage
                        </button>
                        <button
                          onClick={() => setEditUnit(unit)}
                          className="type-res-small mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-res-surface px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => handleShowQr(unit._id)}
                          disabled={qrMutation.isPending}
                          className="type-res-small mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-res-surface px-3 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:opacity-50"
                        >
                          <QrCodeIcon size={13} /> Quick-order QR
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

      <EditUnitModal
        unit={editUnit}
        kind={kind}
        floors={floors}
        sections={sections}
        onClose={() => setEditUnit(null)}
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

      <Dialog open={Boolean(qrToken)} onOpenChange={(open) => !open && setQrToken(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{kind} QR code</DialogTitle>
          </DialogHeader>
          {qrToken && (
            <div className="flex flex-col items-center gap-3">
              <QrCode value={`${window.location.origin}/q/${qrToken}`} size={200} />
              <p className="type-res-small max-w-[240px] break-all text-center font-normal text-res-ink-muted">
                {`${window.location.origin}/q/${qrToken}`}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
