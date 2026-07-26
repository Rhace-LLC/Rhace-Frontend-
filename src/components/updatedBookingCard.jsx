import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  CreditCard,
  Download,
  Edit,
  Home,
  Loader2,
  MapPin,
  MoreVertical,
  Receipt,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { paymentService } from '@/services/payment.service';
import RenderCustomerQR from './RenderCustomerQR';
import { SvgIcon, SvgIcon2, SvgIcon3 } from '@/public/icons/icons';
import { toast } from 'sonner';

const paymentModeMap = {
  full_payment: { label: 'Full Payment', color: 'bg-green-100 text-green-700 border-green-200' },
  partial_payment: { label: 'Partial Payment', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  hotel_deposit: { label: 'Hotel Deposit', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  pay_later: { label: 'Pay at Property', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

const paymentStatusMap = {
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700 border-green-200' },
  fully_paid: { label: 'Fully Paid', color: 'bg-green-100 text-green-700 border-green-200' },
  partly_paid: { label: 'Partly Paid', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  pending: { label: 'Awaiting Payment', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  unpaid: { label: 'Unpaid', color: 'bg-red-100 text-red-700 border-red-200' },
  pay_later: { label: 'Pay at Property', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};

const paymentMethodMap = {
  card: 'Card',
  bank_transfer: 'Transfer',
  transfer: 'Transfer',
  ussd: 'USSD',
  qr: 'QR',
  mobile_money: 'Mobile Money',
};

function BookingCard({ booking, onEdit, onCancel }) {
  const navigate = useNavigate();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);

  const payment = booking.paymentRefs?.length > 0 ? booking.paymentRefs[0] : null;

  const paymentMode = paymentModeMap[payment?.paymentMode] ?? {
    label: 'Payment',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const paymentStatus = paymentStatusMap[booking?.paymentStatus] ?? {
    label: booking?.paymentStatus?.replace('_', ' ')?.toUpperCase(),
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const checkInDate = booking.rooms?.[0]?.checkInDate || booking.date;
  const daysUntilCheckIn = checkInDate
    ? Math.ceil((new Date(checkInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const checkInContext = (() => {
    if (daysUntilCheckIn === null) return null;
    if (daysUntilCheckIn < 0) return `Checked in ${formatDate(checkInDate)}`;
    if (daysUntilCheckIn === 0) return 'Today';
    if (daysUntilCheckIn === 1) return 'Tomorrow';
    return `${daysUntilCheckIn} days left`;
  })();

  const roomNames = booking.rooms
    ?.map(r => (typeof r.roomId === 'object' ? r.roomId?.name : null))
    .filter(Boolean)
    .join(', ');

  const actionButtonText = ['confirmed', 'cancelled'].includes(booking?.reservationStatus)
    ? 'Leave Review'
    : 'View Details';

  function formatCurrency(amount = 0) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: payment?.currency ?? 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatReservationType(type) {
    if (!type) return '';
    const normalized = type.toLowerCase();
    if (normalized.includes('hotel')) return 'Hotel';
    if (normalized.includes('restaurant')) return 'Restaurant';
    if (normalized.includes('club')) return 'Club';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function getReservationIcon(type) {
    if (!type) return <Home className="w-4 h-4 flex-shrink-0 text-black" />;
    const normalized = type.toLowerCase();
    if (normalized.includes('hotel')) return <SvgIcon2 className="w-4 h-4 flex-shrink-0 text-black" />;
    if (normalized.includes('restaurant')) return <SvgIcon className="w-4 h-4 flex-shrink-0 text-black" />;
    if (normalized.includes('club')) return <SvgIcon3 className="w-4 h-4 flex-shrink-0 text-black" />;
    return <Home className="w-4 h-4 flex-shrink-0 text-black" />;
  }

  function getReservationStatusColor(status) {
    if (!status) return 'bg-gray-100 text-gray-700 border-gray-300';
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-300';
      case 'upcoming': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'no_show': return 'bg-orange-100 text-orange-700 border-orange-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  

  function formatMethodLabel(method) {
    return paymentMethodMap[method] ?? method?.replace('_', ' ') ?? '-';
  }

  const handleDownloadInvoice = () => {
    console.log('Download invoice:', booking._id);
    setShowDropdown(false);
  };

  const handleCancelBooking = async () => {
    setCancelLoading(true);
    try {
      await onCancel(booking._id);
    } catch (err) {
      console.log(err);
    } finally {
      setCancelLoading(false);
      setShowCancel(false);
    }
  };

  const handleBalancePayment = async () => {
    setPaymentLoading(true);
    try {
      const response = await paymentService.initializeSubsequentPayment(booking._id);
      const url = response?.authorization_url ?? response?.data?.authorization_url;
      if (url) {
        window.location.href = url;
        return;
      }
      toast.info('Unable to initialize payment.');
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.message ?? err?.message ?? 'Unable to initialize payment.';
      toast.error(message);
    } finally {
      setPaymentLoading(false);
      setShowPaymentDialog(false);
    }
  };

  const handleViewBooking = () => {
    if (actionButtonText === 'Leave Review' && booking.reservationType?.includes?.('Reservation')) {
      navigate(
        `/${booking.reservationType.slice(0, booking.reservationType.indexOf('Reservation')).toLowerCase()}s/${booking.vendor._id}#reviews`
      );
    } else {
      navigate(`/bookings/${booking._id}`);
    }
  };

  const handleCopyCode = async () => {
    if (!booking.bookingCode) return;
    try {
      await navigator.clipboard.writeText(booking.bookingCode);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleOpenVendor = () => {
    navigate(`/${booking.vendor.vendorType}/${booking.vendor._id}`);
  };

  
  ////////////////////////////////////////////////////////////
// PAYMENTS
////////////////////////////////////////////////////////////

const payments = useMemo(() => {
  return [...(booking.paymentRefs || [])]
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(a.createdAt) -
        new Date(b.createdAt)
    );
}, [booking.paymentRefs]);

const successfulPayments = payments.filter(
  p => p.status === "success"
);

const pendingBalancePayment = payments.find(
  p =>
    p.paymentMode === "balance_payment" &&
    p.status === "pending"
);

const latestPayment =
  payments.length > 0
    ? payments[payments.length - 1]
    : null;

const totalAmount =
  latestPayment?.totalAmount ??
  booking.totalAmount ??
  0;

const amountPaid = successfulPayments.reduce(
  (sum, payment) => sum + (payment.amountPaid || 0),
  0
);

const balance = Math.max(
  totalAmount - amountPaid,
  0
);

const paymentPercentage =
  totalAmount > 0
    ? Math.min(
        100,
        Math.round(
          (amountPaid / totalAmount) * 100
        )
      )
    : 0;

const fullyPaid = balance <= 0;

const shouldShowBalanceButton =
  !fullyPaid &&
  !pendingBalancePayment &&
  booking.paymentStatus !== "pay_later";

const hasPendingBalancePayment =
  !!pendingBalancePayment;

const shouldShowAwaitingBanner =
  !fullyPaid &&
  amountPaid > 0;

const latestSuccessfulPayment =
  successfulPayments.length > 0
    ? successfulPayments[
        successfulPayments.length - 1
      ]
    : null;

    
  const shouldShowBreakdown = payment && totalAmount > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden relative">

      {/* Cover */}
      <div className="relative">
        <img
          src={booking.vendor.profileImages?.[0]}
          alt={booking.vendor.businessName}
          className="w-full h-52 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div>
            <h2 className="text-white text-xl font-bold">
              {booking.vendor.businessName}
            </h2>
            <button
              onClick={handleOpenVendor}
              className="text-white/90 hover:text-white text-sm underline"
            >
              View Vendor
            </button>
          </div>
          
          <Badge className={paymentStatus.color}>
            {paymentStatus.label}
          </Badge>
        </div>
                <div className="text-white bg-black text-center">
                Booking ID: {booking?._id}
                </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">

        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-2">
            {getReservationIcon(booking.reservationType)}
            {formatReservationType(booking.reservationType)}
          </Badge>
          <Badge className={getReservationStatusColor(booking.reservationStatus)}>
            {booking.reservationStatus?.replaceAll('_', ' ')}
          </Badge>
        </div>
        {/* Info grid  if HOTEL IS THE RESERVATION TYPE
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-teal-700" />
            <div>
              <p className="text-xs text-gray-500">Reservation Date</p>
              <p className="font-medium">
                {checkInContext
                  ? `${checkInContext}${daysUntilCheckIn >= 0 && daysUntilCheckIn !== null ? ` (${formatDate(checkInDate)})` : ''}`
                  : formatDate(checkInDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-teal-700" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="font-medium truncate">{booking.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-teal-700" />
            <div>
              <p className="text-xs text-gray-500">Guests & Room</p>
              <p className="font-medium">
                {booking.guests} Guest{booking.guests > 1 ? 's' : ''}
                {roomNames ? `, ${roomNames}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-teal-700" />
            <div>
              <p className="text-xs text-gray-500">Booking Code</p>
              <p className="font-semibold flex items-center gap-1">
                {booking.bookingCode}
                <button
                  onClick={handleCopyCode}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Copy booking code"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </p>
            </div>
          </div>
        </div>
*/}
        {/* Payment section */}
        {payment && (
          <div className="rounded-xl border bg-gradient-to-br from-slate-50 to-white">
            <div className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wallet className="text-teal-700 w-5 h-5" />
                  <h3 className="font-semibold">Payment Summary</h3>
                </div>
                <Badge className={paymentStatus.color}>
                  {paymentStatus.label}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
                  <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Paid</p>
                  <p className="text-lg font-semibold text-green-700">{formatCurrency(amountPaid)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Balance</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(balance)}</p>
                </div>
              </div>

              {/* Progress bar */}
              {totalAmount > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{paymentPercentage}% Paid</span>
                    <span className="text-gray-500">{formatCurrency(amountPaid)} of {formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-teal-700 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${paymentPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Awaiting Balance banner */}
              {shouldShowAwaitingBanner && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-3 text-amber-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Awaiting Balance Payment</span>
                </div>
              )}

              {/* Fully Paid banner */}
              {fullyPaid && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 py-3 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Reservation Fully Paid</span>
                </div>
              )}
              {/* Pay Balance button */}
              {shouldShowBalanceButton && (
                <Button
                  className="mt-5 w-full"
                  onClick={() => setShowPaymentDialog(true)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Remaining Balance ({formatCurrency(balance)})
                </Button>
              )}

              {/* Pending balance payment hint */}
              {hasPendingBalancePayment && !fullyPaid && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 py-3 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Balance payment pending</span>
                </div>
              )}
            </div>
          </div>
        )}

              <button
  onClick={() => setShowPaymentBreakdown(!showPaymentBreakdown)}
  className="text-sm text-gray-600 hover:text-black transition-colors duration-200"
>
  {showPaymentBreakdown ? "Hide Payment Breakdown" : "Show Payment Breakdown"}
</button>
{showPaymentBreakdown && (
  <div className="mt-5 border-t pt-5 space-y-4">

    {payments.map((payment, index) => (
      <div
        key={payment._id}
        className="rounded-lg border p-4 bg-white"
      >
        <div className="flex justify-between items-center">

          <div>
            <p className="font-semibold">
              Payment #{index + 1}
            </p>

            <p className="text-xs text-gray-500">
              {paymentModeMap[payment.paymentMode]?.label ??
                payment.paymentMode}
            </p>
          </div>

          <Badge
            className={
              paymentStatusMap[payment.status]?.color ??
              "bg-gray-100"
            }
          >
            {paymentStatusMap[payment.status]?.label ??
              payment.status}
          </Badge>

        </div>

        <div className="grid grid-cols-2 gap-y-2 text-sm mt-4">

          <span className="text-gray-500">
            Amount
          </span>

          <span className="font-medium text-right">
            {formatCurrency(payment.amountPaid)}
          </span>

          <span className="text-gray-500">
            Method
          </span>

          <span className="text-right capitalize">
            {formatMethodLabel(
              payment.paymentMethod
            )}
          </span>

          <span className="text-gray-500">
            Reference
          </span>

          <span className="text-right font-mono text-xs break-all">
            {payment.paystackReference}
          </span>

          <span className="text-gray-500">
            Paid
          </span>

          <span className="text-right">
            {formatDate(payment.paidAt)}
          </span>

        </div>
      </div>
    ))}

  </div>
)}


        {/* Bottom actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <RenderCustomerQR reservation={booking} />
          <div className="flex items-center gap-3">
            {
                /*
                
            <Button variant="outline" onClick={handleDownloadInvoice}>
              <Download className="mr-2 h-4 w-4" />
              Invoice
            </Button>
                */
            }
            <Button onClick={handleViewBooking}>
              {actionButtonText}
            </Button>
          </div>
        </div>
      </div>

      {/* Top-right dropdown */}
      <div className="absolute top-4 right-4">
        <div className="relative">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-xl z-20 overflow-hidden">
                {
                    /*
                    <button
                  onClick={() => { setShowDropdown(false); onEdit?.(booking._id); }}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <Edit className="w-4 h-4" />
                  Edit Booking
                </button>
                <button
                  onClick={() => { setShowDropdown(false); handleDownloadInvoice(); }}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <Download className="w-4 h-4" />
                  Download Invoice
                </button>
                    */
                }
                
                {shouldShowBalanceButton && (
                  <button
                    onClick={() => { setShowDropdown(false); setShowPaymentDialog(true); }}
                    className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Wallet className="w-4 h-4" />
                    Pay Balance
                  </button>
                )}
                <button
                  onClick={() => { setShowDropdown(false); setShowCancel(true); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <X className="w-4 h-4" />
                  Cancel Booking
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              This reservation will be cancelled.
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>Keep Reservation</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelLoading}
              onClick={handleCancelBooking}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</>
              ) : (
                'Cancel Reservation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pay Balance dialog */}
      <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Balance Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Your reservation has already been confirmed.
              <br />
              Proceed to Paystack to complete the remaining balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border bg-gray-50 p-4 space-y-3">
            <div className="flex justify-between">
              <span>Total Amount</span>
              <span className="font-semibold">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid</span>
              <span className="font-semibold text-green-700">{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span>Balance</span>
              <span className="font-bold text-red-600">{formatCurrency(balance)}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paymentLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={paymentLoading}
              onClick={handleBalancePayment}
            >
              {paymentLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing...</>
              ) : (
                <><CreditCard className="mr-2 h-4 w-4" /> Proceed to Payment</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BookingCard;
