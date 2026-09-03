import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSelector } from 'react-redux';
import type { RootState } from '@/redux/store';

import PaymentStats from "./NewPaymentDashboard/PaymentStats"
import PaymentInformation from "./NewPaymentDashboard/PaymentInformation"
import EarningsTrends from "./NewPaymentDashboard/EarningTrends";
import TransactionHistory from "./NewPaymentDashboard/TransactionHistory"

const VendorPaymentOverview = () => {
  const vendor = useSelector((state: RootState) => state.auth.vendor);

  return (
    <DashboardLayout
      type={vendor.vendorType}
    >
      <div className="md:p-6 py-2 mb-14 space-y-6">

        <PaymentStats />

        <div className="grid grid-cols-1 gap-6">
          <PaymentInformation />
          <EarningsTrends />
        </div>

        <TransactionHistory />

      </div>
    </DashboardLayout>
  );
};

export default VendorPaymentOverview;
