import { ActivityTab } from './ActivityTab';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

const ActivityPage = () => {
  const handleRefresh = () => {
    // Refresh handled by ActivityTab via onRefresh
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <DashboardPageHeader
        heading="Activity"
        subtitle="View staff activity and action history"
        primaryBtnText="Refresh"
        primaryBtnAction={handleRefresh}
      />
      <ActivityTab onRefresh={handleRefresh} />
    </div>
  );
};

export { ActivityPage as default, ActivityTab };