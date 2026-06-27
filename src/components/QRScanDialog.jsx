import { useMemo, useState } from "react";
import {
  X,
  Camera,
  QrCode,
  CheckCircle2,
  Hotel,
  UtensilsCrossed,
  Martini,
  Users,
  Calendar,
  Clock3,
  MapPin,
  Wallet,
  BadgeCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import { useZxing } from "react-zxing";

import { cn } from "@/lib/utils";
import { userService } from "@/services/user.service";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import { Button } from "@/components/ui/button";

export function QRScanDialog({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [scanning, setScanning] = useState(false);
  const [loadingReservation, setLoadingReservation] =
    useState(false);
  const [confirming, setConfirming] = useState(false);

  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState(null);

  const handleDialogClose = () => {
    setScanning(false);
    setLoadingReservation(false);
    setConfirming(false);
    setReservation(null);
    setError(null);

    onClose?.("Closed");
  };

  const handleReset = () => {
    setReservation(null);
    setScanning(false);
    setLoadingReservation(false);
    setConfirming(false);
    setError(null);
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "-";

    if (time.includes(":")) return time;

    return new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const reservationSummary = useMemo(() => {
    if (!reservation) return null;

    const vendorType =
      reservation.vendor?.vendorType ||
      reservation.reservationType?.replace(
        "Reservation",
        ""
      );

    const room = reservation.rooms?.[0];

    switch (vendorType) {
      case "hotel":
        return {
          icon: Hotel,
          type: "Hotel Reservation",
          date: room?.checkInDate,
          secondaryDate: room?.checkOutDate,
          time: null,
          guests: room?.guests,
          quantity: room?.quantity,
          label1: "Check In",
          label2: "Check Out",
        };

      case "restaurant":
        return {
          icon: UtensilsCrossed,
          type: "Restaurant Reservation",
          date: reservation.date,
          secondaryDate: null,
          time: reservation.time,
          guests: reservation.guests,
          quantity: null,
          label1: "Reservation Date",
          label2: null,
        };

      case "club":
        return {
          icon: Martini,
          type: "Club Reservation",
          date: reservation.date,
          secondaryDate: null,
          time: reservation.time,
          guests: reservation.guests,
          quantity: reservation.tables?.length,
          label1: "Reservation Date",
          label2: null,
        };

      default:
        return {
          icon: QrCode,
          type: "Reservation",
        };
    }
  }, [reservation]);

  const handleConfirmReservation = async () => {
    if (!reservation?._id) return;

    try {
      setConfirming(true);

      await userService.confirmReservation(
        reservation._id
      );

      toast.success(
        "Reservation confirmed successfully."
      );

      onSuccess?.(reservation);

      handleDialogClose();
    } catch (err) {
      console.error(err);
      
        let msg = err?.response?.data?.message;

        if(msg== "Reservation already confirmed"){
          toast.info("Reservation has already been confirmed.");
          return;
        }
        console.log("got here", msg, msg == "Reservation already confirmed");

      toast.error(
       msg ||
          "Unable to confirm reservation."
      );
    } finally {
      setConfirming(false);
    }
  };

  const { ref: zxingRef } = useZxing({
    paused: !scanning,

    onDecodeResult: async (barcode) => {
      try {
        const text = barcode.rawValue;

        if (!text) return;

        setScanning(false);

        let payload;

        try {
          payload = JSON.parse(text);
        } catch {
          toast.error("Invalid QR code.");
          return;
        }

        if (!payload?.reservation_id) {
          toast.error(
            "Reservation ID not found in QR code."
          );
          return;
        }

        setLoadingReservation(true);

        const response =
          await userService.fetchFullReservation(
            payload.reservation_id
          );

        const reservationData =
          response?.data || response;

        setReservation(reservationData);

        toast.success("Reservation loaded.");
      } catch (err) {
        let msg = err?.response?.data?.message;

        console.error(err);

        toast.error(
          msg ||
            "Unable to fetch reservation."
        );
      } finally {
        setLoadingReservation(false);
      }
    },

    onError: (err) => {
      console.error(err);

      setError("Unable to access camera.");

      toast.error(
        "Unable to access camera or scan QR code."
      );
    },
  });

  const StatusBadge = ({ status }) => {
    const colours = {
      upcoming:
        "bg-amber-100 text-amber-700 border-amber-200",
      confirmed:
        "bg-green-100 text-green-700 border-green-200",
      cancelled:
        "bg-red-100 text-red-700 border-red-200",
      completed:
        "bg-blue-100 text-blue-700 border-blue-200",
    };

    return (
      <span
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-semibold capitalize",
          colours[status] ||
            "bg-gray-100 text-gray-700 border-gray-200"
        )}
      >
        {status}
      </span>
    );
  };

  const SummaryRow = ({
    icon: Icon,
    label,
    value,
  }) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    )
      return null;

    return (
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-gray-100 p-2">
          <Icon className="h-4 w-4 text-gray-500" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {label}
          </p>

          <p className="break-words text-sm font-semibold text-gray-900">
            {value}
          </p>
        </div>
      </div>
    );
  };

  // ---------- PART 2 STARTS WITH: return (
    return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-lg overflow-hidden rounded-[2rem] border-0 p-0">
        <div className="flex max-h-[92vh] flex-col bg-white">

          {/* ================= HEADER ================= */}
          <DialogHeader className="border-b px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
                  Reservation
                </p>

                <DialogTitle className="mt-1 text-2xl font-bold">
                  Scan QR Code
                </DialogTitle>

                <p className="mt-1 text-sm text-gray-500">
                  Scan a customer's reservation QR code to verify and confirm
                  their booking.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleDialogClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* ================= CONTENT ================= */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
{/* ================= SCANNER / SUCCESS ================= */}
<div className="mb-6 flex justify-center">
  {!reservation ? (
    <div className="relative h-[320px] w-[320px] overflow-hidden rounded-[2rem] bg-gray-900 shadow-inner">

      {scanning ? (
        <>
          <video
            ref={zxingRef}
            className="h-full w-full object-cover"
          />

          {/* Scan frame */}
          <div className="pointer-events-none absolute inset-10">
            <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-2 border-t-2 border-white" />
            <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-2 border-t-2 border-white" />
            <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-2 border-l-2 border-white" />
            <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-2 border-r-2 border-white" />
          </div>

          <div className="animate-scan absolute inset-x-10 top-10 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <div className="mb-5 rounded-3xl bg-white/10 p-6 backdrop-blur">
            <QrCode className="h-16 w-16 text-white/60" />
          </div>

          <h3 className="text-lg font-bold text-white">
            Ready to Scan
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Tap <strong>Begin Scan</strong> and point your camera at the
            customer's reservation QR code.
          </p>
        </div>
      )}
    </div>
  ) : (
    <div className="w-full rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-green-700">
        Reservation Found
      </h2>

      <p className="mt-2 text-sm text-green-700/80">
        Please verify the reservation details before confirming.
      </p>
    </div>
  )}
