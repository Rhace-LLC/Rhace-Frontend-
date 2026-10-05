import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import { money } from '@/features/orders/money';
import { guestStayApi, setGuestToken, type GuestMe, type ResolvedRoom, type StayFolio } from '@/services/stay.service';
import { useStayCart } from '@/features/stay/cart';
import { useGuestRealtime } from '@/features/stay/realtime';
import { useOnlineStatus } from '@/features/stay/pwa';
import StayCatalogView from './StayCatalogView';
import StayCheckoutModal from './StayCheckoutModal';
import StayBillView from './StayBillView';
import StayOrdersView from './StayOrdersView';

interface Props {
  roomToken: string;
  room: ResolvedRoom | null;
}

type View = 'hub' | 'catalog' | 'bill' | 'orders';

/**
 * Phase 3 stay hub: verified header with live Current Tab, category tiles,
 * catalog ordering, universal cart + checkout, live bill and order tracker.
 */
const StayHub = ({ roomToken, room }: Props) => {
  const navigate = useNavigate();
  const [me, setMe] = useState<GuestMe | null>(null);
  const [folio, setFolio] = useState<StayFolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('hub');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordersTick, setOrdersTick] = useState(0);
  const [outletFocus, setOutletFocus] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<
    Array<{ vendorLink: string; outletName: string; open: boolean; etaMins: number; reason: string | null }>
  >([]);
  const cart = useStayCart(me?.stayId ?? null);
  const online = useOnlineStatus();

  // Featured outlet tile: the first outlet delivering to this room.
  useEffect(() => {
    guestStayApi
      .catalog()
      .then((c) =>
        setOutlets(
          c.sources
            .filter((s): s is Extract<typeof s, { type: 'outlet' }> => s.type === 'outlet')
            .map((o) => ({
              vendorLink: o.vendorLink,
              outletName: o.outletName,
              open: o.open,
              etaMins: o.etaMins,
              reason: o.reason,
            })),
        ),
      )
      .catch(() => setOutlets([]));
  }, []);
  const featured = outlets.find((o) => o.open) ?? outlets[0] ?? null;

  // Phase 6: back from Paystack (`?paid=1&reference=…`). Confirm the payment
  // server-side now rather than waiting for the webhook, then tidy the URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const returnedReference = searchParams.get('reference') || searchParams.get('trxref');
  useEffect(() => {
    if (!returnedReference) return;
    let cancelled = false;
    guestStayApi
      .verifyPayment(returnedReference)
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'success') toast.success('Payment received — thank you');
        else toast.info('Your payment is still processing. We will update your bill shortly.');
      })
      .catch(() => {
        if (!cancelled) toast.info('We are confirming your payment; your bill will update shortly.');
      })
      .finally(() => {
        if (cancelled) return;
        setOrdersTick((t) => t + 1);
        void refresh();
        setView('orders');
        const next = new URLSearchParams(searchParams);
        ['paid', 'reference', 'trxref'].forEach((k) => next.delete(k));
        setSearchParams(next, { replace: true });
      });
    return () => {
      cancelled = true;
    };
    // Runs once per returned reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnedReference]);

  const refresh = useCallback(async () => {
    try {
      const [meRes, folioRes] = await Promise.all([guestStayApi.me(), guestStayApi.folio()]);
      setMe(meRes);
      setFolio(folioRes);
    } catch {
      setGuestToken(null);
      navigate('.', { replace: true });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live tab + tracker via socket, with polling fallback while the bill is open.
  useGuestRealtime((event, payload) => {
    void refresh();
    setOrdersTick((t) => t + 1);
    const status = (payload as { status?: string; rejectReason?: string } | null) ?? {};
    if (event === 'order:accepted') toast.success('The restaurant confirmed your order');
    if (event === 'order:rejected') {
      toast.error(`Order not accepted${status.rejectReason ? `: ${status.rejectReason}` : ''}`);
    }
    if (event === 'order:status' && status.status === 'out_for_delivery') {
      toast.info('Your order is on its way');
    }
  });
  useEffect(() => {
    if (view !== 'bill') return;
    const timer = setInterval(() => void refresh(), 8000);
    return () => clearInterval(timer);
  }, [view, refresh]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  const logout = async () => {
    await guestStayApi.logout();
    navigate('/', { replace: true });
  };

  const balance = folio?.totals?.balance ?? 0;

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pb-10">
      {!online && (
        <p role="status" className="rounded-2xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">
          You&apos;re offline — you can browse the saved menu, but ordering and your bill need a connection.
        </p>
      )}
      <header className="rounded-2xl bg-slate-900 p-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-300">Room {room?.roomLabel}</p>
            <h1 className="text-xl font-bold">
              Welcome{me?.firstName ? `, ${me.firstName}` : ''}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setView('bill')}
            className="text-right"
            aria-label={`Current tab ${money(balance)}, open my bill`}
          >
            <p className="text-xs text-slate-300">Current Tab</p>
            <p className="text-lg font-bold">{money(balance)}</p>
          </button>
        </div>
        {cart.lines.length > 0 && (
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="mt-3 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Review cart · {cart.lines.reduce((n, l) => n + l.quantity, 0)} item(s) ·{' '}
            {money(cart.subtotal)}
          </button>
        )}
      </header>

      <nav aria-label="Stay sections" className="grid grid-cols-4 gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold">
        {(
          [
            ['hub', 'Home'],
            ['catalog', 'Order'],
            ['bill', 'My Bill'],
            ['orders', 'Tracker'],
          ] as Array<[View, string]>
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-current={view === v ? 'page' : undefined}
            className={`rounded-full px-2 py-2 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none ${view === v ? 'bg-white shadow' : 'text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {view === 'hub' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setView('catalog')}
              className="rounded-2xl border border-slate-200 bg-white p-3 text-center"
            >
              <p className="text-2xl">🧹</p>
              <p className="mt-1 text-xs font-semibold">Amenities</p>
            </button>
            <button
              type="button"
              onClick={() => setView('catalog')}
              className="rounded-2xl border border-slate-200 bg-white p-3 text-center"
            >
              <p className="text-2xl">💆</p>
              <p className="mt-1 text-xs font-semibold">Spa & More</p>
            </button>
            <button
              type="button"
              disabled={!featured}
              onClick={() => {
                setOutletFocus(featured?.vendorLink ?? null);
                setView('catalog');
              }}
              className={`rounded-2xl border border-slate-200 bg-white p-3 text-center ${featured ? '' : 'opacity-60'}`}
            >
              <p className="text-2xl">🍽️</p>
              <p className="mt-1 text-xs font-semibold">In-Room Dining</p>
              {!featured && <p className="text-[10px] text-slate-400">Not available</p>}
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold">
              Featured{featured ? `: ${featured.outletName}` : ''}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {featured
                ? featured.open
                  ? `🕒 ${featured.etaMins}–${featured.etaMins + 10} mins delivery to Room ${room?.roomLabel ?? ''}`
                  : featured.reason || 'Closed right now'
                : 'Order amenities and experiences straight to your room — charge to your room tab or pay online.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setOutletFocus(featured?.open ? featured.vendorLink : null);
                setView('catalog');
              }}
              className="mt-3 w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {featured?.open ? 'View menu' : 'Browse services'}
            </button>
          </div>
        </>
      )}

      {view === 'catalog' && (
        <StayCatalogView
          cart={cart}
          onCheckout={() => setCheckoutOpen(true)}
          initialOutlet={outletFocus}
        />
      )}
      {view === 'bill' && (
        <StayBillView folio={folio} roomToken={roomToken} onRefresh={() => void refresh()} />
      )}
      {view === 'orders' && (
        <StayOrdersView roomToken={roomToken} onPaid={() => void refresh()} refreshKey={ordersTick} />
      )}

      <button
        type="button"
        onClick={logout}
        className="w-full rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600"
      >
        Lock this device
      </button>

      <StayCheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        roomLabel={room?.roomLabel ?? ''}
        creditLimit={me?.creditLimit ?? 0}
        availableCredit={folio?.totals?.availableCredit ?? me?.creditLimit ?? 0}
        cart={cart}
        roomToken={roomToken}
        online={online}
        onDone={() => {
          setCheckoutOpen(false);
          // Outlet orders wait for confirmation, so the tracker is the useful view.
          setView('orders');
          void refresh();
        }}
      />
    </main>
  );
};

export default StayHub;
