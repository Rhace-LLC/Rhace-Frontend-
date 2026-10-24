import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Link,
  MapPin,
  Percent,
  Shield,
  User,
  X,
} from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  vendorLinkApi,
  type DeliveryZoneDto,
  type VendorLinkDto,
} from '@/services/vendorlink.service';

const SCOPE_CONFIG: Record<string, { label: string; description: string }> = {
  'read:menu': {
    label: 'Menu Access',
    description: 'Hotel guests can view your active kitchen menu.',
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

export default function LinkedHotelsPage() {
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [code, setCode] = useState('');
  const [scopes, setScopes] = useState<Set<string>>(new Set(ALL_SCOPES));
  const [zonesByLink, setZonesByLink] = useState<Record<string, DeliveryZoneDto[]>>({});
  const [expandedLink, setExpandedLink] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const activeCount = useMemo(() => links.filter((l) => l.status === 'active').length, [links]);
  const pendingCount = useMemo(() => links.filter((l) => l.status === 'pending').length, [links]);

  const load = useCallback(async () => {
    try {
      setLinks(await vendorLinkApi.partnerLinks());
    } catch {
      toast.error('Could not load linked hotels.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleScope = (s: string) => {
    const next = new Set(scopes);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setScopes(next);
  };

  const redeem = async () => {
    if (!code.trim()) return;
    setWorkingId('redeem');
    try {
      await vendorLinkApi.redeem(code.trim().toUpperCase(), [...scopes]);
      toast.success('Hotel linked');
      setCode('');
      setScopes(new Set(ALL_SCOPES));
      setRedeemOpen(false);
      await load();
    } catch {
      toast.error('Invalid or expired pairing code.');
    } finally {
      setWorkingId(null);
    }
  };

  const approve = async (id: string) => {
    setWorkingId(id);
    try {
      await vendorLinkApi.approveLink(id);
      toast.success('Link approved');
      await load();
    } catch {
      toast.error('Could not approve the link.');
    } finally {
      setWorkingId(null);
    }
  };

  const decline = async (id: string) => {
    setWorkingId(id);
    try {
      await vendorLinkApi.declineLink(id);
      toast.success('Link declined');
      await load();
    } catch {
      toast.error('Could not decline the link.');
    } finally {
      setWorkingId(null);
    }
  };

  const showZones = async (id: string) => {
    if (expandedLink === id) {
      setExpandedLink(null);
      return;
    }
    if (!(id in zonesByLink)) {
      try {
        const zones = await vendorLinkApi.linkZones(id);
        setZonesByLink((m) => ({ ...m, [id]: zones }));
        setExpandedLink(id);
      } catch {
        toast.error('Could not load delivery zones.');
      }
    } else {
      setExpandedLink(id);
    }
  };

  const formatCommission = (link: VendorLinkDto) => {
    if (!link.commission?.value) return null;
    const { kind, value } = link.commission;
    return kind === 'flat' ? `₦${value}/order` : `${value}% commission`;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardPageHeader
        title="Linked hotels"
        subtitle="Manage hotel partnerships that route room orders to your kitchen."
        actions={
          <Button
            onClick={() => setRedeemOpen(true)}
            className="flex items-center gap-2"
          >
            <Link className="size-4" />
            Link hotel
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-res-lg border border-res-line bg-res-card p-4 shadow-res-low">
          <p className="type-res-caption text-res-ink-muted">Linked hotels</p>
          <p className="mt-1 type-res-h3 text-res-ink font-semibold">{links.length}</p>
        </div>
        <div className="rounded-res-lg border border-res-line bg-res-card p-4 shadow-res-low">
          <p className="type-res-caption text-res-ink-muted">Active</p>
          <p className="mt-1 type-res-h3 text-res-ink font-semibold">{activeCount}</p>
        </div>
        <div className="rounded-res-lg border border-res-line bg-res-card p-4 shadow-res-low">
          <p className="type-res-caption text-res-ink-muted">Pending approval</p>
          <p className="mt-1 type-res-h3 text-res-ink font-semibold">{pendingCount}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-res-lg border border-res-line bg-res-card p-8 shadow-res-low">
          <div className="h-16 w-48 animate-pulse rounded-res-md bg-res-surface" />
          <div className="mt-4 h-16 w-64 animate-pulse rounded-res-md bg-res-surface" />
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-res-lg border border-res-line border-dashed bg-res-card p-12 text-center shadow-res-low">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-res-surface mb-4">
            <Building2 className="h-8 w-8 text-res-ink-muted" />
          </div>
          <h3 className="type-res-h3 text-res-ink">No linked hotels yet</h3>
          <p className="mt-2 type-res-body text-res-ink-muted max-w-sm mx-auto">
            Get a pairing code from your hotel partner to start receiving room orders in your kitchen.
          </p>
          <Button
            onClick={() => setRedeemOpen(true)}
            className="mt-6"
          >
            <Link className="size-4 mr-2" />
            Enter pairing code
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => {
            const status = STATUS_CONFIG[link.status] ?? STATUS_CONFIG.pending;
            const commission = formatCommission(link);
            const zones = zonesByLink[link._id];
            const isExpanded = expandedLink === link._id;
            const busy = workingId === link._id;

            return (
              <Card key={link._id} className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
                <CardHeader className="grid grid-cols-3 items-start gap-3 pb-3">
                  <div className="col-span-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-res-surface">
                        <User className="h-5 w-5 text-res-ink-muted" />
                      </div>
                      <div>
                        <p className="type-res-body text-res-ink font-semibold">
                          {link.counterpartName || 'Hotel'}
                        </p>
                        {link.outletName && (
                          <p className="type-res-small text-res-ink-muted">
                            Listed as <span className="font-medium">{link.outletName}</span>
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
                      <p className="type-res-caption text-res-ink-muted mb-2 uppercase tracking-wider">
                        Permissions granted
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
                    {commission && (
                      <div className="flex items-center justify-between">
                        <span className="type-res-caption text-res-ink-muted uppercase tracking-wider">
                          Hotel commission
                        </span>
                        <span className="type-res-body text-res-ink font-semibold">{commission}</span>
                      </div>
                    )}

                    {/* Zone preview */}
                    {link.status === 'active' && (
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => showZones(link._id)}
                      >
                        <MapPin className="size-4 text-res-ink-muted" />
                        <span className="type-res-body text-res-ink font-medium">
                          {zones ? `${zones.length} delivery zone${zones.length === 1 ? '' : 's'}` : 'View delivery zones'}
                        </span>
                        {zones === undefined && (
                          <ChevronDown className="size-3 text-res-ink-muted" />
                        )}
                        {zones && !isExpanded && (
                          <ChevronDown className="size-3 text-res-ink-muted" />
                        )}
                        {zones && isExpanded && (
                          <ChevronUp className="size-3 text-res-ink-muted" />
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-3">
                  <div className="flex items-center justify-between">
                    {link.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => approve(link._id)}
                          disabled={busy}
                          className="flex-1 bg-emerald-600 text-res-ink-inverted hover:bg-emerald-700 size-sm"
                        >
                          {busy ? null : <Check className="size-3 mr-2" />}
                          Approve
                        </Button>
                        <Button
                          onClick={() => decline(link._id)}
                          disabled={busy}
                          variant="outline"
                          className="flex-1 size-sm"
                        >
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => showZones(link._id)}
                        disabled={busy}
                        variant="outline"
                        className="w-full size-sm"
                      >
                        {zones === undefined || isExpanded ? 'Hide zones' : 'View zones'}
                      </Button>
                    )}
                  </div>
                </CardFooter>

                {/* Expanded zones */}
                {isExpanded && zones && (
                  <CardContent className="pt-0 border-t border-res-line">
                    <div className="space-y-3">
                      <p className="type-res-caption text-res-ink-muted uppercase tracking-wider mb-1">
                        Delivery zones
                      </p>
                      <div className="grid gap-2">
                        {zones.map((z) => {
                          const outlet = z.outlets.find((o) => String(o.vendorLink) === link._id);
                          return (
                            <div
                              key={z._id}
                              className="rounded-res-md border border-res-line bg-res-surface p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="type-res-body text-res-ink font-semibold">{z.name}</p>
                                  <p className="type-res-small text-res-ink-muted">
                                    {z.unitIds.length} unit{z.unitIds.length === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="type-res-body text-res-ink font-semibold">
                                    {outlet?.etaMins ?? '—'} min
                                  </p>
                                  <p className="type-res-small text-res-ink-muted">
                                    {outlet?.dispatchPoint ?? 'dispatch'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {zones.length === 0 && (
                          <p className="type-res-small text-res-ink-muted">No zones assigned yet.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Redeem code modal */}
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link a hotel</DialogTitle>
            <DialogDescription>
              Enter the 8-character pairing code provided by your hotel partner and choose the
              permissions you want to grant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); redeem(); }} className="space-y-4">
            <div className="space-y-2">
              <label className="type-res-body text-res-ink font-semibold">Pairing code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                maxLength={8}
                className="font-mono text-sm tracking-widest uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="type-res-body text-res-ink font-semibold">Permissions to grant</label>
              <div className="space-y-2">
                {ALL_SCOPES.map((s) => {
                  const cfg = SCOPE_CONFIG[s];
                  const enabled = scopes.has(s);
                  return (
                    <div
                      key={s}
                      className="flex items-center gap-3 rounded-res-md border border-res-line bg-res-card p-3"
                    >
                      <Switch checked={enabled} onCheckedChange={() => toggleScope(s)} />
                      <div>
                        <p className="type-res-body text-res-ink font-medium">{cfg.label}</p>
                        <p className="type-res-small text-res-ink-muted">{cfg.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setRedeemOpen(false)}
              variant="outline"
              disabled={workingId === 'redeem'}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={redeem}
              disabled={workingId === 'redeem' || !code.trim()}
              className="bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
            >
              {workingId === 'redeem' ? 'Linking…' : 'Link hotel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
