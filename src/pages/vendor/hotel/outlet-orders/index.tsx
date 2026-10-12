import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { ordersApi } from '@/features/orders/api/service';
import { useOrderRealtime } from '@/features/orders/realtime';
import { money } from '@/features/orders/money';
import { isLinkedStayOrder, ORDER_STATUS_TEXT, type OrderDto } from '@/features/orders/types';
import { vendorLinkApi, type VendorLinkDto } from '@/services/vendorlink.service';

const STATUS_STYLE: Record<string, string> = {
  awaiting_confirmation: 'bg-amber-100 text-amber-800',
  placed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  served: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
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

/**
 * Phase 5 hotel page: every in-stay order the hotel hosts — its own
 * services and its linked outlets — live. Outlet orders are read-only
 * except for the hotel runner's dispatch/delivered steps.
 */
export default function HotelOutletOrdersPage() {
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('live');
  const [linkFilter, setLinkFilter] = useState('');
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
        setOrders(
          await ordersApi.hosted({
            status: statuses,
            vendorLink: linkFilter || undefined,
            from: view === 'live' ? undefined : start.toISOString(),
            limit: 100,
          }),
        );
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
    vendorLinkApi
      .hotelLinks()
      .then(setLinks)
      .catch(() => undefined);
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

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="In-stay orders"
        subtitle={`Room service across hotel services and linked outlets · ${connected ? 'live' : 'refreshing every 30s'}`}
        actions={
          <select
            value={linkFilter}
            onChange={(e) => setLinkFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All outlets</option>
            {links
              .filter((l) => l.status !== 'revoked')
              .map((l) => (
                <option key={l._id} value={l._id}>
                  {l.outletName || l.counterpartName || 'Outlet'}
                </option>
              ))}
          </select>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              view === v.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {v.label}
          </button>
        ))}
        {view === 'live' && (
          <span className="text-xs text-gray-500">
            {counts.pending} awaiting outlet · {counts.enRoute} en route
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No in-stay orders here.
        </p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => {
            const linked = isLinkedStayOrder(order);
            return (
              <li key={order._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {linked ? order.outletName || 'Outlet' : 'Hotel services'} ·{' '}
                      <span className="font-normal text-gray-600">
                        {order.fulfillment?.locationLabel || order.guestName || 'Guest'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      #{order._id.slice(-6).toUpperCase()} · placed {time(order.createdAt)}
                      {order.acceptedAt ? ` · accepted ${time(order.acceptedAt)}` : ''}
                      {order.deliveredAt ? ` · delivered ${time(order.deliveredAt)}` : ''}
                      {order.fulfillment?.scheduledFor
                        ? ` · scheduled ${time(order.fulfillment.scheduledFor)}`
                        : ''}
                    </p>
                    {order.rejectReason && (
                      <p className="mt-0.5 text-xs font-semibold text-red-600">{order.rejectReason}</p>
                    )}
                    {(order.amountPaid ?? 0) > 0 && order.settlementMethod === 'online' && (
                      <Link
                        to={`/dashboard/hotel/refunds?orderId=${order._id}`}
                        className="mt-0.5 inline-block text-xs font-semibold text-slate-700 underline"
                      >
                        Open a refund ticket
                      </Link>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS_STYLE[order.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {ORDER_STATUS_TEXT[order.status] ?? order.status}
                    </span>
                    <p className="mt-1 text-sm font-bold">{money(order.total)}</p>
                    <p className="text-[11px] text-gray-400">
                      {order.settlementMethod === 'folio' ? 'Room tab' : order.settlementMethod === 'online' ? 'Paid online' : ''}
                    </p>
                  </div>
                </div>
                <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
                  {(order.lines ?? []).map((line) => (
                    <li key={line._id}>
                      {line.quantity}× {line.name}
                    </li>
                  ))}
                </ul>
                {(order.fees ?? []).length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Fees: {(order.fees ?? []).map((f) => `${f.label} ${money(f.amount)}`).join(' · ')}
                  </p>
                )}
                {linked && ['ready', 'out_for_delivery'].includes(order.status) && (
                  <div className="mt-3 flex gap-2">
                    {order.status === 'ready' && (
                      <button
                        type="button"
                        disabled={busy === order._id}
                        onClick={() => deliver(order, 'out_for_delivery')}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        Hotel runner picked up
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy === order._id}
                      onClick={() => deliver(order, 'delivered')}
                      className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Delivered to guest
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
