import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Button } from '@/components/ui/button';

import {
  Eye,
  MoreVertical,
} from 'lucide-react';

import { toast } from 'react-toastify';

import { paymentService } from '@/services/payment.service';

import AdminPaymentDetailsDialog from './AdminPaymentDetailsDialog';

const formatDate = (date) =>
  new Date(date).toLocaleString();

const money = (v) =>
  `₦${Number(v || 0).toLocaleString()}`;

const AdminPaymentTransactionHistory = () => {
  const [payments, setPayments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedPayment, setSelectedPayment] =
    useState(null);

  const [dialogOpen, setDialogOpen] =
    useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const res =
        await paymentService.getPayments();

      setPayments(
        res
      );
         } catch (error) {
      toast.error(
        error?.response?.data?.message ??
          'Unable to load payments'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border">

        <div className="p-6 border-b">

          <h2 className="font-semibold text-lg">
            Payment History
          </h2>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead className="bg-slate-50">

              <tr>

                <th className="px-5 py-3 text-left">
                  Customer
                </th>

                <th className="px-5 py-3 text-left">
                  Vendor
                </th>

                <th className="px-5 py-3 text-left">
                  Amount
                </th>

                <th className="px-5 py-3 text-left">
                  Status
                </th>

                <th className="px-5 py-3 text-left">
                  Date
                </th>

                <th />

              </tr>

            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12"
                  >
                    Loading...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12"
                  >
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment._id}
                    className="border-t"
                  >
                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        <Avatar>

                          <AvatarFallback>

                            {payment.customerName
                              ?.split(' ')
                              .map((i) =>
                                i[0]
                              )
                              .join('')}

                          </AvatarFallback>

                        </Avatar>

                        <div>

                          <p className="font-medium">
                            {payment.customerName}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {payment.email}
                          </p>

                        </div>

                      </div>

                    </td>

                    <td className="px-5 py-4">
                      {payment.vendor?.businessName ??
                        payment.vendor?.name}
                    </td>

                    <td className="px-5 py-4">
                      {money(
                        payment.amountPaid
                      )}
                    </td>

                    <td className="px-5 py-4 capitalize">
                      {payment.status}
                    </td>

                    <td className="px-5 py-4">
                      {formatDate(
                        payment.createdAt
                      )}
                    </td>

                    <td className="px-5 py-4">

                      <DropdownMenu>

                        <DropdownMenuTrigger
                          asChild
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                          >
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPayment(
                                payment
                              );

                              setDialogOpen(
                                true
                              );
                            }}
                          >
                            <Eye
                              className="mr-2"
                              size={14}
                            />

                            View Details

                          </DropdownMenuItem>

                        </DropdownMenuContent>

                      </DropdownMenu>

                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

      <AdminPaymentDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        payment={selectedPayment}
      />
    </>
  );
};

export default AdminPaymentTransactionHistory;