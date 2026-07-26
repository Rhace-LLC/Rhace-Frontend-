import React, { useState, useEffect, useCallback } from 'react';
import { userService } from '@/services/user.service';

const statusStyles = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  partly_paid: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  pay_later: 'bg-blue-100 text-blue-800 border-blue-200',
  not_paid: 'bg-gray-100 text-gray-600 border-gray-200',
  refunded: 'bg-purple-100 text-purple-800 border-purple-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const reservationStyles = {
  upcoming: 'bg-teal-50 text-teal-700 border-teal-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-gray-100 text-gray-600 border-gray-200',
};

const typeLabels = {
  hotelReservation: 'Hotel',
  restaurantReservation: 'Restaurant',
  clubReservation: 'Club / Lounge',
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${className}`}>
    {children}
  </span>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
  </div>
);

const SectionCard = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const BookingOverviewVendorPOV = ({ bookingId }) => {
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.fetchFullReservation(bookingId);
      setBookingDetails(response.data);
    } catch (err) {
      setError('Failed to fetch booking details.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId, fetchBookingDetails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <button
            onClick={fetchBookingDetails}
            className="mt-3 text-sm text-teal-600 hover:text-teal-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!bookingDetails) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-gray-400">No booking details found.</p>
      </div>
    );
  }

  const {
    customerName,
    customerEmail,
    bookingCode,
    resId,
    reservationType,
    paymentStatus,
    reservationStatus,
    totalAmount,
    payLater,
    paymentRefs,
    rooms,
    tables,
    drinks,
    combos,
    menus,
    cancelledAt,
    cancellationReason,
    cancelledBy,
    refundAmount,
    confirmedAt,
  } = bookingDetails;

  const amountPaid = paymentRefs
    ? paymentRefs.reduce((sum, ref) => sum + (ref.amountPaid || ref.amount || 0), 0)
    : 0;
  const outstandingAmount = Math.max(0, totalAmount - amountPaid);
  const isFullyPaid = paymentStatus === 'paid' || (amountPaid >= totalAmount && totalAmount > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {customerName || 'Unknown Customer'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {bookingCode} &middot; {resId}
          </p>
        </div>
        <Badge className="capitalize" className={typeLabels[reservationType] ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
          {typeLabels[reservationType] || reservationType}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <SectionCard title="Customer">
          <InfoRow label="Name" value={customerName || 'N/A'} />
          <InfoRow label="Email" value={customerEmail || 'N/A'} />
        </SectionCard>

        {/* Payment Summary */}
        <SectionCard title="Payment">
          <InfoRow
            label="Total"
            value={formatCurrency(totalAmount)}
          />
          <InfoRow
            label="Paid"
            value={formatCurrency(amountPaid)}
          />
          {!isFullyPaid && (
            <InfoRow
              label="Outstanding"
              value={formatCurrency(outstandingAmount)}
            />
          )}
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-500">Status</span>
            <Badge className={statusStyles[paymentStatus] || 'bg-gray-100 text-gray-600 border-gray-200'}>
              {paymentStatus?.replace(/_/g, ' ') || 'N/A'}
              {payLater && ' (Pay Later)'}
            </Badge>
          </div>
        </SectionCard>

        {/* Reservation Status */}
        <SectionCard title="Reservation">
          <InfoRow label="Status" value={
            <Badge className={reservationStyles[reservationStatus] || 'bg-gray-100 text-gray-600 border-gray-200'}>
              {reservationStatus || 'N/A'}
            </Badge>
          } />
          {confirmedAt && <InfoRow label="Confirmed" value={formatDate(confirmedAt)} />}
          {cancelledAt && <InfoRow label="Cancelled" value={formatDate(cancelledAt)} />}
          {cancellationReason && <InfoRow label="Reason" value={cancellationReason} />}
          {cancelledBy && <InfoRow label="Cancelled by" value={cancelledBy} />}
          {refundAmount > 0 && <InfoRow label="Refund" value={formatCurrency(refundAmount)} />}
        </SectionCard>

        {/* Reservation Type Details */}
        {reservationType === 'hotelReservation' && rooms?.length > 0 && (
          <SectionCard title={`Rooms (${rooms.length})`}>
            {rooms.map((room, i) => (
              <div key={i} className="mb-3 last:mb-0 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{room.roomId?.name || 'N/A'}</p>
                <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                  <p>Qty: {room.quantity} &middot; Guests: {room.guests}</p>
                  <p>{formatDate(room.checkInDate)} → {formatDate(room.checkOutDate)}</p>
                </div>
              </div>
            ))}
          </SectionCard>
        )}

        {reservationType === 'clubReservation' && (
          <SectionCard title="Club Details">
            {tables?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Tables</p>
                {tables.map((t, i) => (
                  <p key={i} className="text-sm text-gray-700 ml-1">
                    {t.tableType?.name || 'N/A'} &times;{t.quantity}
                  </p>
                ))}
              </div>
            )}
            {drinks?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Drinks</p>
                {drinks.map((d, i) => (
                  <p key={i} className="text-sm text-gray-700 ml-1">
                    {d.drink?.name || 'N/A'} &times;{d.quantity}
                  </p>
                ))}
              </div>
            )}
            {combos?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Combos</p>
                {combos.map((c, i) => (
                  <p key={i} className="text-sm text-gray-700 ml-1">
                    {c.name || 'N/A'}
                  </p>
                ))}
              </div>
            )}
            {!tables?.length && !drinks?.length && !combos?.length && (
              <p className="text-sm text-gray-400">No club details available.</p>
            )}
          </SectionCard>
        )}

        {reservationType === 'restaurantReservation' && menus?.length > 0 && (
          <SectionCard title={`Menu Items (${menus.length})`}>
            {menus.map((m, i) => (
              <div key={i} className="mb-3 last:mb-0 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{m.menu?.name || 'N/A'}</p>
                <p className="text-xs text-gray-500 mt-0.5">Qty: {m.quantity}</p>
                {m.specialRequest && (
                  <p className="text-xs text-gray-400 mt-1 italic">"{m.specialRequest}"</p>
                )}
              </div>
            ))}
          </SectionCard>
        )}
      </div>
    </div>
  );
};

export default BookingOverviewVendorPOV;
