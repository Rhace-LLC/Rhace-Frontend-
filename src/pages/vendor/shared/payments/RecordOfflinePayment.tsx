import { paymentService } from '@/services/payment.service';
import { Modal } from '@/components/others/RhaceModal';
import { money } from '@/features/reservations';
import React, { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

interface RecordOfflinePaymentModalProps {
  reservationId?: string;
  /** New unit engine: the BookingGroup is the payment subject. */
  groupId?: string;
  /** Shown in the header so staff know which booking this is for. */
  bookingLabel?: string;
  /** Outstanding balance — pre-fills the amount. */
  dueAmount?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response?: unknown) => void;
}

interface OfflinePaymentForm {
  amount: string | number;
  method: string;
  reference: string;
  note: string;
}

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'pos', label: 'POS' },
];

const inputClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';
const labelClass = 'type-res-small mb-1.5 block font-medium text-res-ink-muted';

export default function RecordOfflinePaymentModal({
  reservationId: propReservationId,
  groupId,
  bookingLabel,
  dueAmount,
  isOpen,
  onClose,
  onSuccess,
}: RecordOfflinePaymentModalProps) {
  const [formData, setFormData] = useState<OfflinePaymentForm>({
    amount: '',
    method: 'cash',
    reference: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh form per booking; pre-fill what the guest still owes.
  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: dueAmount && dueAmount > 0 ? dueAmount : '',
        method: 'cash',
        reference: '',
        note: '',
      });
      setError(null);
    }
  }, [isOpen, groupId, propReservationId, dueAmount]);

  const generateReference = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    setFormData((prev) => ({ ...prev, reference: `REC-${code}` }));
  };

  if (!isOpen) return null;

  // The booking is always known here (picked from the list) — no ID input.
  const resId = propReservationId;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = groupId
        ? await paymentService.recordGroupOfflinePayment(groupId, {
            amount: Number(formData.amount),
            method: formData.method,
            reference: formData.reference,
            note: formData.note,
          })
        : await paymentService.recordOfflinePayment(resId as string, {
            amount: formData.amount,
            method: formData.method,
            reference: formData.reference,
            note: formData.note,
          } as Record<string, unknown>);
      if (onSuccess) onSuccess(response);
      onClose();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to record payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record payment"
      subtitle={bookingLabel ?? 'Cash, transfer or POS received at the venue'}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="record-offline-payment"
            disabled={loading}
            className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Recording…' : 'Record payment'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="type-res-small rounded-res-md bg-res-surface px-4 py-3 font-medium text-res-ink">
            {error}
          </div>
        )}

        {typeof dueAmount === 'number' && dueAmount > 0 && (
          <div className="flex items-center justify-between rounded-res-md bg-res-secondary px-4 py-3">
            <span className="type-res-small font-medium text-res-ink-muted">Still to pay</span>
            <span className="type-res-h3 text-res-brand">{money(dueAmount)}</span>
          </div>
        )}

        <form id="record-offline-payment" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="offline-amount">
              Amount received
            </label>
            <input
              id="offline-amount"
              type="number"
              name="amount"
              required
              min="0"
              step="any"
              value={formData.amount}
              onChange={handleChange}
              placeholder="25000"
              className={inputClass}
            />
          </div>

          <div>
            <span className={labelClass}>How did they pay?</span>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((method) => {
                const isActive = formData.method === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, method: method.id }))}
                    aria-pressed={isActive}
                    className={`type-res-small cursor-pointer rounded-full px-4 py-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                      isActive
                        ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                        : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
                    }`}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="type-res-small font-medium text-res-ink-muted" htmlFor="offline-reference">
                Receipt / transfer reference
              </label>
              <button
                type="button"
                onClick={generateReference}
                className="type-res-small cursor-pointer rounded-full bg-res-surface px-3 py-1.5 font-semibold text-res-brand transition-colors outline-none hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                Generate reference
              </button>
            </div>
            <input
              id="offline-reference"
              type="text"
              name="reference"
              required
              value={formData.reference}
              onChange={handleChange}
              placeholder="e.g. REC-001"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="offline-note">
              Note <span className="font-normal">(optional)</span>
            </label>
            <textarea
              id="offline-note"
              name="note"
              rows={2}
              value={formData.note}
              onChange={handleChange}
              placeholder="e.g. Paid at the front desk"
              className={inputClass}
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}
