import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { ManagerOrdersTab } from '@/pages/staff/components/ManagerOrdersTab';

export function VendorOrdersPage() {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Orders"
        subtitle="Every pre-order and table order on this venue."
      />
      <ManagerOrdersTab />
    </div>
  );
}

export default VendorOrdersPage;
