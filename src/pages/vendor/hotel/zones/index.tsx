import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Building2, Clock, MapPin, Pause, Play, Trash2 } from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import {
  EmptyState,
  FIELD_CLASS,
  Field,
  InsetBlock,
  MODAL_CONTENT_CLASS,
  PAGE_BODY,
  PAGE_SHELL,
  PILL_DANGER,
  PILL_PRIMARY,
  PILL_QUIET,
  StatTile,
  SurfaceCard,
  TEXT_ACTION,
} from '@/components/dashboard/res-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  vendorLinkApi,
  type DeliveryZoneDto,
  type VendorLinkDto,
} from '@/services/vendorlink.service';
import { floorPlanService } from '@/services/floorPlan.service';
import type { FloorPlanDto } from '@/types';

interface UnitRef {
  _id: string;
  label: string;
}

type OutletDraft = Record<string, { dispatchPoint: string; etaMins: string }>;

function outletsFromZone(zone: DeliveryZoneDto): OutletDraft {
  const draft: OutletDraft = {};
  for (const o of zone.outlets) {
    draft[String(o.vendorLink)] = {
      dispatchPoint: o.dispatchPoint ?? '',
      etaMins: o.etaMins ? String(o.etaMins) : '',
    };
  }
  return draft;
}

function outletsPayload(draft: OutletDraft) {
  return Object.entries(draft).map(([vendorLink, o]) => ({
    vendorLink,
    dispatchPoint: o.dispatchPoint.trim() || undefined,
    etaMins: Number(o.etaMins) > 0 ? Number(o.etaMins) : undefined,
  }));
}

