import { paymentService } from '@/services/payment.service';
import React, { useState, type ChangeEvent, type FormEvent } from 'react';

interface RecordOfflinePaymentModalProps {
  reservationId?: string;
  /** New unit engine: the BookingGroup is the payment subject. */
  groupId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response?: unknown) => void;
}

interface OfflinePaymentForm {
  reservationId: string;
  amount: string | number;
  method: string;
  reference: string;
  note: string;
}

export default function RecordOfflinePaymentModal({
  reservationId: propReservationId,
  groupId,
  isOpen,
  onClose,
  onSuccess,
}: RecordOfflinePaymentModalProps) {
  const [formData, setFormData] = useState<OfflinePaymentForm>({
    reservationId: propReservationId || '',
    amount: '',
    method: 'cash',
    reference: '',
    note: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

    const resId = formData.reservationId || propReservationId;
    const { reservationId: _, ...payload } = formData;

    try {
      const response = groupId
        ? await paymentService.recordGroupOfflinePayment(groupId, {
            amount: Number(payload.amount),
            method: payload.method,
            reference: payload.reference,
            note: payload.note,
          })
        : await paymentService.recordOfflinePayment(resId, payload);
      if (onSuccess) onSuccess(response);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to record payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">

        {/* Modal Header */}
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h2 className="text-xl font-semibold text-gray-800">Record Offline Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Amount Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <input
              type="number"
              name="amount"
              required
              min="0"
              step="any"
              value={formData.amount}
              onChange={handleChange}
              placeholder="25000"
              className="mt-1 w-full rounded-md border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Reservation ID Field */}
          {!propReservationId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Reservation / Booking ID</label>
              <input
                type="text"
                name="reservationId"
                required
                value={formData.reservationId}
                onChange={handleChange}
                placeholder="Enter booking ID"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Method Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              name="method"
              value={formData.method}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="pos">POS</option>
            </select>
          </div>

          {/* Reference Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Reference</label>
            <input
              type="text"
              name="reference"
              required
              value={formData.reference}
              onChange={handleChange}
              placeholder="e.g. REC-001"
              className="mt-1 w-full rounded-md border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Note Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Note</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="e.g. Paid at the venue"
              className="mt-1 w-full rounded-md border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Submit Payment'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
