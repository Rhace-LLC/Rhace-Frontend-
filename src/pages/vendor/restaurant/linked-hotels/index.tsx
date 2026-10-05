import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import {
  vendorLinkApi,
  type DeliveryZoneDto,
  type VendorLinkDto,
} from '@/services/vendorlink.service';

const ALL_SCOPES = ['read:menu', 'write:orders', 'read:delivery_locations'];

/** Phase 4 restaurant page: redeem pairing codes, consent scopes, view zones. */
export default function LinkedHotelsPage() {
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [scopes, setScopes] = useState<Set<string>>(new Set(ALL_SCOPES));
  const [zonesByLink, setZonesByLink] = useState<Record<string, DeliveryZoneDto[]>>({});

  const load = async () => {
    try {
      setLinks(await vendorLinkApi.partnerLinks());
    } catch {
      toast.error('Could not load linked hotels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleScope = (s: string) => {
    const next = new Set(scopes);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setScopes(next);
  };

  const redeem = async () => {
    if (!code.trim()) return;
    try {
      await vendorLinkApi.redeem(code.trim().toUpperCase(), [...scopes]);
      toast.success('Hotel linked');
      setCode('');
      await load();
    } catch {
      toast.error('Invalid or expired code.');
    }
  };

  const approve = async (id: string) => {
    try {
      await vendorLinkApi.approveLink(id);
      toast.success('Link approved');
      await load();
    } catch {
      toast.error('Could not approve the link.');
    }
  };

  const decline = async (id: string) => {
    try {
      await vendorLinkApi.declineLink(id);
      await load();
    } catch {
      toast.error('Could not decline the link.');
    }
  };

  const showZones = async (id: string) => {
    if (zonesByLink[id]) {
      setZonesByLink((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const zones = await vendorLinkApi.linkZones(id);
      setZonesByLink((m) => ({ ...m, [id]: zones }));
    } catch {
      toast.error('Could not load delivery zones.');
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Linked hotels"
        subtitle="Hotels that can route room orders to your kitchen."
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="font-semibold">Redeem a pairing code</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="8-character code"
          maxLength={8}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm tracking-widest"
        />
        <p className="mt-2 text-xs font-semibold text-gray-500">Scopes you grant</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {ALL_SCOPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleScope(s)}
              className={`rounded-full px-3 py-1.5 font-mono text-xs ${
                scopes.has(s) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={redeem}
          disabled={!code.trim()}
          className="mt-3 w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Link hotel
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : links.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No linked hotels yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{link.counterpartName || 'Hotel'}</p>
                  <p className="text-xs text-gray-500">
                    {link.outletName ? `Listed as “${link.outletName}” · ` : ''}
                    {link.status} · scopes: {link.scopes.join(', ') || '—'}
                    {link.status === 'active' && link.commission?.value
                      ? ` · hotel commission ${
                          link.commission.kind === 'flat'
                            ? `${link.commission.value} per order`
                            : `${link.commission.value}%`
                        }`
                      : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {link.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => approve(link._id)}
                        className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => decline(link._id)}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {link.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => showZones(link._id)}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold"
                    >
                      {zonesByLink[link._id] ? 'Hide zones' : 'Delivery zones'}
                    </button>
                  )}
                </div>
              </div>
              {zonesByLink[link._id] && (
                <ul className="mt-2 space-y-1 rounded-xl bg-slate-50 p-2 text-sm">
                  {zonesByLink[link._id].map((z) => (
                    <li key={z._id} className="flex justify-between gap-2 px-1">
                      <span>
                        {z.name} · {z.unitIds.length} unit(s)
                      </span>
                      <span className="text-xs text-gray-500">
                        {z.outlets.find((o) => String(o.vendorLink) === link._id)?.dispatchPoint ||
                          'dispatch'}
                        {' · '}
                        {z.outlets.find((o) => String(o.vendorLink) === link._id)?.etaMins ?? '—'} min
                      </span>
                    </li>
                  ))}
                  {zonesByLink[link._id].length === 0 && (
                    <li className="px-1 text-xs text-gray-400">No zones assigned yet.</li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
