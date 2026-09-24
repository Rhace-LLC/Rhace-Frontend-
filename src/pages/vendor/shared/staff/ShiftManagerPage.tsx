import { ShiftManagerTab } from './ShiftManagerTab';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

const ShiftManagerPage = () => {
  const handleRefresh = () => {
    // Refresh handled by ShiftManagerTab via onRefresh
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <DashboardPageHeader
        heading="Shift Manager"
        subtitle="Manage staff shifts, rosters, and assignments"
        primaryBtnText="Refresh"
        primaryBtnAction={handleRefresh}
      />
      <ShiftManagerTab onRefresh={handleRefresh} />
    </div>
  );
};

export { ShiftManagerPage as default, ShiftManagerTab };