import { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { QrCode, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

export default function RenderCustomerQR({ reservation }) {
  const [open, setOpen] = useState(false);

  const qrValue = useMemo(() => {
    return JSON.stringify({
      reservation_id: reservation?._id,
    });
  }, [reservation]);

  if (!reservation) return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <QrCode className="mr-2 h-4 w-4" />
        Reservation QR
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              Your Reservation QR Code
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm border">
              <QRCode
                value={qrValue}
                size={250}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>

            <div className="text-center space-y-1">
              <p className="font-semibold">
                Show this QR code when you arrive.
              </p>

              <p className="text-sm text-muted-foreground">
                Our staff will scan it to verify your reservation.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}