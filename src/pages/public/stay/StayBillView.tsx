import { useState } from 'react';
import { toast } from 'react-toastify';
import { money } from '@/features/orders/money';
import { guestStayApi, type StayFolio } from '@/services/stay.service';

const TYPE_LABEL: Record<string, string> = {
  charge: 'Charge',
  fee: 'Fee',
  payment: 'Payment',
  adjustment: 'Adjustment',
  reversal: 'Reversal',
};

/** Live tab dashboard ("My Bill") with online settlement (Phase 6). */
const StayBillView = ({
  folio,
  roomToken,
  onRefresh,
}: {
  folio: StayFolio | null;
  roomToken: string;
  onRefresh: () => void;
}) => {
  const totals = folio?.totals;
  const due = totals?.balance ?? 0;
  const [partial, setPartial] = useState('');
  const [showPartial, setShowPartial] = useState(false);
  const [paying, setPaying] = useState(false);
  const canPay = Boolean(folio?.folio) && folio?.folio?.status !== 'closed' && due > 0;

  const settle = async (amount?: number) => {
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 1 || amount > due)) {
      toast.error(`Enter an amount between ${money(1)} and ${money(due)}.`);
      return;
    }
    try {
      setPaying(true);
      const intent = await guestStayApi.folioPay(roomToken, amount);
      window.location.href = intent.authorization_url;
    } catch (e) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not start the payment.',
      );
      setPaying(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-slate-900 p-4 text-white">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-300">Balance due</p>
          <button type="button" onClick={onRefresh} className="text-xs text-slate-300 underline">
            Refresh
          </button>
        </div>
        <p className="text-2xl font-bold">{money(totals?.balance ?? 0)}</p>
        <p className="mt-1 text-xs text-slate-300">
          Paid {money(totals?.postedPayments ?? 0)} · available credit{' '}
          {money(totals?.availableCredit ?? 0)}
        </p>
        {(totals?.draftCharges ?? 0) > 0 && (
          <p className="mt-0.5 text-xs text-slate-400">
            {money(totals?.draftCharges ?? 0)} awaiting restaurant confirmation (not due yet)
          </p>
        )}
        {canPay && (
          <div className="mt-3 space-y-2">
            <button
              type="button"
              disabled={paying}
              onClick={() => void settle()}
              className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
            >
              {paying ? 'Opening payment…' : `Settle ${money(due)} now`}
            </button>
            {showPartial ? (
              <div className="flex gap-2">
                <input
                  value={partial}
                  onChange={(e) => setPartial(e.target.value)}
                  inputMode="decimal"
                  placeholder="Amount"
                  className="min-w-0 flex-1 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-white placeholder:text-slate-400"
                />
                <button
                  type="button"
                  disabled={paying || !partial}
                  onClick={() => void settle(Number(partial))}
                  className="rounded-full border border-slate-500 px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                >
                  Pay part
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPartial(true)}
                className="w-full text-xs text-slate-300 underline"
              >
                Pay part of it instead
              </button>
            )}
          </div>
        )}
      </div>

      {!folio?.folio || folio.entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Nothing on your tab yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {folio.entries.map((e) => (
            <li key={e._id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {TYPE_LABEL[e.type] ?? e.type}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      e.status === 'posted'
                        ? 'bg-green-100 text-green-700'
                        : e.status === 'voided'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {e.status}
                  </span>
                </p>
                <p className={`text-sm font-bold ${e.amount < 0 ? 'text-green-700' : ''}`}>
                  {e.amount < 0 ? '−' : ''}
                  {money(Math.abs(e.amount))}
                </p>
              </div>
              {e.description && <p className="mt-0.5 text-xs text-slate-500">{e.description}</p>}
              <p className="mt-0.5 text-[11px] text-slate-400">
                {e.postedAt ? new Date(e.postedAt).toLocaleString() : ''}
                {e.revenueCode ? ` · ${e.revenueCode}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StayBillView;
