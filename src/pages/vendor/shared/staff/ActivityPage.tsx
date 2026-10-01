import { ActivityTab } from './ActivityTab';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

const ActivityPage = () => {
  const handleRefresh = () => {
    // Refresh handled by ActivityTab via onRefresh
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <DashboardPageHeader
        title="Activity"
        subtitle="View staff activity and action history"
      />
      <ActivityTab onRefresh={handleRefresh} />
    </div>
  );
};

export { ActivityPage as default, ActivityTab };