import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { vendorLinkApi, type VendorLinkDto } from '@/services/vendorlink.service';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  revoked: 'bg-gray-100 text-gray-500',
};

/** Phase 4 hotel page: linked outlets (pairing code, email invite, config, revoke). */
export default function HotelOutletsPage() {
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [outletName, setOutletName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [lastCode, setLastCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      setLinks(await vendorLinkApi.hotelLinks());
    } catch {
      toast.error('Could not load linked outlets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const generate = async () => {
    try {
      setBusy(true);
      const res = await vendorLinkApi.pairingCode(outletName.trim() || undefined);
      setLastCode({ code: res.code, expiresAt: res.expiresAt });
      setOutletName('');
      toast.success('Pairing code generated — valid 24h');
      await load();
    } catch {
      toast.error('Could not generate a pairing code.');
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      setBusy(true);
      await vendorLinkApi.invite({ email: inviteEmail.trim(), outletName: outletName.trim() || undefined });
      setInviteEmail('');
      toast.success('Invite sent by email');
      await load();
    } catch {
      toast.error('Could not send the invite.');
    } finally {
      setBusy(false);
    }
  };

  const saveCommission = async (link: VendorLinkDto) => {
    const value = Number(editingCommission[link._id]);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid commission.');
      return;
    }
    try {
      await vendorLinkApi.updateLink(link._id, { commission: { value } });
      toast.success('Commission updated');
      await load();
    } catch {
      toast.error('Could not update commission.');
    }
  };

  const setStatus = async (link: VendorLinkDto, status: 'active' | 'suspended') => {
    try {
      await vendorLinkApi.updateLink(link._id, { status });
      toast.success(`Outlet ${status}`);
      await load();
    } catch {
      toast.error('Could not update the outlet.');
    }
  };

  const revoke = async (link: VendorLinkDto) => {
    if (!window.confirm(`Revoke "${link.outletName || 'this outlet'}"? Orders will stop flowing.`)) return;
    try {
      await vendorLinkApi.revokeLink(link._id);
      toast.success('Outlet revoked');
      await load();
    } catch {
      toast.error('Could not revoke the outlet.');
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Linked outlets"
        subtitle="Pair restaurants, bars and lounges to this hotel for in-room ordering."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="font-semibold">Generate pairing code</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Share it with the restaurant — single use, expires in 24 hours.
          </p>
          <input
            value={outletName}
            onChange={(e) => setOutletName(e.target.value)}
            placeholder="Outlet name (e.g. Pool Bar)"
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="mt-2 w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Generate code
          </button>
          {lastCode && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-center">
              <p className="font-mono text-2xl font-bold tracking-widest">{lastCode.code}</p>
              <p className="text-xs text-gray-500">
                Expires {new Date(lastCode.expiresAt).toLocaleString()}
              </p>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(lastCode.code)}
                className="mt-1 text-xs font-semibold text-blue-600"
              >
                Copy
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="font-semibold">Invite by email</p>
          <p className="mt-0.5 text-xs text-gray-500">
            The restaurant gets the pairing code by email.
          </p>
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="restaurant@example.com"
            type="email"
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={invite}
            disabled={busy || !inviteEmail.trim()}
            className="mt-2 w-full rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Send invite
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No linked outlets yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{link.outletName || 'Unnamed outlet'}</p>
                  <p className="text-xs text-gray-500">
                    {link.counterpartName
                      ? `${link.counterpartName} · `
                      : link.status === 'pending'
                        ? 'Waiting for the outlet to redeem the code · '
                        : ''}
                    Scopes: {link.scopes.join(', ') || '—'}
                    {link.invitedEmail ? ` · invited ${link.invitedEmail}` : ''}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[link.status]}`}
                >
                  {link.status}
                </span>
              </div>
              {link.status !== 'revoked' && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    Commission %
                    <input
                      type="number"
                      min={0}
                      value={editingCommission[link._id] ?? String(link.commission.value)}
                      onChange={(e) =>
                        setEditingCommission((m) => ({ ...m, [link._id]: e.target.value }))
                      }
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => saveCommission(link)}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold"
                  >
                    Save
                  </button>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    Prep ETA (min)
                    <input
                      type="number"
                      min={1}
                      defaultValue={link.defaultPrepEtaMins}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v > 0) {
                          vendorLinkApi
                            .updateLink(link._id, { defaultPrepEtaMins: v })
                            .then(() => toast.success('ETA updated'))
                            .catch(() => toast.error('Could not update ETA.'));
                        }
                      }}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                  </label>
                  {/* Only the outlet can activate a link; the hotel pauses/resumes approved ones. */}
                  {link.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => setStatus(link, 'suspended')}
                      className="rounded-full border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600"
                    >
                      Suspend
                    </button>
                  )}
                  {link.status === 'suspended' && (
                    <button
                      type="button"
                      onClick={() => setStatus(link, 'active')}
                      className="rounded-full border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-600"
                    >
                      Reactivate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => revoke(link)}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                  >
                    Revoke
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
