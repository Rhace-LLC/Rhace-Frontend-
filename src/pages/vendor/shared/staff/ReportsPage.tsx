import { ReportsTab } from './ReportsTab';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

const ReportsPage = () => {
  const handleRefresh = () => {
    // Refresh handled by ReportsTab via onRefresh
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <DashboardPageHeader
        title="Staff Analytics"
        subtitle="Performance metrics and analytics by staff"
      />
      <ReportsTab onRefresh={handleRefresh} />
    </div>
  );
};

export { ReportsPage as default, ReportsTab };