</div>
            {/* ================= LOADING ================= */}
            {loadingReservation && (
              <div className="rounded-2xl border bg-gray-50 p-10 text-center">

                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

                <p className="text-sm text-gray-500">
                  Loading reservation...
                </p>
              </div>
            )}

            {/* ================= ERROR ================= */}
            {!loadingReservation && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">

                <p className="font-medium text-red-600">
                  {error}
                </p>
              </div>
            )}

            {/* ================= RESERVATION CARD ================= */}
            {!loadingReservation && reservation && (
              <div className="space-y-5 rounded-3xl border bg-gray-50 p-5">

                {/* Top */}
                <div className="flex items-center gap-4">

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <reservationSummary.icon className="h-8 w-8 text-blue-600" />
                  </div>

                  <div className="min-w-0 flex-1">

                    <h3 className="truncate text-lg font-bold">
                      {reservation.customerName}
                    </h3>

                    <p className="truncate text-sm text-gray-500">
                      {reservationSummary.type}
                    </p>
                  </div>

                  <StatusBadge
                    status={reservation.reservationStatus}
                  />
                </div>

                <div className="border-t" />

                {/* Summary */}
                <div className="space-y-4">

                  <SummaryRow
                    icon={BadgeCheck}
                    label="Booking Code"
                    value={reservation.bookingCode}
                  />

                  <SummaryRow
                    icon={MapPin}
                    label="Venue"
                    value={reservation.vendor?.businessName}
                  />

                  <SummaryRow
                    icon={Users}
                    label="Customer"
                    value={reservation.customerName}
                  />

                  <SummaryRow
                    icon={Wallet}
                    label="Payment"
                    value={`${reservation.paymentStatus?.replace(
                      "_",
                      " "
                    )} • ₦${Number(
                      reservation.totalAmount || 0
                    ).toLocaleString()}`}
                  />

                  {reservationSummary.label1 && (
                    <SummaryRow
                      icon={Calendar}
                      label={reservationSummary.label1}
                      value={formatDate(
                        reservationSummary.date
                      )}
                    />
                  )}

                  {reservationSummary.secondaryDate && (
                    <SummaryRow
                      icon={Calendar}
                      label={reservationSummary.label2}
                      value={formatDate(
                        reservationSummary.secondaryDate
                      )}
                    />
                  )}

                  {reservationSummary.time && (
                    <SummaryRow
                      icon={Clock3}
                      label="Time"
                      value={formatTime(
                        reservationSummary.time
                      )}
                    />
                  )}

                  {reservationSummary.guests && (
                    <SummaryRow
                      icon={Users}
                      label="Guests"
                      value={reservationSummary.guests}
                    />
                  )}

                  {reservationSummary.quantity && (
                    <SummaryRow
                      icon={Hotel}
                      label={
                        reservation.vendor?.vendorType === "hotel"
                          ? "Rooms"
                          : "Tables"
                      }
                      value={reservationSummary.quantity}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ================= FOOTER ================= */}
          <div className="border-t bg-white p-6">

            {!reservation ? (
              <Button
                disabled={loadingReservation}
                onClick={() => setScanning((prev) => !prev)}
                className={cn(
                  "h-14 w-full rounded-2xl text-base font-semibold",
                  scanning
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-black text-white hover:bg-gray-900"
                )}
              >
                {scanning ? (
                  "Stop Scanning"
                ) : (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Begin Scan
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3 flex">

                <Button
                  onClick={handleConfirmReservation}
                  disabled={confirming}
                  className="h-14 w-full rounded-2xl bg-green-600 text-base hover:bg-green-700"
                >
                  {confirming
                    ? "Confirming Reservation..."
                    : "Confirm Reservation"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="h-12 w-full rounded-2xl"
                >
                  Scan Another Reservation
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={handleDialogClose}
              className="mt-3 w-full"
            >
              Cancel
            </Button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}