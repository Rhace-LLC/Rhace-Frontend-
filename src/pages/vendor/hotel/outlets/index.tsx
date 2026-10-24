import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CheckCircle2,
  Clock,
  Link,
  Mail,
  MapPin,
  Percent,
  Shield,
  Trash2,
  UserPlus,
} from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { vendorLinkApi, type VendorLinkDto } from '@/services/vendorlink.service';

const SCOPE_CONFIG: Record<string, { label: string; description: string }> = {
  'read:menu': {
    label: 'Menu Access',
    description: 'Outlet guests can view your active kitchen menu.',
  },
  'write:orders': {
    label: 'Room Ordering',
    description: 'Front desk can route direct kitchen tickets.',
  },
  'read:delivery_locations': {
    label: 'Delivery Routing',
    description: 'Share dispatch locations for accurate ETAs.',
  },
};

const ALL_SCOPES = ['read:menu', 'write:orders', 'read:delivery_locations'] as const;

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  suspended: { label: 'Suspended', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' },
  revoked: { label: 'Revoked', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
};

export default function HotelOutletsPage() {
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [outletName, setOutletName] = useState('');
  const [lastCode, setLastCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Record<string, string>>({});
  const [editingEta, setEditingEta] = useState<Record<string, string>>({});

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteOutletName, setInviteOutletName] = useState('');

  const activeCount = useMemo(() => links.filter((l) => l.status === 'active').length, [links]);
  const pendingCount = useMemo(() => links.filter((l) => l.status === 'pending').length, [links]);
  const suspendedCount = useMemo(() => links.filter((l) => l.status === 'suspended').length, [links]);

  const load = useCallback(async () => {
    try {
      setLinks(await vendorLinkApi.hotelLinks());
    } catch {
      toast.error('Could not load linked outlets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await vendorLinkApi.pairingCode(outletName.trim() || undefined);
      setLastCode({ code: res.code, expiresAt: res.expiresAt });
      setOutletName('');
      toast.success('Pairing code generated — valid 24 hours');
      await load();
    } catch {
      toast.error('Could not generate a pairing code.');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!lastCode) return;
    await navigator.clipboard?.writeText(lastCode.code);
    toast.success('Pairing code copied');
  };

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      await vendorLinkApi.invite({ email: inviteEmail.trim(), outletName: inviteOutletName.trim() || undefined });
      setInviteEmail('');
      setInviteOutletName('');
      setInviteOpen(false);
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
      setEditingCommission((m) => { const n = { ...m }; delete n[link._id]; return n; });
      await load();
    } catch {
      toast.error('Could not update commission.');
    }
  };

  const saveEta = async (link: VendorLinkDto) => {
    const value = Number(editingEta[link._id]);
    if (!Number.isFinite(value) || value < 1) {
      toast.error('Enter a valid ETA in minutes.');
      return;
    }
    try {
      await vendorLinkApi.updateLink(link._id, { defaultPrepEtaMins: value });
      toast.success('Prep ETA updated');
      setEditingEta((m) => { const n = { ...m }; delete n[link._id]; return n; });
      await load();
    } catch {
      toast.error('Could not update ETA.');
    }
  };

  const setStatus = async (link: VendorLinkDto, status: 'active' | 'suspended') => {
    try {
      await vendorLinkApi.updateLink(link._id, { status });
      toast.success(`Outlet ${status === 'active' ? 'reactivated' : 'suspended'}`);
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
    <div className="space-y-6 p-4 md:p-6">
      <DashboardPageHeader
        title="Linked outlets"
        subtitle="Pair restaurants, bars and lounges to this hotel for in-room ordering."
      />

      {/* Summary stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Linked outlets" value={links.length} icon={<Link className="size-5 text-res-ink-muted" />} />
        <StatCard label="Active" value={activeCount} icon={<CheckCircle2 className="size-5 text-emerald-600" />} />
        <StatCard label="Pending" value={pendingCount} icon={<Clock className="size-5 text-amber-600" />} />
        <StatCard label="Suspended" value={suspendedCount} icon={<Shield className="size-5 text-slate-600" />} />
      </div>

      {/* Generate pairing code card */}
      <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
        <CardHeader className="pb-3">
          <CardTitle className="type-res-body text-res-ink font-semibold">Generate pairing code</CardTitle>
          <CardDescription>
            Single-use code. Share it with the restaurant — expires in 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="space-y-2">
            <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Outlet name</label>
            <Input
              value={outletName}
              onChange={(e) => setOutletName(e.target.value)}
              placeholder="e.g. Pool Bar"
            />
          </div>
          <Button
            onClick={generate}
            disabled={busy}
            className="w-full bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
          >
            {busy ? 'Generating…' : 'Generate code'}
          </Button>
          {lastCode && (
            <div className="rounded-res-md border border-res-line bg-res-surface p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="type-res-small text-res-ink-muted">Pairing code</p>
                <Button
                  onClick={copyCode}
                  variant="ghost"
                  size="sm"
                  className="h-7 p-1"
                >
                  <CopyIcon className="size-4" />
                </Button>
              </div>
              <p className="font-mono text-2xl font-bold text-res-ink tracking-widest">{lastCode.code}</p>
              <p className="type-res-small text-res-ink-muted">
                Expires{' '}
                <span className="font-medium">{new Date(lastCode.expiresAt).toLocaleString()}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite by email — opens a modal */}
      <Button
        onClick={() => setInviteOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-res-surface text-res-ink hover:bg-res-line"
      >
        <Mail className="size-4" />
        Invite by email
      </Button>

      {/* Linked outlets list */}
      <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
        <CardHeader className="pb-3 flex items-center justify-between">
          <div>
            <CardTitle className="type-res-body text-res-ink font-semibold">Linked outlets</CardTitle>
            <CardDescription>
              Manage commission, prep ETA and status for each connected outlet.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="p-8">
              <div className="h-16 w-48 animate-pulse rounded-res-md bg-res-surface" />
              <div className="mt-4 h-16 w-64 animate-pulse rounded-res-md bg-res-surface" />
            </div>
          ) : links.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-res-surface mb-4">
                <UserPlus className="h-8 w-8 text-res-ink-muted" />
              </div>
              <h3 className="type-res-h3 text-res-ink">No linked outlets yet</h3>
              <p className="mt-2 type-res-body text-res-ink-muted max-w-sm mx-auto">
                Generate a pairing code or send an email invite to connect a restaurant,
                bar or lounge to this hotel.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {links.map((link) => {
                const status = STATUS_CONFIG[link.status] ?? STATUS_CONFIG.pending;
                const commission = link.commission?.value != null
                  ? (link.commission.kind === 'flat' ? `₦${link.commission.value}/order` : `${link.commission.value}% commission`)
                  : null;
                const showCommissionInput = editingCommission[link._id] != null;
                const showEtaInput = editingEta[link._id] != null;

                return (
                  <Card key={link._id} className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
                    <CardHeader className="grid grid-cols-3 items-start gap-3 pb-3">
                      <div className="col-span-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-res-surface">
                            <MapPin className="h-5 w-5 text-res-ink-muted" />
                          </div>
                          <div>
                            <p className="type-res-body text-res-ink font-semibold">
                              {link.outletName || 'Unnamed outlet'}
                            </p>
                            {link.counterpartName && (
                              <p className="type-res-small text-res-ink-muted">
                                {link.counterpartName}{link.invitedEmail ? ` · invited ${link.invitedEmail}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-start-3 self-start">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${status.bg} ${status.text} ${status.border}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Scopes */}
                        <div>
                          <p className="type-res-caption text-res-ink-muted uppercase tracking-wider mb-2">
                            Permissions
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ALL_SCOPES.map((s) => {
                              const cfg = SCOPE_CONFIG[s];
                              const enabled = link.scopes.includes(s);
                              return (
                                <span
                                  key={s}
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border ${
                                    enabled
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                      : 'bg-res-surface text-res-ink-muted border-res-line'
                                  }`}
                                >
                                  {cfg.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Commission */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="type-res-caption text-res-ink-muted uppercase tracking-wider">
                            Hotel commission
                          </span>
                          <div className="flex items-center gap-2">
                            {showCommissionInput ? (
                              <div className="flex items-end gap-1">
                                <Input
                                  value={editingCommission[link._id] ?? String(link.commission.value)}
                                  onChange={(e) =>
                                    setEditingCommission((m) => ({ ...m, [link._id]: e.target.value }))
                                  }
                                  type="number"
                                  min={0}
                                  className="w-20 text-sm"
                                />
                                <span className="type-res-small text-res-ink-muted">
                                  {link.commission.kind === 'flat' ? '/order' : '%'}
                                </span>
                              </div>
                            ) : (
                              <span className={`type-res-body text-res-ink font-semibold ${commission ? '' : 'text-res-ink-muted'}`}>
                                {commission ?? '—'}
                              </span>
                            )}
                            <Button
                              onClick={() =>
                                showCommissionInput
                                  ? setEditingCommission((m) => { const n = { ...m }; delete n[link._id]; return n; })
                                  : setEditingCommission((m) => ({ ...m, [link._id]: String(link.commission.value) }))
                              }
                              variant="ghost"
                              size="sm"
                              className="h-7 p-1"
                            >
                              {showCommissionInput ? 'Cancel' : 'Edit'}
                            </Button>
                          </div>
                        </div>

                        {/* Prep ETA */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="type-res-caption text-res-ink-muted uppercase tracking-wider">
                            Prep ETA
                          </span>
                          <div className="flex items-end gap-1">
                            {showEtaInput ? (
                              <div className="flex items-end gap-1">
                                <Input
                                  value={editingEta[link._id] ?? String(link.defaultPrepEtaMins ?? '')}
                                  onChange={(e) => setEditingEta((m) => ({ ...m, [link._id]: e.target.value }))}
                                  type="number"
                                  min={1}
                                  className="w-20 text-sm"
                                />
                                <span className="type-res-small text-res-ink-muted">min</span>
                              </div>
                            ) : (
                              <span className="type-res-body text-res-ink font-semibold">
                                {link.defaultPrepEtaMins != null ? `${link.defaultPrepEtaMins} min` : '—'}
                              </span>
                            )}
                            <Button
                              onClick={() =>
                                showEtaInput
                                  ? setEditingEta((m) => { const n = { ...m }; delete n[link._id]; return n; })
                                  : setEditingEta((m) => ({ ...m, [link._id]: String(link.defaultPrepEtaMins ?? '') }))
                              }
                              variant="ghost"
                              size="sm"
                              className="h-7 p-1"
                            >
                              {showEtaInput ? 'Cancel' : 'Edit'}
                            </Button>
                          </div>
                        </div>

                        {showCommissionInput && (
                          <Button
                            onClick={() => saveCommission(link)}
                            disabled={busy}
                            className="w-full bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover text-sm"
                          >
                            Save commission
                          </Button>
                        )}
                        {showEtaInput && (
                          <Button
                            onClick={() => saveEta(link)}
                            disabled={busy}
                            className="w-full bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover text-sm"
                          >
                            Save ETA
                          </Button>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3 flex items-center justify-between">
                      {link.status === 'active' && (
                        <Button
                          onClick={() => setStatus(link, 'suspended')}
                          variant="outline"
                          className="size-sm"
                        >
                          Suspend
                        </Button>
                      )}
                      {link.status === 'suspended' && (
                        <Button
                          onClick={() => setStatus(link, 'active')}
                          className="size-sm bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
                        >
                          Reactivate
                        </Button>
                      )}
                      <Button
                        onClick={() => revoke(link)}
                        variant="destructive"
                        size="sm"
                        className="text-red-600 border-red-100 hover:bg-red-50"
                      >
                        <Trash2 className="size-4 mr-2" />
                        Revoke
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite by email</DialogTitle>
            <DialogDescription>
              The restaurant receives the pairing code by email and can link their outlet
              to this hotel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Email address</label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
                placeholder="restaurant@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Outlet name</label>
              <Input
                value={inviteOutletName}
                onChange={(e) => setInviteOutletName(e.target.value)}
                placeholder="e.g. Pool Bar"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setInviteOpen(false)}
              variant="outline"
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onClick={invite}
              disabled={busy || !inviteEmail.trim()}
              className="bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
            >
              {busy ? 'Sending…' : 'Send invite'}
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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
