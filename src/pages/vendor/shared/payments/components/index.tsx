
import { useSelector } from 'react-redux';
import type { RootState } from '@/redux/store';
import { useAuth } from '@/contexts/AuthContext';

import PaymentStats from './PaymentStats';
import PaymentInformation from './PaymentInformation';
import EarningsTrends from './EarningTrends';
import TransactionHistory from './TransactionHistory';

const VendorPaymentOverview = () => {
  const { vendor } = useAuth();

  return (
    <div className="md:p-6 py-2 mb-14 space-y-6">

        <PaymentStats />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <PaymentInformation />
          <EarningsTrends />
        </div>

        <TransactionHistory />

      </div>
    );
};

export default VendorPaymentOverview;
