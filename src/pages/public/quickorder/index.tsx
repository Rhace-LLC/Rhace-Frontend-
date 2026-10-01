import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/user.service';
import { floorPlanService } from '@/services/floorPlan.service';
import {
  OrderBuilder,
  OrderPaymentChoiceModal,
  useCreateOrder,
  type OrderDto,
} from '@/features/orders';
import type { CreateOrderLineInput } from '@/features/orders';

interface VendorSummary {
  businessName?: string;
  vendorType?: string;
}

interface TableOption {
  id: string;
  label: string;
}

/** "T1" → "Table T1"; leaves labels that already start with "Table" alone. */
function tableName(label: string): string {
  return /^table\b/i.test(label.trim()) ? label : `Table ${label}`;
}

const QuickOrderPage = () => {
  const { vendorId } = useParams();
  const [searchParams] = useSearchParams();
  // Table attached via a scanned per-table QR code; absent when the guest
  // arrives from the venue details page "Quick order" button.
  const qrUnitId = searchParams.get('unit') ?? undefined;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOrder, setPayOrder] = useState<OrderDto | null>(null);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  useEffect(() => {
    if (!vendorId) return;
    let active = true;
    userService
      .getVendor(vendorId)
      // getVendor resolves the response body ({ status, data }) — the venue
      // itself lives on .data (other pages read res.data the same way).
      .then((body) => active && setVendor(((body as { data?: VendorSummary })?.data ?? body) as VendorSummary))
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [vendorId]);

  // Table picker for guests who did not scan a table QR code: the table
  // number is pasted on the physical table, so they can pick it themselves.
  // Still loaded for scanned guests so the header can name their table.
  useEffect(() => {
    if (!vendorId) return;
    let active = true;
    setTablesLoading(true);
    floorPlanService
      .listForVendor(vendorId)
      .then(async (res) => {
        const plans = res.data?.items ?? [];
        const layouts = await Promise.all(plans.map((plan) => floorPlanService.getPublicLayout(plan._id)));
        if (!active) return;
        const seen = new Map<string, string>();
        for (const layout of layouts) {
          for (const unit of layout.data?.units ?? []) {
            if (!seen.has(unit._id) && unit.label) seen.set(unit._id, unit.label);
          }
        }
        const options = [...seen.entries()]
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
        setTables(options);
      })
      .catch(() => {
        // Ordering still works without a table; the kitchen just won't see one.
        if (active) setTables([]);
      })
      .finally(() => active && setTablesLoading(false));
    return () => {
      active = false;
    };
  }, [vendorId]);

  const scannedTableLabel = useMemo(() => {
    if (!qrUnitId) return null;
    const match = tables.find((t) => t.id === qrUnitId);
    return match ? match.label : null;
  }, [tables, qrUnitId]);

  const createOrder = useCreateOrder();

  const handleSubmit = async (lines: CreateOrderLineInput[]) => {
    if (!vendorId || !lines.length) return;
    // QR scan locks the table; otherwise the guest must pick one first
    // (when the venue has tables to pick from).
    if (!qrUnitId && tables.length > 0 && !selectedUnitId) {
      toast.error('Please select the table you are on first.');
      return;
    }
    try {
      const order = await createOrder.mutateAsync({
        source: 'quick_order',
        vendorId,
        unitId: qrUnitId ?? selectedUnitId ?? undefined,
        guestName:
          [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email,
        guestEmail: user?.email,
        idempotencyKey: crypto.randomUUID(),
        lines,
      });
      setPayOrder(order);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not place your order.';
      toast.error(message);
    }
  };

  const handlePaidAtVenue = () => {
    setPayOrder(null);
    toast.success('Order placed — your waiter will collect payment at your table.');
    navigate('/orders');
  };

  const vertical = vendor?.vendorType?.toLowerCase();

  const venuePath =
    vertical === 'club'
      ? `/clubs/${vendorId}`
      : vertical === 'hotel'
        ? `/hotels/${vendorId}`
        : vertical
          ? `/restaurants/${vendorId}`
          : '/';

  return (
    <>
      <Header />
      <div aria-hidden className="h-[96px] md:hidden" />
      <main className="mx-auto md:mt-[85px] mb-[140px] md:mb-8 max-w-5xl px-4 md:py-8">
        <Link
          to={venuePath}
          className="text-xs text-gray-500 hover:text-[#0A6C6D]"
        >
          ← Back to venue
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-gray-900">
          Quick order{vendor?.businessName ? ` · ${vendor.businessName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Order without a reservation
          {qrUnitId
            ? scannedTableLabel
              ? ` · You're on ${tableName(scannedTableLabel)}`
              : ' · table scanned'
            : ''}.
        </p>

        {loading ? (
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-gray-100" />
        ) : !vendorId || vertical === 'hotel' ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
            This venue does not support quick orders.
          </div>
        ) : (
          <>
            {!qrUnitId && (tablesLoading || tables.length > 0) && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                <label
                  htmlFor="quick-order-table"
                  className="text-sm font-semibold text-gray-900"
                >
                  Which table are you on?
                </label>
                <p className="mt-0.5 text-xs text-gray-500">
                  The table number is pasted on your table.
                </p>
                <select
                  id="quick-order-table"
                  value={selectedUnitId}
                  disabled={tablesLoading}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="mt-2 w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0A6C6D] disabled:cursor-wait disabled:opacity-60"
                >
                  <option value="">
                    {tablesLoading ? 'Loading tables…' : 'Select your table…'}
                  </option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {tableName(table.label)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <OrderBuilder
              vendorId={vendorId}
              vertical={vertical}
              submitLabel="Place order"
              submitting={createOrder.isPending}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <OrderPaymentChoiceModal
        order={payOrder}
        onClose={() => setPayOrder(null)}
        onPaidAtVenue={handlePaidAtVenue}
      />
    </>
  );
};

export default QuickOrderPage;
