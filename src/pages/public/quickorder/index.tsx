import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/user.service';
import { OrderBuilder, useCreateOrder, useOrderIntent } from '@/features/orders';
import type { CreateOrderLineInput } from '@/features/orders';

interface VendorSummary {
  businessName?: string;
  vendorType?: string;
}

const QuickOrderPage = () => {
  const { vendorId } = useParams();
  const [searchParams] = useSearchParams();
  const unitId = searchParams.get('unit') ?? undefined;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) return;
    let active = true;
    userService
      .getVendor(vendorId)
      .then((data) => active && setVendor(data as VendorSummary))
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [vendorId]);

  const createOrder = useCreateOrder();
  const orderIntent = useOrderIntent();

  const handleSubmit = async (lines: CreateOrderLineInput[]) => {
    if (!vendorId || !lines.length) return;
    try {
      const order = await createOrder.mutateAsync({
        source: 'quick_order',
        vendorId,
        unitId,
        guestName:
          [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email,
        guestEmail: user?.email,
        idempotencyKey: crypto.randomUUID(),
        lines,
      });
      const intent = await orderIntent.mutateAsync(order._id);
      if (intent?.authorization_url) {
        window.location.href = intent.authorization_url;
        return;
      }
      toast.success('Order placed');
      navigate('/bookings');
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not place your order.';
      toast.error(message);
    }
  };

  const vertical = vendor?.vendorType;

  return (
    <>
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto md:mt-[85px] mb-[140px] md:mb-8 max-w-5xl px-4 md:py-8">
        <Link
          to={vertical ? `/${vertical === 'club' ? 'clubs' : 'restaurants'}/${vendorId}` : '/'}
          className="text-xs text-gray-500 hover:text-[#0A6C6D]"
        >
          ← Back to venue
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-gray-900">
          Quick order{vendor?.businessName ? ` · ${vendor.businessName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Order without a reservation{unitId ? ' · table scanned' : ''}.
        </p>

        {loading ? (
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-gray-100" />
        ) : !vendorId || vertical === 'hotel' ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
            This venue does not support quick orders.
          </div>
        ) : (
          <OrderBuilder
            vendorId={vendorId}
            vertical={vertical}
            submitLabel="Place order"
            submitting={createOrder.isPending || orderIntent.isPending}
            onSubmit={handleSubmit}
          />
        )}
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
};

export default QuickOrderPage;
