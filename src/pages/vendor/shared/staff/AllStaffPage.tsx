import { AllStaffTab } from './AllStaffTab';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

const AllStaffPage = () => {
  const handleRefresh = () => {
    // Trigger refresh in the tab - the tab's loadStaff will be called via onRefresh
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="All staff"
        subtitle="Manage your team members, roles, and invitations."
      />
      <AllStaffTab onRefresh={handleRefresh} />
    </div>
  );
};

export { AllStaffPage as default, AllStaffTab };
