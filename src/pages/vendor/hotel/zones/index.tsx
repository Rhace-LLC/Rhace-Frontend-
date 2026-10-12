import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { floorPlanService } from '@/services/floorPlan.service';
import {
  vendorLinkApi,
  type DeliveryZoneDto,
  type VendorLinkDto,
} from '@/services/vendorlink.service';
import type { FloorPlanDto } from '@/types';

interface UnitRef {
  _id: string;
  label: string;
}

/** Outlet serving a zone: dispatch point + ETA, keyed by vendor link id. */
type OutletDraft = Record<string, { dispatchPoint: string; etaMins: string }>;

const inputClass = 'rounded-lg border border-slate-200 px-2 py-1 text-sm';

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

/** Pick outlets for a zone and set each one's dispatch point + ETA. */
function OutletPicker({
  links,
  value,
  onChange,
}: {
  links: VendorLinkDto[];
  value: OutletDraft;
  onChange: (next: OutletDraft) => void;
}) {
  if (links.length === 0) return <p className="text-xs text-gray-400">Link an outlet first.</p>;
  return (
    <div className="space-y-1.5">
      {links.map((l) => {
        const on = Boolean(value[l._id]);
        return (
          <div key={l._id} className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = { ...value };
                if (on) delete next[l._id];
                else next[l._id] = { dispatchPoint: '', etaMins: String(l.defaultPrepEtaMins ?? '') };
                onChange(next);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {l.outletName || l.counterpartName || 'Outlet'}
            </button>
            {on && (
              <>
                <input
                  value={value[l._id].dispatchPoint}
                  onChange={(e) =>
                    onChange({ ...value, [l._id]: { ...value[l._id], dispatchPoint: e.target.value } })
                  }
                  placeholder="Dispatch point (e.g. Kitchen pass 2)"
                  className={`${inputClass} w-56`}
                />
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  ETA
                  <input
                    type="number"
                    min={1}
                    value={value[l._id].etaMins}
                    onChange={(e) =>
                      onChange({ ...value, [l._id]: { ...value[l._id], etaMins: e.target.value } })
                    }
                    className={`${inputClass} w-16`}
                  />
                  min
                </label>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Phase 4 hotel page: delivery zones (rooms/areas → outlet dispatch). */
export default function HotelZonesPage() {
  const [zones, setZones] = useState<DeliveryZoneDto[]>([]);
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [units, setUnits] = useState<UnitRef[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<'rooms' | 'common_area'>('rooms');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [outlets, setOutlets] = useState<OutletDraft>({});
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOutlets, setEditOutlets] = useState<OutletDraft>({});

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

  const create = async () => {
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
      toast.success('Zone updated');
      setEditingId(null);
      await reloadZones();
    } catch {
      toast.error('Could not update the zone.');
    }
  };

  const toggleActive = async (zone: DeliveryZoneDto) => {
    try {
      await vendorLinkApi.updateZone(zone._id, { active: !zone.active });
      await reloadZones();
    } catch {
      toast.error('Could not update the zone.');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this zone?')) return;
    try {
      await vendorLinkApi.deleteZone(id);
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
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Delivery zones"
        subtitle="Map room ranges and common areas (pool, cabanas, lobby) to outlet kitchens."
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="font-semibold">New zone</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === 'rooms' ? 'Zone name (e.g. Tower A 1xx)' : 'Location name (e.g. Pool deck)'}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as 'rooms' | 'common_area')}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="rooms">Rooms</option>
            <option value="common_area">Common area (guests can pick it at checkout)</option>
          </select>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-3 text-xs font-semibold text-gray-500">Rooms / units</p>
        <div className="mt-1 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-xl bg-slate-50 p-2">
          {units.map((u) => (
            <button
              key={u._id}
              type="button"
              onClick={() => toggleUnit(u._id)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                selected.has(u._id) ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
              }`}
            >
              {u.label}
            </button>
          ))}
          {units.length === 0 && <p className="text-xs text-gray-400">No units on this plan.</p>}
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
          or label range
          <input
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
            placeholder="100"
            className={`${inputClass} w-20`}
          />
          →
          <input
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
            placeholder="199"
            className={`${inputClass} w-20`}
          />
        </div>

        <p className="mt-3 text-xs font-semibold text-gray-500">Outlets serving this zone</p>
        <div className="mt-1">
          <OutletPicker links={links} value={outlets} onChange={setOutlets} />
        </div>

        <button
          type="button"
          onClick={create}
          disabled={saving}
          className="mt-3 w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create zone'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {zones.map((z) => (
            <li
              key={z._id}
              className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${z.active ? '' : 'opacity-60'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {z.name}
                    {!z.active && <span className="ml-2 text-xs font-normal text-gray-500">paused</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {z.kind === 'rooms' ? 'Rooms' : 'Common area'} · {z.unitIds.length} unit(s)
                    {z.labelRange?.from ? ` · range ${z.labelRange.from}–${z.labelRange.to}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {z.outlets.length
                      ? z.outlets
                          .map(
                            (o) =>
                              `${outletName(String(o.vendorLink))}${o.etaMins ? ` · ${o.etaMins} min` : ''}${
                                o.dispatchPoint ? ` · ${o.dispatchPoint}` : ''
                              }`,
                          )
                          .join(' | ')
                      : 'No outlets yet — guests here only see hotel services.'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingId === z._id) {
                        setEditingId(null);
                      } else {
                        setEditingId(z._id);
                        setEditOutlets(outletsFromZone(z));
                      }
                    }}
                    className="text-xs font-semibold text-slate-700"
                  >
                    {editingId === z._id ? 'Close' : 'Edit outlets'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(z)}
                    className="text-xs font-semibold text-slate-700"
                  >
                    {z.active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(z._id)}
                    className="text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editingId === z._id && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <OutletPicker links={links} value={editOutlets} onChange={setEditOutlets} />
                  <button
                    type="button"
                    onClick={() => saveOutlets(z)}
                    className="mt-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    Save outlets
                  </button>
                </div>
              )}
            </li>
          ))}
          {zones.length === 0 && (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              No zones yet. Outlets only deliver to rooms and areas inside a zone.
            </p>
          )}
        </ul>
      )}
    </div>
  );
}
