import React, { useEffect, useState } from 'react';
import { paymentService } from '@/services/payment.service';
import { toast } from 'react-toastify';

const PaymentInformation = () => {
  const [loading, setLoading] = useState(true);

  const [info, setInfo] = useState({
    bankName: '',
    bankLogo: '',
    accountName: '',
    accountNumber: '',
    subaccountCode: '',

    balance: 0,
    pendingBalance: 0,
    totalPaidOut: 0,

    lastPaymentDate: null,
    lastSettlementDate: null,
  });

  useEffect(() => {
    fetchInfo();
  }, []);

  const fetchInfo = async () => {
    try {
      setLoading(true);

      const res = await paymentService.getPaymentInfo();

      setInfo(res);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to load payment information'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border p-6">
        Loading payment information...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border p-6">

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-semibold text-lg">
            Payment Information
          </h2>

          <p className="text-sm text-gray-500">
            This is the account customers pay into through Paystack Split.
          </p>
        </div>
      </div>

      {/* Bank Card */}

      <div className="bg-[#1E1E1E] text-white rounded-2xl p-5 mb-6">

        <div className="flex items-center gap-4 mb-8">

          <img
            src={info.bankLogo}
            alt={info.bankName}
            className="w-12 h-12 object-contain"
          />

          <div>
            <h3 className="font-semibold">
              {info.bankName}
            </h3>

            <p className="text-sm text-gray-300">
              Verified Settlement Account
            </p>
          </div>

        </div>

        <div className="space-y-1">

          <p className="text-2xl tracking-widest">
            {info.accountNumber}
          </p>

          <p className="text-sm">
            {info.accountName}
          </p>

        </div>

      </div>

      {/* Financial Summary */}

      <div className="hidden grid md:grid-cols-2 gap-4">

        <div className="border rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">
            Available Balance
          </p>

          <h3 className="text-2xl font-bold mt-1">
            ₦{Number(info.balance || 0).toLocaleString()}
          </h3>

          <p className="text-xs text-gray-500 mt-2">
            Ready for withdrawal
          </p>
        </div>

        <div className="border rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">
            Pending Balance
          </p>

          <h3 className="text-2xl font-bold mt-1">
            ₦{Number(info.pendingBalance || 0).toLocaleString()}
          </h3>

          <p className="text-xs text-gray-500 mt-2">
            Awaiting settlement
          </p>
        </div>

        <div className="border rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">
            Total Paid Out
          </p>

          <h3 className="text-xl font-semibold mt-1">
            ₦{Number(info.totalPaidOut || 0).toLocaleString()}
          </h3>

          <p className="text-xs text-gray-500 mt-2">
            Lifetime settlements
          </p>
        </div>

        <div className="border rounded-xl p-4">

          <p className="text-xs text-gray-500 uppercase">
            Last Settlement
          </p>

          <h3 className="text-base font-semibold mt-1">
            {info.lastSettlementDate
              ? new Date(info.lastSettlementDate).toLocaleDateString('en-NG')
              : 'Never'}
          </h3>

          <p className="text-xs text-gray-500 mt-2">
            Last transfer to your account
          </p>

        </div>

      </div>

      {/* Footer */}

      <div className="mt-6 pt-6 border-t space-y-2 text-sm">

        <div className="flex justify-between">

          <span className="text-gray-500">
            Last Customer Payment
          </span>

          <span className="font-medium">
            {info.lastPaymentDate
              ? new Date(info.lastPaymentDate).toLocaleDateString('en-NG')
              : 'N/A'}
          </span>

        </div>

        <div className="flex justify-between">

          <span className="text-gray-500">
            Paystack Subaccount
          </span>

          <span className="font-mono text-xs">
            {info.subaccountCode}
          </span>

        </div>

      </div>

    </div>
  );
};

export default PaymentInformation;