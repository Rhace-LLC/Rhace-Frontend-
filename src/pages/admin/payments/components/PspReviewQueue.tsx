import { useEffect, useState } from 'react';
import { Inbox, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getReviewQueue,
  retryStripeTransfer,
  type ReviewQueueItem,
} from '@/services/admin.service';

const moneyFor = (value: number, currency: string) =>
  currency === 'NGN' ? `₦${Number(value || 0).toLocaleString()}` : `${currency} ${Number(value || 0).toLocaleString()}`;

const PspReviewQueue = () => {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const res = await getReviewQueue({ limit: 20 });
      setItems(res.data.items);
      setTotal(res.data.pagination.total);
    } catch {
      toast.error('Unable to load the review queue');
    }
  };

  useEffect(() => {
    void fetchQueue();
  }, []);

  const retry = async (paymentId: string) => {
    setRetrying(paymentId);
    try {
      await retryStripeTransfer(paymentId);
      toast.success('Transfers retried');
      await fetchQueue();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Retry failed'
      );
    } finally {
      setRetrying(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-res-lg border border-res-line bg-res-card shadow-res-low p-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Inbox className="h-5 w-5" />
        Review queue is clear — no payments need attention.
      </div>
    );
  }

  return (
    <div className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
      <div className="p-6 border-b">
        <h2 className="font-semibold text-lg">Needs review ({total})</h2>
        <p className="text-sm text-muted-foreground">
          Under/over-payments, failed vendor transfers and disputes. Finance owns this list.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left">Payment</th>
              <th className="px-5 py-3 text-left">Provider</th>
              <th className="px-5 py-3 text-left">Amount</th>
              <th className="px-5 py-3 text-left">Reason</th>
              <th className="px-5 py-3 text-left">Vendor</th>
              <th className="px-5 py-3 text-left">Age</th>
              <th className="px-5 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.paymentId} className="border-t">
                <td className="px-5 py-3 font-mono text-xs">…{item.paymentId.slice(-8)}</td>
                <td className="px-5 py-3 capitalize">{item.provider ?? '—'}</td>
                <td className="px-5 py-3 font-medium">{moneyFor(item.amountPaid, item.currency)}</td>
                <td className="px-5 py-3 max-w-xs truncate" title={item.reviewReason ?? ''}>
                  {item.reviewReason ?? '—'}
                </td>
                <td className="px-5 py-3">{item.vendorName ?? '—'}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  {item.provider === 'stripe' ? (
                    <button
                      type="button"
                      disabled={retrying === item.paymentId}
                      onClick={() => void retry(item.paymentId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {retrying === item.paymentId ? 'Retrying…' : 'Retry transfers'}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Manual</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PspReviewQueue;
