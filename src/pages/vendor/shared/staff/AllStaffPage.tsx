import { AllStaffTab } from './AllStaffTab';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

const AllStaffPage = () => {
  const handleRefresh = () => {
    // Trigger refresh in the tab - the tab's loadStaff will be called via onRefresh
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <DashboardPageHeader
        heading="All Staff"
        subtitle="Manage your team members, roles, and invitations"
        primaryBtnText="Refresh"
        primaryBtnAction={handleRefresh}
      />
      <AllStaffTab onRefresh={handleRefresh} />
    </div>
  );
};

export { AllStaffPage as default, AllStaffTab };