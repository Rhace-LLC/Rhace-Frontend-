import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { staffRoleLabel, workspacePathForStaffRole } from './roles';

export default function StaffHome() {
  const { staff } = useAuth();
  const workspacePath = workspacePathForStaffRole(staff?.role);

  if (workspacePath) {
    return <Navigate to={workspacePath} replace />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome{staff?.name ? `, ${staff.name}` : ''}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          You are signed in as {staffRoleLabel(staff?.role)}. If you believe this is wrong, please
          contact your manager.
        </p>
        <p className="text-sm text-muted-foreground">
          Use the clock widget in the header to start your shift.
        </p>
      </CardContent>
    </Card>
  );
}
