import React from 'react';
import { toast } from 'react-toastify';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/formatDate';

const PaymentDetailsDialog = ({
  open,
  onOpenChange,
  payment,
}) => {
  if (!payment) return null;

  const formatMoney = (value = 0) =>
    `₦${Number(value || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const paymentMode = payment.paymentMode
    ?.replaceAll('_', ' ')
    ?.replace(/\b\w/g, (c) => c.toUpperCase());

  const reservationType = payment.metadata?.reservationType
    ?.replace(/\b\w/g, (c ) => c.toUpperCase());

  const status = (payment.status || 'pending').toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>

          <DialogDescription>
            Transaction #{payment._id?.slice(0, 8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}

          <div>
            <h3 className="font-semibold text-base mb-4">Customer Information</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Customer</label>
                <p className="font-semibold">{payment.customerName}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p>{payment.email}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Reservation Type</label>
                <p>{reservationType || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Payment Mode</label>
                <p>{paymentMode || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Transaction Information */}

          <div>
            <h3 className="font-semibold text-base mb-4">Transaction</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Amount Paid</label>
                <p className="font-semibold text-lg">{formatMoney(payment.amountPaid)}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Payment Method</label>
                <p>{payment.paymentMethod?.replaceAll('_', ' ') || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Date</label>
                <p>{formatDate(payment.createdAt)}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Status</label>

                <div
                  className={`inline-flex mt-1 rounded-full px-3 py-1 text-sm font-medium ${
                    status === 'success'
                      ? 'bg-green-100 text-green-800'
                      : status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}

          <div>
            <h3 className="font-semibold text-base mb-4">Revenue Breakdown</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase">Gross Sale</p>
                <h3 className="text-xl font-bold mt-2">
                  {formatMoney(payment.amountPaid)}
                </h3>
              </div>

              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase">Vendor Share</p>
                <h3 className="text-xl font-bold mt-2">
                  {formatMoney(payment.vendorShare)}
                </h3>
              </div>

              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase">Platform Share</p>
                <h3 className="text-xl font-bold mt-2">
                  {formatMoney(payment.platformShare)}
                </h3>
              </div>

              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase">Paystack Fee</p>
                <h3 className="text-xl font-bold mt-2">
                  {formatMoney(payment.paystackFee)}
                </h3>
              </div>

              <div className="border rounded-xl p-4 border-green-200 bg-green-50">
                <p className="text-xs text-green-700 uppercase">Net To Vendor</p>
                <h3 className="text-2xl font-bold mt-2 text-green-700">
                  {formatMoney(payment.netToVendor)}
                </h3>
              </div>

              <div className="border rounded-xl p-4 border-blue-200 bg-blue-50">
                <p className="text-xs text-blue-700 uppercase">Net To Platform</p>
                <h3 className="text-2xl font-bold mt-2 text-blue-700">
                  {formatMoney(payment.netToPlatform)}
                </h3>
              </div>
            </div>
          </div>

          {/* IDs */}

          <div>
            <h3 className="font-semibold text-base mb-4">References</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">
                  Transaction ID
                </label>

                <p className="font-mono break-all text-sm">{payment._id}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">
                  Booking ID
                </label>

                <p className="font-mono break-all text-sm">{payment.booking}</p>
              </div>

              {payment.paystackReference && (
                <div>
                  <label className="text-sm text-muted-foreground">
                    Paystack Reference
                  </label>

                  <p className="font-mono break-all text-sm">
                    {payment.paystackReference}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(payment, null, 2));
                toast.success('Payment details copied');
              }}
            >
              Copy Details
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailsDialog;