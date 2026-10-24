import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Clock,
  MapPin,
  Play,
  Pause,
  Trash2,
  Building2,
} from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

function OutletPicker({
  links,
  value,
  onChange,
}: {
  links: VendorLinkDto[];
  value: OutletDraft;
  onChange: (next: OutletDraft) => void;
}) {
  if (links.length === 0) return (
    <p className="type-res-small text-res-ink-muted">Link an active outlet first.</p>
  );
  return (
    <div className="space-y-2">
      {links.map((l) => {
        const on = Boolean(value[l._id]);
        return (
          <div key={l._id} className="flex items-start gap-3">
            <Switch
              checked={on}
              onCheckedChange={(next) => {
                const nxt = { ...value };
                if (next) {
                  nxt[l._id] = {
                    dispatchPoint: '',
                    etaMins: String(l.defaultPrepEtaMins ?? ''),
                  };
                } else {
                  delete nxt[l._id];
                }
                onChange(nxt);
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="type-res-body text-res-ink font-medium">
                {l.outletName || l.counterpartName || 'Outlet'}
              </p>
              <p className="type-res-small text-res-ink-muted">
                {l.counterpartName ?? ''}
              </p>
            </div>
            {on && (
              <div className="flex gap-2 min-w-0">
                <Input
                  value={value[l._id].dispatchPoint}
                  onChange={(e) =>
                    onChange({ ...value, [l._id]: { ...value[l._id], dispatchPoint: e.target.value } })
                  }
                  placeholder="Dispatch point (e.g. Kitchen pass 2)"
                  className="flex-1 text-sm"
                />
                <div className="flex items-end gap-1">
                  <Input
                    type="number"
                    min={1}
                    value={value[l._id].etaMins}
                    onChange={(e) =>
                      onChange({ ...value, [l._id]: { ...value[l._id], etaMins: e.target.value } })
                    }
                    className="w-16 text-sm"
                  />
                  <span className="type-res-small text-res-ink-muted">min</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HotelZonesPage() {
  const [zones, setZones] = useState<DeliveryZoneDto[]>([]);
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [units, setUnits] = useState<UnitRef[]>([]);
  const [loading, setLoading] = useState(true);

  // Create zone modal state
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
      .then(([z, l, p]) => {
        setZones(z);
        setLinks(l.filter((x) => x.status === 'active' || x.status === 'suspended'));
        const docs = p.data?.items ?? [];
        setPlans(docs);
        if (docs[0]) setPlanId(docs[0]._id);
      })
      .catch(() => toast.error('Could not load zones.'))
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

  const createZone = async () => {
    if (!name.trim() || (selected.size === 0 && (!rangeFrom || !rangeTo))) {
      toast.error('Name the zone and pick rooms or a label range.');
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
      toast.success('Zone created');
      setName('');
      setSelected(new Set());
      setOutlets({});
      setRangeFrom('');
      setRangeTo('');
      setPlanId('');
      setUnits([]);
      setCreateOpen(false);
      await reloadZones();
    } catch {
      toast.error('Could not create the zone.');
    } finally {
      setSaving(false);
    }
  };

  const saveOutlets = async (zone: DeliveryZoneDto) => {
    try {
      await vendorLinkApi.updateZone(zone._id, { outlets: outletsPayload(editOutlets) });
      toast.success('Zone outlets updated');
      setEditingId(null);
      await reloadZones();
    } catch {
      toast.error('Could not update the zone.');
    }
  };

  const toggleActive = async (zone: DeliveryZoneDto) => {
    try {
      await vendorLinkApi.updateZone(zone._id, { active: !zone.active });
      toast.success(zone.active ? 'Zone paused' : 'Zone resumed');
      await reloadZones();
    } catch {
      toast.error('Could not update the zone.');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this zone? Orders routed here will stop.')) return;
    try {
      await vendorLinkApi.deleteZone(id);
      toast.success('Zone deleted');
      await reloadZones();
    } catch {
      toast.error('Could not delete the zone.');
    }
  };

  const outletName = (id: string) => {
    const l = links.find((x) => x._id === id);
    return l?.outletName || l?.counterpartName || 'Outlet';
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardPageHeader
        title="Delivery zones"
        subtitle="Map rooms and common areas to outlet kitchens for order dispatch."
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
          >
            <Building2 className="size-4 mr-1" />
            Create zone
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total zones" value={zones.length} icon={<Building2 className="size-5 text-res-ink-muted" />} />
        <StatCard label="Active" value={activeZoneCount} icon={<Play className="size-5 text-emerald-600" />} />
        <StatCard label="Paused" value={pausedZoneCount} icon={<Pause className="size-5 text-amber-600" />} />
      </div>

      {/* Zone list */}
      <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
        <CardHeader className="pb-3">
          <CardTitle className="type-res-body text-res-ink font-semibold">Your zones</CardTitle>
          <CardDescription>
            Pause a zone to stop orders there; delete to remove it entirely.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="p-8">
              <div className="h-16 w-48 animate-pulse rounded-res-md bg-res-surface" />
            </div>
          ) : zones.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-res-surface mb-4">
                <MapPin className="h-8 w-8 text-res-ink-muted" />
              </div>
              <h3 className="type-res-h3 text-res-ink">No zones yet</h3>
              <p className="mt-2 type-res-body text-res-ink-muted max-w-sm mx-auto">
                Create a zone to map rooms or common areas to outlet kitchens.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((z) => (
                <Card key={z._id} className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
                  <CardHeader className="grid grid-cols-3 items-start gap-3 pb-3">
                    <div className="col-span-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="type-res-body text-res-ink font-semibold">{z.name}</p>
                        {!z.active && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border bg-slate-50 text-slate-700 border-slate-100">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="type-res-small text-res-ink-muted mt-1">
                        {z.kind === 'rooms' ? 'Rooms' : 'Common area'} · {z.unitIds.length} unit{z.unitIds.length === 1 ? '' : 's'}
                        {z.labelRange?.from ? ` · range ${z.labelRange.from}–${z.labelRange.to}` : ''}
                      </p>
                      {z.outlets.length > 0 && (
                        <p className="type-res-small text-res-ink-muted mt-1">
                          {z.outlets
                            .map(
                              (o) =>
                                `${outletName(String(o.vendorLink))}${o.etaMins ? ` · ${o.etaMins} min` : ''}${
                                  o.dispatchPoint ? ` · ${o.dispatchPoint}` : ''
                                }`,
                            )
                            .join(' | ')}
                        </p>
                      )}
                      {z.outlets.length === 0 && (
                        <p className="type-res-small text-res-ink-muted mt-1">
                          No outlets yet — guests here only see hotel services.
                        </p>
                      )}
                    </div>
                    <div className="col-start-3 self-start flex gap-2">
                      <Button
                        onClick={() => {
                          if (editingId === z._id) setEditingId(null);
                          else {
                            setEditingId(z._id);
                            setEditOutlets(outletsFromZone(z));
                          }
                        }}
                        variant="outline"
                        size="sm"
                      >
                        {editingId === z._id ? 'Close' : 'Edit outlets'}
                      </Button>
                      <Button
                        onClick={() => toggleActive(z)}
                        variant="outline"
                        size="sm"
                      >
                        {z.active ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        onClick={() => remove(z._id)}
                        variant="destructive"
                        size="sm"
                        className="text-red-600 border-red-100 hover:bg-red-50"
                      >
                        <Trash2 className="size-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardHeader>

                  {editingId === z._id && (
                    <CardContent className="pt-0 border-t border-res-line">
                      <div className="space-y-3">
                        <p className="type-res-caption text-res-ink-muted uppercase tracking-wider mb-2">
                          Outlets serving {z.name}
                        </p>
                        <OutletPicker links={links} value={editOutlets} onChange={setEditOutlets} />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => saveOutlets(z)}
                            disabled={saving}
                            className="bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
                          >
                            Save outlets
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create zone modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create zone</DialogTitle>
            <DialogDescription>
              Select rooms or a label range, then assign the outlets that serve them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Zone name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={kind === 'rooms' ? 'e.g. Tower A 1xx' : 'e.g. Pool deck'}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Type</label>
                <Select value={kind} onValueChange={(v) => setKind(v as 'rooms' | 'common_area')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rooms">Rooms</SelectItem>
                    <SelectItem value="common_area">Common area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Floor plan</label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSelected(new Set());
                    setRangeFrom('');
                    setRangeTo('');
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Rooms / units</label>
              <div className="mt-1 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-xl bg-res-surface p-2">
                {units.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => toggleUnit(u._id)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      selected.has(u._id) ? 'bg-res-brand text-res-ink-inverted' : 'bg-res-card text-res-ink border border-res-line'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
                {units.length === 0 && <p className="type-res-small text-res-ink-muted">No units on this plan.</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Or label range</label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  placeholder="100"
                  className="w-20 text-sm"
                />
                <span className="type-res-small text-res-ink-muted self-center">→</span>
                <Input
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  placeholder="199"
                  className="w-20 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Outlets serving this zone</label>
              <OutletPicker links={links} value={outlets} onChange={setOutlets} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setCreateOpen(false)}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={createZone}
              disabled={saving || !name.trim() || (selected.size === 0 && (!rangeFrom || !rangeTo))}
              className="bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
            >
              {saving ? 'Creating…' : 'Create zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="type-res-caption text-res-ink-muted uppercase tracking-wider">{label}</p>
          <p className="mt-1 type-res-h3 text-res-ink font-semibold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-res-surface">
          {icon}
        </div>
      </div>
    </Card>
  );
}
