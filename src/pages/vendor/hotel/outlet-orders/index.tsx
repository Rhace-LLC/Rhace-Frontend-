import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import {
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  Building2,
  Wallet,
} from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ordersApi } from '@/features/orders/api/service';
import { useOrderRealtime } from '@/features/orders/realtime';
import { money } from '@/features/orders/money';
import { isLinkedStayOrder, ORDER_STATUS_TEXT, type OrderDto } from '@/features/orders/types';
import { vendorLinkApi, type VendorLinkDto } from '@/services/vendorlink.service';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  awaiting_confirmation: { label: 'Awaiting outlet', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  placed: { label: 'Placed', bg: 'bg-res-secondary', text: 'text-res-brand', border: 'border-res-secondary' },
  preparing: { label: 'Preparing', bg: 'bg-res-brand/10', text: 'text-res-brand', border: 'border-res-brand/20' },
  ready: { label: 'Ready for pickup', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
  out_for_delivery: { label: 'Out for delivery', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  served: { label: 'Served', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  completed: { label: 'Completed', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  cancelled: { label: 'Cancelled', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' },
};

const VIEWS = [
  { key: 'live', label: 'Live', statuses: 'awaiting_confirmation,placed,preparing,ready,out_for_delivery' },
  { key: 'done', label: 'Delivered', statuses: 'delivered,served,completed' },
  { key: 'issues', label: 'Rejected / voided', statuses: 'rejected,cancelled' },
] as const;

const POLL_MS = 30_000;

function time(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function HotelOutletOrdersPage() {
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('live');
  const [linkFilter, setLinkFilter] = useState<string>('');
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const statuses = VIEWS.find((v) => v.key === view)!.statuses;

  const load = useCallback(
    async (silent = false) => {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const res = await ordersApi.hosted({
          status: statuses,
          vendorLink: linkFilter || undefined,
          from: view === 'live' ? undefined : start.toISOString(),
          limit: 100,
        });
        setOrders(res);
      } catch {
        if (!silent) toast.error('Could not load in-stay orders.');
      } finally {
        setLoading(false);
      }
    },
    [statuses, linkFilter, view],
  );

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    vendorLinkApi.hotelLinks().then(setLinks).catch(() => undefined);
  }, []);

  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { connected } = useOrderRealtime(true, () => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => void load(true), 300);
  });
  useEffect(() => {
    if (connected) return;
    const timer = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [connected, load]);

  const counts = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'awaiting_confirmation').length;
    const enRoute = orders.filter((o) => o.status === 'out_for_delivery').length;
    return { pending, enRoute };
  }, [orders]);

  const deliver = async (order: OrderDto, status: 'out_for_delivery' | 'delivered') => {
    try {
      setBusy(order._id);
      await ordersApi.hostedDelivery(order._id, status);
      toast.success(status === 'delivered' ? 'Marked delivered' : 'Marked out for delivery');
      await load(true);
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not update the order.',
      );
    } finally {
      setBusy(null);
    }
  };

  const linkName = (id?: string | null) => {
    if (!id) return 'Hotel services';
    const l = links.find((x) => x._id === id);
    return l?.outletName || l?.counterpartName || 'Outlet';
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardPageHeader
        title="In-stay orders"
        subtitle={`Room service across hotel services and linked outlets · ${connected ? 'live' : 'refreshing every 30s'}`}
        actions={
          <Select value={linkFilter} onValueChange={(v) => setLinkFilter(v as string)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={linkFilter ? linkName(linkFilter) : 'All outlets'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All outlets</SelectItem>
              {links
                .filter((l) => l.status !== 'revoked')
                .map((l) => (
                  <SelectItem key={l._id} value={l._id}>
                    {l.outletName || l.counterpartName || 'Outlet'}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total orders" value={orders.length} icon={<Building2 className="size-5 text-res-ink-muted" />} />
        <StatCard label="Awaiting outlet" value={counts.pending} icon={<Clock className="size-5 text-amber-600" />} />
        <StatCard label="En route" value={counts.enRoute} icon={<Truck className="size-5 text-indigo-600" />} />
      </div>

      {/* View tabs */}
      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const active = view === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-res-brand text-res-ink-inverted'
                  : 'bg-res-surface text-res-ink border border-res-line hover:bg-res-brand-hover'
              }`}
            >
              {v.label}
            </button>
          );
        })}
        {view === 'live' && (
          <span className="ml-3 type-res-small text-res-ink-muted self-center">
            {counts.pending} awaiting outlet · {counts.enRoute} en route
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-8">
          <div className="h-16 w-48 animate-pulse rounded-res-md bg-res-surface" />
          <div className="mt-4 h-16 w-64 animate-pulse rounded-res-md bg-res-surface" />
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-res-surface mb-4">
            <CheckCircle2 className="h-8 w-8 text-res-ink-muted" />
          </div>
          <h3 className="type-res-h3 text-res-ink">No {view === 'live' ? 'live' : view === 'done' ? 'delivered' : 'rejected or voided'} orders</h3>
          <p className="mt-2 type-res-body text-res-ink-muted max-w-sm mx-auto">
            {view === 'live'
              ? 'Room orders placed by guests will appear here automatically.'
              : view === 'done'
                ? 'Delivered orders will appear here.'
                : 'Rejected or cancelled orders will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const linked = isLinkedStayOrder(order);
            const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            return (
              <Card key={order._id} className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
                <CardHeader className="grid grid-cols-3 items-start gap-3 pb-3">
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="type-res-body text-res-ink font-medium">
                        {linked ? linkName(order.vendorLink) : 'Hotel services'}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${status.bg} ${status.text} ${status.border}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="type-res-small text-res-ink-muted mt-1">
                      #{order._id.slice(-6).toUpperCase()} ·
                      {order.fulfillment?.locationLabel || order.guestName || 'Guest'} ·
                      placed {time(order.createdAt)}
                      {order.acceptedAt ? ` · accepted ${time(order.acceptedAt)}` : ''}
                      {order.deliveredAt ? ` · delivered ${time(order.deliveredAt)}` : ''}
                      {order.fulfillment?.scheduledFor ? ` · scheduled ${time(order.fulfillment.scheduledFor)}` : ''}
                    </p>
                    {order.rejectReason && (
                      <p className="mt-1 type-res-small font-medium text-red-700">
                        {order.rejectReason}
                      </p>
                    )}
                  </div>
                  <div className="col-start-3 self-start text-right">
                    <p className="type-res-body text-res-ink font-bold">{money(order.total)}</p>
                    <p className="type-res-small text-res-ink-muted">
                      {order.settlementMethod === 'folio' ? 'Room tab' : order.settlementMethod === 'online' ? 'Paid online' : ''}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {(order.lines ?? []).length > 0 && (
                    <ul className="space-y-1.5 text-sm">
                      {(order.lines ?? []).map((line) => (
                        <li key={line._id} className="flex justify-between type-res-body text-res-ink">
                          <span>{line.quantity}× {line.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(order.fees ?? []).length > 0 && (
                    <p className="mt-3 type-res-small text-res-ink-muted">
                      Fees: {(order.fees ?? []).map((f) => `${f.label} ${money(f.amount)}`).join(' · ')}
                    </p>
                  )}
                </CardContent>

                {linked && ['ready', 'out_for_delivery'].includes(order.status) && (
                  <CardFooter className="pt-3 flex gap-2">
                    {order.status === 'ready' && (
                      <Button
                        onClick={() => deliver(order, 'out_for_delivery')}
                        disabled={busy === order._id}
                        variant="outline"
                        className="flex-1 text-sm"
                      >
                        {busy === order._id ? <Clock className="size-4 animate-spin mr-2" /> : <Truck className="size-4 mr-2" />}
                        Hotel runner picked up
                      </Button>
                    )}
                    <Button
                      onClick={() => deliver(order, 'delivered')}
                      disabled={busy === order._id}
                      className="flex-1 bg-res-brand text-res-ink-inverted hover:bg-res-brand-hover text-sm"
                    >
                      {busy === order._id ? 'Delivering…' : <CheckCircle2 className="size-4 mr-2" />}Delivered to guest
                    </Button>
                  </CardFooter>
                )}

                {!linked && (order.amountPaid ?? 0) > 0 && order.settlementMethod === 'online' && (
                  <CardFooter className="pt-3">
                    <Link
                      to={`/dashboard/hotel/refunds?orderId=${order._id}`}
                      className="flex items-center gap-1.5 type-res-small text-res-brand hover:underline"
                    >
                      <Wallet className="size-4" />
                      Open a refund ticket
                    </Link>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}
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
