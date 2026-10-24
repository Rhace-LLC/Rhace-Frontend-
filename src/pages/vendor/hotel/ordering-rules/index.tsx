import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Clock,
  Percent,
  Shield,
  Trash2,
  Play,
  Pause,
  Building2,
} from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { money } from '@/features/orders/money';
import {
  vendorLinkApi,
  type FeeRuleDto,
  type OrderingWindowDto,
  type VendorLinkDto,
} from '@/services/vendorlink.service';

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const MODE_CONFIG: Record<string, { label: string; color: string }> = {
  allow: { label: 'Allow', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  block: { label: 'Block', color: 'text-red-700 bg-red-50 border-red-100' },
};

const SOURCE_CONFIG: Record<string, string> = {
  hotel: 'Hotel services',
  linked: 'Linked outlets',
};

const FULFILLMENT_CONFIG: Record<string, string> = {
  room: 'To room',
  location: 'To location',
};

export default function HotelOrderingRulesPage() {
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [windows, setWindows] = useState<OrderingWindowDto[]>([]);
  const [fees, setFees] = useState<FeeRuleDto[]>([]);
  const [linkFilter, setLinkFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [windowOpen, setWindowOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);

  // Window form (modal)
  const [wName, setWName] = useState('');
  const [wMode, setWMode] = useState<'allow' | 'block'>('allow');
  const [wStart, setWStart] = useState('23:00');
  const [wEnd, setWEnd] = useState('06:00');
  const [wDays, setWDays] = useState<Set<string>>(new Set(DAYS.map((d) => d.key)));
  const [wLinkFilter, setWLinkFilter] = useState<string>('');

  // Fee form (modal)
  const [fLabel, setFLabel] = useState('');
  const [fKind, setFKind] = useState<'flat' | 'percent'>('flat');
  const [fValue, setFValue] = useState('');
  const [fSource, setFSource] = useState<'hotel' | 'linked' | ''>('');
  const [fFulfillment, setFFulfillment] = useState<'room' | 'location' | ''>('');
  const [fLinkFilter, setFLinkFilter] = useState<string>('');

  const activeWindowCount = useMemo(() => windows.filter((w) => w.active).length, [windows]);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleDay = (key: string) => {
    const next = new Set(wDays);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setWDays(next);
  };

  const createWindow = async () => {
    if (!wName.trim()) {
      toast.error('Give the window a name.');
      return;
    }
    try {
      await vendorLinkApi.createWindow({
        name: wName.trim(),
        mode: wMode,
        start: wStart,
        end: wEnd,
        days: [...wDays],
        ...(wLinkFilter ? { vendorLink: wLinkFilter } : {}),
      });
      toast.success('Ordering window saved');
      setWName('');
      setWMode('allow');
      setWStart('23:00');
      setWEnd('06:00');
      setWDays(new Set(DAYS.map((d) => d.key)));
      setWLinkFilter('');
      setWindowOpen(false);
      await load();
    } catch {
      toast.error('Could not save the window.');
    }
  };

  const createFee = async () => {
    if (!fLabel.trim() || !fValue) {
      toast.error('Enter a label and value.');
      return;
    }
    try {
      await vendorLinkApi.createFee({
        label: fLabel.trim(),
        kind: fKind,
        value: Number(fValue),
        scope: {
          ...(fSource ? { sources: [fSource] } : {}),
          ...(fFulfillment ? { fulfillment: [fFulfillment] } : {}),
          ...(fLinkFilter ? { vendorLinks: [fLinkFilter] } : {}),
        },
      });
      toast.success('Fee rule saved');
      setFLabel('');
      setFValue('');
      setFSource('');
      setFFulfillment('');
      setFLinkFilter('');
      setFeeOpen(false);
      await load();
    } catch {
      toast.error('Could not save the fee rule.');
    }
  };

  const toggleWindow = (w: OrderingWindowDto) =>
    vendorLinkApi
      .updateWindow(w._id, { active: !w.active })
      .then(() => {
        toast.success(w.active ? 'Window paused' : 'Window resumed');
        void load();
      })
      .catch(() => toast.error('Update failed.'));

  const toggleFee = (f: FeeRuleDto) =>
    vendorLinkApi
      .updateFee(f._id, { active: !f.active })
      .then(() => {
        toast.success(f.active ? 'Fee paused' : 'Fee resumed');
        void load();
      })
      .catch(() => toast.error('Update failed.'));

  const deleteWindow = (id: string) =>
    vendorLinkApi.deleteWindow(id).then(load).catch(() => toast.error('Delete failed.'));

  const deleteFee = (id: string) =>
    vendorLinkApi.deleteFee(id).then(load).catch(() => toast.error('Delete failed.'));

  const shownWindows = useMemo(
    () =>
      windows.filter((w) =>
        linkFilter ? String(w.vendorLink ?? '') === linkFilter : !w.vendorLink,
      ),
    [windows, linkFilter],
  );

  const linkName = (id: string) => {
    const l = links.find((x) => x._id === id);
    return l?.outletName || l?.counterpartName || 'Outlet';
  };

  const feeScope = (f: FeeRuleDto) =>
    [
      f.scope?.sources?.length
        ? f.scope.sources.map((x) => SOURCE_CONFIG[x] ?? x).join('/')
        : 'All sources',
      f.scope?.fulfillment?.length
        ? f.scope.fulfillment.map((x) => FULFILLMENT_CONFIG[x] ?? x).join('/')
        : 'Any delivery',
      f.scope?.vendorLinks?.length ? f.scope.vendorLinks.map(linkName).join(', ') : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardPageHeader
        title="Ordering windows & fees"
        subtitle="Control when guests can order and what surcharges apply."
        actions={
          <>
            <Button
              onClick={() => setWindowOpen(true)}
              className="flex items-center gap-2 bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
            >
              <Clock className="size-4 mr-1" />
              Add window
            </Button>
            <Button
              onClick={() => setFeeOpen(true)}
              className="flex items-center gap-2 bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
            >
              <Percent className="size-4 mr-1" />
              Add fee rule
            </Button>
            <Select value={linkFilter} onValueChange={(v) => setLinkFilter(v as string)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={linkFilter ? linkName(linkFilter) : 'Hotel services'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Hotel services</SelectItem>
                {links.map((l) => (
                  <SelectItem key={l._id} value={l._id}>
                    {l.outletName || 'Outlet'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Ordering windows" value={windows.length} icon={<Clock className="size-5 text-res-ink-muted" />} />
        <StatCard label="Active windows" value={activeWindowCount} icon={<Play className="size-5 text-emerald-600" />} />
        <StatCard label="Fee rules" value={fees.length} icon={<Percent className="size-5 text-res-ink-muted" />} />
      </div>

      {loading ? (
        <div className="p-8">
          <div className="h-16 w-48 animate-pulse rounded-res-md bg-res-surface" />
        </div>
      ) : (
        <>
          {/* Ordering windows section */}
          <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
            <CardHeader className="pb-3">
              <CardTitle className="type-res-body text-res-ink font-semibold">Ordering windows</CardTitle>
              <CardDescription>
                Allow windows open ordering in set hours. Block windows close it;
                the highest-priority match wins. Overnight windows belong to the day they start.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {shownWindows.length > 0 ? (
                  <div className="space-y-2">
                    {shownWindows.map((w) => {
                      const mode = MODE_CONFIG[w.mode];
                      return (
                        <Card key={w._id} className="rounded-res-md border border-res-line bg-res-card p-3 shadow-res-low">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="type-res-body text-res-ink font-medium">{w.name}</p>
                              <p className="type-res-small text-res-ink-muted">
                                {mode.label} · {w.start}–{w.end} ·
                                {w.days.length ? w.days.map((d) => d.slice(0, 3)).join(', ') : 'every day'}
                                {linkFilter ? ` · ${linkName(String(w.vendorLink))}` : ' · Hotel services'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => toggleWindow(w)}
                                variant="outline"
                                size="sm"
                              >
                                {w.active ? 'Pause' : 'Resume'}
                              </Button>
                              <Button
                                onClick={() => deleteWindow(w._id)}
                                variant="destructive"
                                size="sm"
                                className="text-red-600 border-red-100 hover:bg-red-50"
                              >
                                <Trash2 className="size-4 mr-1" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-res-md border border-dashed border-res-line bg-res-surface p-4 text-center">
                    <p className="type-res-small text-res-ink-muted">No ordering windows yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fee rules section */}
          <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
            <CardHeader className="pb-3">
              <CardTitle className="type-res-body text-res-ink font-semibold">Fee rules</CardTitle>
              <CardDescription>
                Flat or percentage surcharges scoped to sources, fulfillment
                mode and specific outlets.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {fees.length > 0 ? (
                  <div className="space-y-2">
                    {fees.map((f) => {
                      const amount = f.kind === 'flat' ? money(f.value) : `${f.value}%`;
                      return (
                        <Card key={f._id} className="rounded-res-md border border-res-line bg-res-card p-3 shadow-res-low">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="type-res-body text-res-ink font-medium">{f.label}</p>
                              <p className="type-res-small text-res-ink-muted">
                                {amount} · to {f.beneficiary}
                                <span className="block mt-0.5">{feeScope(f)}</span>
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => toggleFee(f)}
                                variant="outline"
                                size="sm"
                              >
                                {f.active ? 'Pause' : 'Resume'}
                              </Button>
                              <Button
                                onClick={() => deleteFee(f._id)}
                                variant="destructive"
                                size="sm"
                                className="text-red-600 border-red-100 hover:bg-red-50"
                              >
                                <Trash2 className="size-4 mr-1" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-res-md border border-dashed border-res-line bg-res-surface p-4 text-center">
                    <p className="type-res-small text-res-ink-muted">No fee rules yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add window modal */}
      <Dialog open={windowOpen} onOpenChange={setWindowOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add ordering window</DialogTitle>
            <DialogDescription>
              Define when ordering is open or blocked for a scope.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-5">
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Name</label>
                <Input
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  placeholder="e.g. Night Room Service"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Mode</label>
                <Select value={wMode} onValueChange={(v) => setWMode(v as 'allow' | 'block')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={wMode} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow">Allow</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">From</label>
                <Input type="time" value={wStart} onChange={(e) => setWStart(e.target.value)} className="w-full text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">To</label>
                <Input type="time" value={wEnd} onChange={(e) => setWEnd(e.target.value)} className="w-full text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Outlet scope</label>
                <Select value={wLinkFilter} onValueChange={(v) => setWLinkFilter(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All outlets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All outlets</SelectItem>
                    {links.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.outletName || 'Outlet'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    wDays.has(d.key)
                      ? 'bg-res-brand text-res-ink-inverted'
                      : 'bg-res-card text-res-ink border border-res-line'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setWindowOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={createWindow}
              disabled={!wName.trim()}
              className="bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
            >
              Add window
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add fee rule modal */}
      <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add fee rule</DialogTitle>
            <DialogDescription>
              Create a flat or percentage surcharge scoped to sources,
              fulfillment mode and specific outlets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-6">
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Label</label>
                <Input
                  value={fLabel}
                  onChange={(e) => setFLabel(e.target.value)}
                  placeholder="e.g. Tray Charge"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Kind</label>
                <Select value={fKind} onValueChange={(v) => setFKind(v as 'flat' | 'percent')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={fKind} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="percent">Percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Value</label>
                <Input
                  value={fValue}
                  onChange={(e) => setFValue(e.target.value)}
                  type="number"
                  min={0}
                  placeholder={fKind === 'flat' ? '₦500' : '15'}
                  className="w-full text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Source</label>
                <Select value={fSource} onValueChange={(v) => setFSource(v as 'hotel' | 'linked' | '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All sources</SelectItem>
                    <SelectItem value="hotel">Hotel services</SelectItem>
                    <SelectItem value="linked">Linked outlets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Fulfillment</label>
                <Select value={fFulfillment} onValueChange={(v) => setFFulfillment(v as 'room' | 'location' | '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any fulfillment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any fulfillment</SelectItem>
                    <SelectItem value="room">To room</SelectItem>
                    <SelectItem value="location">To location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="type-res-small text-res-ink-muted uppercase tracking-wider">Outlet scope</label>
                <Select value={fLinkFilter} onValueChange={(v) => setFLinkFilter(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All outlets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All outlets</SelectItem>
                    {links.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.outletName || 'Outlet'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setFeeOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={createFee}
              disabled={!fLabel.trim() || !fValue}
              className="bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover"
            >
              Add fee rule
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