/** Outlets that serve a zone, with the dispatch point and prep time each needs. */
function OutletPicker({
  links,
  value,
  onChange,
}: {
  links: VendorLinkDto[];
  value: OutletDraft;
  onChange: (next: OutletDraft) => void;
}) {
  if (links.length === 0) {
    return (
      <p className="type-res-small font-normal text-res-ink-muted">
        Link an outlet from Linked outlets first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((link) => {
        const on = Boolean(value[link._id]);
        const name = link.outletName || link.counterpartName || 'Outlet';
        return (
          <div key={link._id} className="w-full rounded-res-md bg-res-card p-3.5">
            <div className="flex items-start gap-3">
              <Switch
                checked={on}
                onCheckedChange={(next) => {
                  const draft = { ...value };
                  if (next) {
                    draft[link._id] = {
                      dispatchPoint: '',
                      etaMins: String(link.defaultPrepEtaMins ?? ''),
                    };
                  } else {
                    delete draft[link._id];
                  }
                  onChange(draft);
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="type-res-body font-semibold text-res-ink">{name}</p>
                {link.counterpartName && (
                  <p className="type-res-small font-normal text-res-ink-muted">
                    {link.counterpartName}
                  </p>
                )}
              </div>
            </div>

            {on && (
              <div className="mt-3 grid w-full gap-3 sm:grid-cols-2">
                <Field label="Dispatch point" htmlFor={`dispatch-${link._id}`}>
                  <Input
                    id={`dispatch-${link._id}`}
                    value={value[link._id].dispatchPoint}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        [link._id]: { ...value[link._id], dispatchPoint: event.target.value },
                      })
                    }
                    placeholder="e.g. Kitchen pass 2"
                    className={FIELD_CLASS}
                  />
                </Field>
                <Field label="Prep time" htmlFor={`eta-${link._id}`} hint="Minutes, in this zone.">
                  <div className="relative w-full">
                    <Input
                      id={`eta-${link._id}`}
                      type="number"
                      min={1}
                      value={value[link._id].etaMins}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          [link._id]: { ...value[link._id], etaMins: event.target.value },
                        })
                      }
                      className={`${FIELD_CLASS} pr-12`}
                    />
                    <span className="type-res-small pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-normal text-res-ink-muted">
                      min
                    </span>
                  </div>
                </Field>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const roomCountText = (zone: DeliveryZoneDto) => {
  const picked = zone.unitIds.length;
  const range = zone.labelRange?.from ? `rooms ${zone.labelRange.from}–${zone.labelRange.to}` : null;
  const parts = [
    zone.kind === 'rooms' ? 'Rooms' : 'Common area',
    picked > 0 ? `${picked} ${picked === 1 ? 'room' : 'rooms'} selected` : null,
    range,
  ].filter(Boolean);
  return parts.join(' · ');
};

export default function HotelZonesPage() {
  const [zones, setZones] = useState<DeliveryZoneDto[]>([]);
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [units, setUnits] = useState<UnitRef[]>([]);
  const [loading, setLoading] = useState(true);

  // Create zone modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'rooms' | 'common_area'>('rooms');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [outlets, setOutlets] = useState<OutletDraft>({});
  const [saving, setSaving] = useState(false);

  // Edit zone state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOutlets, setEditOutlets] = useState<OutletDraft>({});

  const activeZoneCount = useMemo(() => zones.filter((z) => z.active).length, [zones]);
  const pausedZoneCount = useMemo(() => zones.filter((z) => !z.active).length, [zones]);

  const reloadZones = async () => setZones(await vendorLinkApi.zones());

  useEffect(() => {
    Promise.all([vendorLinkApi.zones(), vendorLinkApi.hotelLinks(), floorPlanService.list()])
      .then(([loadedZones, loadedLinks, loadedPlans]) => {
        setZones(loadedZones);
        setLinks(loadedLinks.filter((x) => x.status === 'active' || x.status === 'suspended'));
        const docs = loadedPlans.data?.items ?? [];
        setPlans(docs);
        if (docs[0]) setPlanId(docs[0]._id);
      })
      .catch(() => toast.error('Could not load your zones.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!planId) return;
    floorPlanService
      .getLayout(planId)
      .then((res) => {
        const list = (res.data?.units ?? []) as Array<{ _id: string; label?: string }>;
        setUnits(list.map((u) => ({ _id: u._id, label: u.label ?? u._id.slice(-4) })));
      })
      .catch(() => toast.error('Could not load the room list.'));
  }, [planId]);

  const toggleUnit = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const resetCreateForm = () => {
    setName('');
    setKind('rooms');
    setSelected(new Set());
    setOutlets({});
    setRangeFrom('');
    setRangeTo('');
  };

  const createZone = async () => {
    if (!name.trim() || (selected.size === 0 && (!rangeFrom || !rangeTo))) {
      toast.error('Name the zone, then pick its rooms or a room-number range.');
      return;
    }
    setSaving(true);
    try {
      await vendorLinkApi.createZone({
        name: name.trim(),
        kind,
        unitIds: [...selected],
        ...(rangeFrom && rangeTo ? { labelRange: { from: rangeFrom, to: rangeTo } } : {}),
        outlets: outletsPayload(outlets),
      });
      toast.success('Zone created.');
      resetCreateForm();
      setCreateOpen(false);
      await reloadZones();
    } catch {
      toast.error('Could not create the zone.');
    } finally {
      setSaving(false);
    }
  };

  const saveOutlets = async (zone: DeliveryZoneDto) => {
    setSaving(true);
    try {
      await vendorLinkApi.updateZone(zone._id, { outlets: outletsPayload(editOutlets) });
      toast.success('Zone outlets saved.');
      setEditingId(null);
      await reloadZones();
    } catch {
      toast.error('Could not save the outlets.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (zone: DeliveryZoneDto) => {
    try {
      await vendorLinkApi.updateZone(zone._id, { active: !zone.active });
      toast.success(zone.active ? 'Zone paused.' : 'Zone resumed.');
      await reloadZones();
    } catch {
      toast.error('Could not update the zone.');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this zone? Orders routed here stop immediately.')) return;
    try {
      await vendorLinkApi.deleteZone(id);
      toast.success('Zone deleted.');
      await reloadZones();
    } catch {
      toast.error('Could not delete the zone.');
    }
  };

  const outletName = (id: string) => {
    const link = links.find((x) => x._id === id);
    return link?.outletName || link?.counterpartName || 'Outlet';
  };

  const canCreate = Boolean(name.trim()) && (selected.size > 0 || Boolean(rangeFrom && rangeTo));

  return (
    <div className={PAGE_SHELL}>
      <div className={PAGE_BODY}>
        <DashboardPageHeader
          title="Delivery zones"
          subtitle="Group rooms and shared spaces so each one knows which kitchens can serve it."
          actions={
            <button type="button" onClick={() => setCreateOpen(true)} className={PILL_PRIMARY}>
              <Building2 className="size-4" strokeWidth={1.75} />
              Create zone
            </button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Zones"
            value={zones.length}
            icon={<Building2 className="size-[18px]" strokeWidth={1.75} />}
          />
          <StatTile
            label="Active"
            value={activeZoneCount}
            tone="positive"
            icon={<Play className="size-[18px]" strokeWidth={1.75} />}
          />
          <StatTile
            label="Paused"
            value={pausedZoneCount}
            tone="attention"
            icon={<Pause className="size-[18px]" strokeWidth={1.75} />}
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((key) => (
              <SurfaceCard key={key} className="px-5 py-5">
                <div className="h-4 w-1/3 animate-pulse rounded-full bg-res-surface" />
                <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-res-surface" />
                <div className="mt-4 h-10 w-full animate-pulse rounded-res-md bg-res-surface" />
              </SurfaceCard>
            ))}
          </div>
        ) : zones.length === 0 ? (
          <EmptyState
            icon={<MapPin className="size-6" strokeWidth={1.75} />}
            title="No zones yet"
            description="Create a zone to tell each room which kitchens can deliver to it."
            action={
              <button type="button" onClick={() => setCreateOpen(true)} className={PILL_PRIMARY}>
                <Building2 className="size-4" strokeWidth={1.75} />
                Create zone
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {zones.map((zone) => {
              const isEditing = editingId === zone._id;
              return (
                <SurfaceCard key={zone._id} as="article" className="px-5 pt-5 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="type-res-h3 truncate text-res-ink">{zone.name}</h3>
                        <span
                          className={`type-res-small shrink-0 rounded-full px-3 py-1 font-semibold ${
                            zone.active
                              ? 'bg-res-secondary text-res-brand'
                              : 'bg-res-surface text-res-ink-muted'
                          }`}
                        >
                          {zone.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                        {roomCountText(zone)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingId(null);
                          } else {
                            setEditingId(zone._id);
                            setEditOutlets(outletsFromZone(zone));
                          }
                        }}
                        className={PILL_QUIET}
                      >
                        {isEditing ? 'Close' : 'Outlets'}
                      </button>
                      <button type="button" onClick={() => void toggleActive(zone)} className={PILL_QUIET}>
                        {zone.active ? <Pause className="size-4" strokeWidth={1.75} /> : <Play className="size-4" strokeWidth={1.75} />}
                        {zone.active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(zone._id)}
                        aria-label={`Delete ${zone.name}`}
                        className={PILL_DANGER}
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    {zone.outlets.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {zone.outlets.map((outlet) => (
                          <span
                            key={String(outlet.vendorLink)}
                            className="type-res-small inline-flex items-center gap-1.5 rounded-full bg-res-surface px-3 py-1.5 font-medium text-res-ink"
                          >
                            {outletName(String(outlet.vendorLink))}
                            {outlet.etaMins ? (
                              <span className="inline-flex items-center gap-1 text-res-ink-muted">
                                <Clock className="size-3" strokeWidth={1.75} />
                                {outlet.etaMins} min
                              </span>
                            ) : null}
                            {outlet.dispatchPoint ? (
                              <span className="text-res-ink-muted">· {outlet.dispatchPoint}</span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="type-res-small font-normal text-res-ink-muted">
                        No outlets yet — guests here only see hotel services.
                      </p>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-4 border-t border-res-line pt-4">
                      <InsetBlock title={`Outlets serving ${zone.name}`}>
                        <OutletPicker links={links} value={editOutlets} onChange={setEditOutlets} />
                        <div className="mt-4 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={saving}
                            className={PILL_QUIET}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveOutlets(zone)}
                            disabled={saving}
                            className={PILL_PRIMARY}
                          >
                            {saving ? 'Saving…' : 'Save outlets'}
                          </button>
                        </div>
                      </InsetBlock>
                    </div>
                  )}
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Create zone */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={MODAL_CONTENT_CLASS}>
          <DialogHeader className="gap-1.5">
            <DialogTitle className="type-res-h3 text-res-ink">Create zone</DialogTitle>
            <DialogDescription className="type-res-small font-normal text-res-ink-muted">
              Pick the rooms or shared space, then say which outlets can serve them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <InsetBlock>
              <div className="space-y-3">
                <Field label="Zone name" htmlFor="zone-name">
                  <Input
                    id="zone-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={kind === 'rooms' ? 'e.g. Tower A 1xx' : 'e.g. Pool deck'}
                    className={FIELD_CLASS}
                  />
                </Field>

                <Field label="What it covers" htmlFor="zone-kind">
                  <Select value={kind} onValueChange={(v) => setKind(v as 'rooms' | 'common_area')}>
                    <SelectTrigger id="zone-kind" className={FIELD_CLASS}>
                      <SelectValue placeholder="Select what it covers" />
                    </SelectTrigger>
                    <SelectContent className="rounded-res-md">
                      <SelectItem value="rooms">Rooms</SelectItem>
                      <SelectItem value="common_area">Common area</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Floor map" htmlFor="zone-plan" hint="Rooms are read from this floor map.">
                  <Select value={planId} onValueChange={setPlanId}>
                    <SelectTrigger id="zone-plan" className={FIELD_CLASS}>
                      <SelectValue placeholder="Select a floor map" />
                    </SelectTrigger>
                    <SelectContent className="rounded-res-md">
                      {plans.map((plan) => (
                        <SelectItem key={plan._id} value={plan._id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </InsetBlock>

            <InsetBlock title="Rooms in this zone">
              <div className="max-h-44 overflow-y-auto rounded-res-md bg-res-card p-2">
                <div className="flex flex-wrap gap-1.5">
                  {units.map((unit) => {
                    const on = selected.has(unit._id);
                    return (
                      <button
                        key={unit._id}
                        type="button"
                        onClick={() => toggleUnit(unit._id)}
                        aria-pressed={on}
                        className={`type-res-small cursor-pointer rounded-full px-3 py-1.5 font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                          on
                            ? 'bg-res-brand text-res-ink-inverted'
                            : 'bg-res-surface text-res-ink hover:text-res-brand'
                        }`}
                      >
                        {unit.label}
                      </button>
                    );
                  })}
                  {units.length === 0 && (
                    <p className="type-res-small p-2 font-normal text-res-ink-muted">
                      No rooms on this floor map yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 grid w-full gap-3 sm:grid-cols-2">
                <Field label="Room numbers from" htmlFor="zone-from">
                  <Input
                    id="zone-from"
                    value={rangeFrom}
                    onChange={(event) => setRangeFrom(event.target.value)}
                    placeholder="100"
                    className={FIELD_CLASS}
                  />
                </Field>
                <Field label="Room numbers to" htmlFor="zone-to">
                  <Input
                    id="zone-to"
                    value={rangeTo}
                    onChange={(event) => setRangeTo(event.target.value)}
                    placeholder="199"
                    className={FIELD_CLASS}
                  />
                </Field>
              </div>

              {(selected.size > 0 || rangeFrom || rangeTo) && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(new Set());
                      setRangeFrom('');
                      setRangeTo('');
                    }}
                    className={TEXT_ACTION}
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </InsetBlock>

            <InsetBlock title="Outlets serving this zone">
              <OutletPicker links={links} value={outlets} onChange={setOutlets} />
            </InsetBlock>
          </div>

          <DialogFooter className="gap-2 border-t border-res-line pt-4 sm:flex-row">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
              className={PILL_QUIET}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void createZone()}
              disabled={saving || !canCreate}
              className={PILL_PRIMARY}
            >
              {saving ? 'Creating…' : 'Create zone'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
