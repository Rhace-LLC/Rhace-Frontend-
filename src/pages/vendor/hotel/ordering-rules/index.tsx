import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { money } from '@/features/orders/money';
import {
  vendorLinkApi,
  type FeeRuleDto,
  type OrderingWindowDto,
  type VendorLinkDto,
} from '@/services/vendorlink.service';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const inputClass = 'rounded-xl border border-slate-200 px-3 py-2 text-sm';

/** Phase 4 hotel page: ordering windows (weekly grid) + fee rules + preview. */
export default function HotelOrderingRulesPage() {
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [windows, setWindows] = useState<OrderingWindowDto[]>([]);
  const [fees, setFees] = useState<FeeRuleDto[]>([]);
  const [linkFilter, setLinkFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // window form
  const [wName, setWName] = useState('');
  const [wMode, setWMode] = useState<'allow' | 'block'>('allow');
  const [wStart, setWStart] = useState('23:00');
  const [wEnd, setWEnd] = useState('06:00');
  const [wDays, setWDays] = useState<Set<string>>(new Set(DAYS));
  // fee form
  const [fLabel, setFLabel] = useState('');
  const [fKind, setFKind] = useState<'flat' | 'percent'>('flat');
  const [fValue, setFValue] = useState('');
  const [fSource, setFSource] = useState<'hotel' | 'linked' | ''>('');
  const [fFulfillment, setFFulfillment] = useState<'room' | 'location' | ''>('');
  // preview
  const [sample, setSample] = useState('10000');
  const [previewMode, setPreviewMode] = useState<'room' | 'location'>('room');
  const [preview, setPreview] = useState<Array<{ label: string; amount: number }> | null>(null);

  const load = async () => {
    try {
      const [l, w, f] = await Promise.all([
        vendorLinkApi.hotelLinks(),
        vendorLinkApi.windows(),
        vendorLinkApi.fees(),
      ]);
      setLinks(l.filter((x) => x.status === 'active'));
      setWindows(w);
      setFees(f);
    } catch {
      toast.error('Could not load ordering rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleDay = (d: string) => {
    const next = new Set(wDays);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setWDays(next);
  };

  const createWindow = async () => {
    if (!wName.trim()) return;
    try {
      await vendorLinkApi.createWindow({
        name: wName.trim(),
        mode: wMode,
        start: wStart,
        end: wEnd,
        days: [...wDays],
        ...(linkFilter ? { vendorLink: linkFilter } : {}),
      });
      toast.success('Window saved');
      setWName('');
      await load();
    } catch {
      toast.error('Could not save the window.');
    }
  };

  const createFee = async () => {
    if (!fLabel.trim() || !fValue) return;
    try {
      await vendorLinkApi.createFee({
        label: fLabel.trim(),
        kind: fKind,
        value: Number(fValue),
        scope: {
          ...(fSource ? { sources: [fSource] } : {}),
          ...(fFulfillment ? { fulfillment: [fFulfillment] } : {}),
          ...(linkFilter ? { vendorLinks: [linkFilter] } : {}),
        },
      });
      toast.success('Fee rule saved');
      setFLabel('');
      setFValue('');
      await load();
    } catch {
      toast.error('Could not save the fee rule.');
    }
  };

  const runPreview = async () => {
    try {
      const res = await vendorLinkApi.previewFees({
        subtotal: Number(sample) || 0,
        source: linkFilter ? 'linked' : 'hotel',
        fulfillmentMode: previewMode,
        ...(linkFilter ? { vendorLinkId: linkFilter } : {}),
      });
      setPreview(res.fees);
    } catch {
      toast.error('Could not preview fees.');
    }
  };

  // Windows are per scope: hotel services (no link) or one outlet.
  const shownWindows = windows.filter((w) =>
    linkFilter ? String(w.vendorLink ?? '') === linkFilter : !w.vendorLink,
  );

  const toggleWindow = (w: OrderingWindowDto) =>
    vendorLinkApi
      .updateWindow(w._id, { active: !w.active })
      .then(load)
      .catch(() => toast.error('Update failed.'));
  const toggleFee = (f: FeeRuleDto) =>
    vendorLinkApi
      .updateFee(f._id, { active: !f.active })
      .then(load)
      .catch(() => toast.error('Update failed.'));
  const linkName = (id: string) => {
    const l = links.find((x) => x._id === id);
    return l?.outletName || l?.counterpartName || 'Outlet';
  };
  const feeScope = (f: FeeRuleDto) =>
    [
      f.scope?.sources?.length ? f.scope.sources.map((x) => (x === 'hotel' ? 'hotel services' : 'outlets')).join('/') : 'all sources',
      f.scope?.fulfillment?.length ? `to ${f.scope.fulfillment.join('/')}` : 'any delivery',
      f.scope?.vendorLinks?.length ? f.scope.vendorLinks.map(linkName).join(', ') : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Ordering windows & fees"
        subtitle="Control when guests can order and what surcharges apply."
        actions={
          <select
            value={linkFilter}
            onChange={(e) => setLinkFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">Hotel services</option>
            {links.map((l) => (
              <option key={l._id} value={l._id}>
                {l.outletName || 'Outlet'}
              </option>
            ))}
          </select>
        }
      />

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="font-semibold">Ordering windows</p>
            <p className="mt-0.5 text-xs text-gray-500">
              With any <strong>allow</strong> window, ordering is only open inside allow windows.
              <strong> Block</strong> windows close ordering; the higher priority wins. Overnight
              windows (e.g. 23:00–06:00) belong to the day they start.
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <input
                value={wName}
                onChange={(e) => setWName(e.target.value)}
                placeholder="e.g. Night Room Service"
                className={inputClass}
              />
              <select value={wMode} onChange={(e) => setWMode(e.target.value as 'allow' | 'block')} className={inputClass}>
                <option value="allow">Allow</option>
                <option value="block">Block</option>
              </select>
              <input type="time" value={wStart} onChange={(e) => setWStart(e.target.value)} className={inputClass} />
              <input type="time" value={wEnd} onChange={(e) => setWEnd(e.target.value)} className={inputClass} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    wDays.has(d) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={createWindow}
              className="mt-3 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Add window
            </button>
            <ul className="mt-3 space-y-1.5">
              {shownWindows.map((w) => (
                <li
                  key={w._id}
                  className={`flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ${w.active ? '' : 'opacity-50'}`}
                >
                  <span>
                    <strong>{w.name}</strong> · {w.mode} · {w.start}–{w.end} ·{' '}
                    {w.days.length ? w.days.map((d) => d.slice(0, 3)).join(', ') : 'every day'}
                  </span>
                  <span className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggleWindow(w)}
                    className="text-xs font-semibold text-slate-700"
                  >
                    {w.active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => vendorLinkApi.deleteWindow(w._id).then(load).catch(() => toast.error('Delete failed.'))}
                    className="text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                  </span>
                </li>
              ))}
              {shownWindows.length === 0 && <p className="text-xs text-gray-400">No windows yet.</p>}
            </ul>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="font-semibold">Fee rules</p>
            <div className="mt-2 grid gap-2 md:grid-cols-5">
              <input value={fLabel} onChange={(e) => setFLabel(e.target.value)} placeholder="e.g. Tray Charge" className={inputClass} />
              <select value={fKind} onChange={(e) => setFKind(e.target.value as 'flat' | 'percent')} className={inputClass}>
                <option value="flat">Flat</option>
                <option value="percent">Percent</option>
              </select>
              <input value={fValue} onChange={(e) => setFValue(e.target.value)} placeholder={fKind === 'flat' ? '500' : '15'} type="number" min={0} className={inputClass} />
              <select value={fSource} onChange={(e) => setFSource(e.target.value as '' | 'hotel' | 'linked')} className={inputClass}>
                <option value="">All sources</option>
                <option value="hotel">Hotel services</option>
                <option value="linked">Linked outlets</option>
              </select>
              <select value={fFulfillment} onChange={(e) => setFFulfillment(e.target.value as '' | 'room' | 'location')} className={inputClass}>
                <option value="">Any fulfillment</option>
                <option value="room">To room</option>
                <option value="location">To location</option>
              </select>
            </div>
            <button
              type="button"
              onClick={createFee}
              className="mt-3 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Add fee rule
            </button>
            <ul className="mt-3 space-y-1.5">
              {fees.map((f) => (
                <li
                  key={f._id}
                  className={`flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ${f.active ? '' : 'opacity-50'}`}
                >
                  <span>
                    <strong>{f.label}</strong> · {f.kind === 'flat' ? money(f.value) : `${f.value}%`} ·{' '}
                    to {f.beneficiary}
                    <span className="block text-xs text-gray-500">{feeScope(f)}</span>
                  </span>
                  <span className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggleFee(f)}
                    className="text-xs font-semibold text-slate-700"
                  >
                    {f.active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => vendorLinkApi.deleteFee(f._id).then(load).catch(() => toast.error('Delete failed.'))}
                    className="text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                  </span>
                </li>
              ))}
              {fees.length === 0 && <p className="text-xs text-gray-400">No fee rules yet.</p>}
            </ul>
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-gray-500">
                Preview on a sample {linkFilter ? `${linkName(linkFilter)} ` : 'hotel services '}order
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <input value={sample} onChange={(e) => setSample(e.target.value)} type="number" min={0} className={`${inputClass} w-32`} />
                <select
                  value={previewMode}
                  onChange={(e) => setPreviewMode(e.target.value as 'room' | 'location')}
                  className={inputClass}
                >
                  <option value="room">To room</option>
                  <option value="location">To location</option>
                </select>
                <button type="button" onClick={runPreview} className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold shadow">
                  Preview
                </button>
              </div>
              {preview && (
                <ul className="mt-2 space-y-1 text-sm">
                  {preview.map((p) => (
                    <li key={p.label} className="flex justify-between">
                      <span>{p.label}</span>
                      <span className="font-semibold">{money(p.amount)}</span>
                    </li>
                  ))}
                  {preview.length === 0 && <li className="text-xs text-gray-400">No fees apply.</li>}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
