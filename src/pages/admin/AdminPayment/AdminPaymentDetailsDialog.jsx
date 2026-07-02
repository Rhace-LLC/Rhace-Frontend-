import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';

const formatDate = (date) =>
  new Date(date).toLocaleString();

const money = (value) =>
  `₦${Number(value || 0).toLocaleString()}`;

const AdminPaymentDetailsDialog = ({
  open,
  onOpenChange,
  payment,
}) => {
  if (!payment) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">

        <DialogHeader>

          <DialogTitle>
            Payment Details
          </DialogTitle>

          <DialogDescription>
            Transaction #{payment._id?.slice(0, 8)}
          </DialogDescription>

        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-5">

          <div>
            <label className="text-sm text-muted-foreground">
              Customer
            </label>

            <p className="font-semibold">
              {payment.customerName}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Vendor
            </label>

            <p className="font-semibold">
              {payment.vendor?.businessName ??
                payment.vendor?.name ??
                'N/A'}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Reservation Type
            </label>

            <p className="capitalize">
              {payment.reservationType}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Payment Method
            </label>

            <p className="capitalize">
              {payment.paymentMethod?.replaceAll('_', ' ')}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Gross Amount
            </label>

            <p>{money(payment.amountPaid)}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Vendor Share
            </label>

            <p>{money(payment.vendorShare)}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Platform Share
            </label>

            <p>{money(payment.platformShare)}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Paystack Fee
            </label>

            <p>{money(payment.paystackFee)}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Net Vendor
            </label>

            <p>{money(payment.netToVendor)}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Net Platform
            </label>

            <p>{money(payment.netToPlatform)}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Fee Bearer
            </label>

            <p className="capitalize">
              {payment.feeBearer}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Status
            </label>

            <p className="capitalize">
              {payment.status}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Vendor Confirmed
            </label>

            <p>
              {payment.vendorConfirmed
                ? 'Yes'
                : 'No'}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Date
            </label>

            <p>
              {formatDate(payment.createdAt)}
            </p>
          </div>

          <div className="md:col-span-2">

            <label className="text-sm text-muted-foreground">
              Transaction ID
            </label>

            <p className="font-mono break-all">
              {payment._id}
            </p>

          </div>

        </div>

        <DialogFooter>

          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(
                JSON.stringify(payment, null, 2)
              );

              toast.success(
                'Copied to clipboard'
              );
            }}
          >
            Copy Details
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};

export default AdminPaymentDetailsDialog;