import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AllStaffTab from './AllStaffTab';
import ShiftManagerTab from './ShiftManagerTab';
import ReportsTab from './ReportsTab';
import ActivityTab from './ActivityTab';

const StaffManagementHub = () => {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Staff Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your team, shifts, performance and activity.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="all">All Staff</TabsTrigger>
          <TabsTrigger value="shifts">Shift Manager</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <AllStaffTab />
        </TabsContent>
        <TabsContent value="shifts">
          <ShiftManagerTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffManagementHub;
