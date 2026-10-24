import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CheckCircle2,
  Clock,
  Link,
  Mail,
  MapPin,
  Search,
  Shield,
  Trash2,
  UserPlus,
  X,
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
  const [busy, setBusy] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Record<string, string>>({});
  const [editingEta, setEditingEta] = useState<Record<string, string>>({});

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ _id: string; businessName: string; email: string; vendorType: string }>>([]);
  const [selectedVendor, setSelectedVendor] = useState<{ _id: string; businessName: string; email: string; vendorType: string } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

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

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      await vendorLinkApi.invite({ email: inviteEmail.trim(), partnerVendorId: selectedVendor?._id ?? undefined });
      setInviteEmail('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedVendor(null);
      setInviteOpen(false);
      toast.success('Invite sent by email');
      await load();
    } catch {
      toast.error('Could not send the invite.');
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setSearchQuery(value);
    if (!value) {
      setSearchResults([]);
      setSelectedVendor(null);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await vendorLinkApi.searchVendors(value, 'restaurant');
      setSearchResults(results.slice(0, 10));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const pickVendor = (vendor: { _id: string; businessName: string; email: string; vendorType: string }) => {
    setSelectedVendor(vendor);
    setSearchQuery(vendor.businessName);
    setSearchResults([]);
  };

  const clearSelection = () => {
    setSelectedVendor(null);
    setSearchQuery('');
    setSearchResults([]);
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
        actions={
          <Button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 rounded-res-md border border-res-line bg-res-card px-4 py-2.5 text-res-ink font-medium shadow-res-low hover:bg-res-surface"
          >
            <Mail className="size-4" />
            Invite by email
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Linked outlets" value={links.length} icon={<Link className="size-5 text-res-ink-muted" />} />
        <StatCard label="Active" value={activeCount} icon={<CheckCircle2 className="size-5 text-emerald-600" />} />
        <StatCard label="Pending" value={pendingCount} icon={<Clock className="size-5 text-amber-600" />} />
        <StatCard label="Suspended" value={suspendedCount} icon={<Shield className="size-5 text-slate-600" />} />
      </div>

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
                Send an email invite to connect a restaurant, bar or lounge to this hotel.
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
        <DialogContent className="rounded-res-lg border border-res-line bg-res-card shadow-res-high sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="type-res-body text-res-ink font-semibold">Invite by email</DialogTitle>
            <DialogDescription className="type-res-small text-res-ink-muted">
              The restaurant receives the pairing code by email and can link their outlet
              to this hotel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider block">Email address</label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
                placeholder="restaurant@example.com"
                className="w-full rounded-res-md border border-res-line bg-res-card px-3 py-2.5 text-res-ink placeholder:text-res-ink-muted focus:border-res-brand focus:ring-res-brand/20"
              />
            </div>
            <div className="space-y-2">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider block">Search restaurant</label>
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search by restaurant name or email"
                  className="w-full rounded-res-md border border-res-line bg-res-card px-3 py-2.5 text-res-ink placeholder:text-res-ink-muted focus:border-res-brand focus:ring-res-brand/20 pr-10"
                />
                <Search className="absolute right-3 top-2.5 size-4 text-res-ink-muted" />
                {searchLoading && <Search className="absolute right-3 top-2.5 size-4 animate-spin text-res-brand" />}
              </div>
              {selectedVendor && (
                <div className="flex items-center gap-2 rounded-res-md border border-res-line bg-res-surface px-3 py-2">
                  <span className="type-res-body text-res-ink font-medium">{selectedVendor.businessName}</span>
                  <span className="type-res-small text-res-ink-muted">{selectedVendor.email}</span>
                  <Button
                    type="button"
                    onClick={clearSelection}
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 text-res-ink-muted hover:text-res-brand"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              )}
              {searchResults.length > 0 && !selectedVendor && (
                <div className="absolute z-20 w-full rounded-res-md border border-res-line bg-res-card shadow-res-high mt-1">
                  {searchResults.map((v) => (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => pickVendor(v)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-res-ink text-sm hover:bg-res-surface"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="type-res-body text-res-ink font-medium truncate">{v.businessName}</p>
                        <p className="type-res-small text-res-ink-muted truncate">{v.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-res-line">
            <Button
              type="button"
              onClick={() => setInviteOpen(false)}
              variant="outline"
              disabled={busy}
              className="w-full sm:w-auto rounded-res-md border border-res-line bg-res-card px-4 py-2.5 font-medium text-res-ink shadow-res-low hover:bg-res-surface disabled:opacity-60"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={invite}
              disabled={busy || !inviteEmail.trim()}
              className="w-full sm:w-auto rounded-res-md bg-res-brand px-4 py-2.5 font-medium text-res-ink-inverted shadow-res-low hover:bg-res-brand-hover disabled:opacity-60"
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
