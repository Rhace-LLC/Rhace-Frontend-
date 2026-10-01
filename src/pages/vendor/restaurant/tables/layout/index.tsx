import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { LayoutGrid } from 'lucide-react';

export default function RestaurantFloorLayout() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardPageHeader
          title="Floor Layout"
          subtitle="Arrange your restaurant sections and tables visually."
        />

        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-24 text-center">
          <LayoutGrid className="w-10 h-10 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">Floor layout builder coming soon.</p>
        </div>
      </div>
    </div>
  );
}
