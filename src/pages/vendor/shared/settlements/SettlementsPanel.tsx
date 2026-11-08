import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, Clock, Hourglass, Wallet } from 'lucide-react';
import { SegmentedControl, StatTile } from '@/components/dashboard/res-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { money } from '@/features/orders/money';
import { useVendorEvents } from '@/features/orders/realtime';
import { settlementApi, type SettlementSide } from '@/services/settlement.service';
import { vendorLinkApi, type VendorLinkDto } from '@/services/vendorlink.service';
import { BatchesView } from './BatchesView';
import { ReconciliationView } from './ReconciliationView';
import { ReportsView } from './ReportsView';
import type { BatchesData } from './shared';

const VIEWS = [
  { value: 'batches', label: 'Batches' },
  { value: 'reports', label: 'Reports' },
  { value: 'reconciliation', label: 'Reconciliation' },
] as const;
type View = (typeof VIEWS)[number]['value'];

const icon = (Icon: typeof Wallet) => <Icon className="size-5" strokeWidth={1.75} aria-hidden />;

/**
 * Settlements tab: hotel ↔ outlet money for room-charged orders. Hotels see
 * what they owe each outlet (approve, record the offline payout, resolve
 * disputes, adjust); outlets see what they are owed (comment, dispute,
 * download statements).
 */
export function SettlementsPanel() {
  const [side, setSide] = useState<SettlementSide | null>(null);
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [view, setView] = useState<View>('batches');
  const [data, setData] = useState<BatchesData | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await settlementApi.batches();
      setSide(res.side);
      setData({ batches: res.batches, unbatched: res.unbatched });
    } catch {
      setSide((s) => s ?? 'partner');
      setData((d) => d ?? { batches: [], unbatched: [] });
      toast.error('Could not load settlements.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useVendorEvents(
    ['settlement:batch', 'settlement:adjustment', 'settlement:reversal'],
    () => void load()
  );

  useEffect(() => {
    if (!side) return;
    (side === 'hotel' ? vendorLinkApi.hotelLinks() : vendorLinkApi.partnerLinks())
      .then((l) => setLinks(l.filter((x) => x.status !== 'revoked' || x.partnerVendor)))
      .catch(() => undefined);
  }, [side]);

  const stats = useMemo(() => {
    const sum = (status: string) =>
      (data?.batches ?? [])
        .filter((b) => b.status === status)
        .reduce((acc, b) => ({ count: acc.count + 1, net: acc.net + b.totals.net }), {
          count: 0,
          net: 0,
        });
    return {
      unbatched: (data?.unbatched ?? []).reduce((acc, u) => acc + u.net, 0),
      draft: sum('draft'),
      approved: sum('approved'),
      disputed: sum('disputed'),
    };
  }, [data]);

  if (!side || !data) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-res-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-res-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="type-res-body font-normal text-res-ink-muted">
        {side === 'hotel'
          ? 'What you owe linked outlets for room-charged orders. Pay offline, then record it.'
          : 'What linked hotels owe you for room-charged orders.'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Not yet batched"
          value={money(stats.unbatched)}
          tone="neutral"
          icon={icon(Clock)}
        />
        <StatTile
          label={`Awaiting approval · ${stats.draft.count}`}
          value={money(stats.draft.net)}
          tone="brand"
          icon={icon(Hourglass)}
        />
        <StatTile
          label={`Awaiting payout · ${stats.approved.count}`}
          value={money(stats.approved.net)}
          tone={stats.approved.count ? 'attention' : 'neutral'}
          icon={icon(Wallet)}
        />
        <StatTile
          label="Disputed"
          value={stats.disputed.count}
          tone={stats.disputed.count ? 'attention' : 'neutral'}
          icon={icon(AlertTriangle)}
        />
      </div>

      <SegmentedControl label="Settlement views" value={view} onChange={setView} options={VIEWS} />

      {view === 'batches' && <BatchesView side={side} links={links} data={data} reload={load} />}
      {view === 'reports' && <ReportsView side={side} />}
      {view === 'reconciliation' && <ReconciliationView side={side} />}
    </div>
  );
}
