import type { RouteObject } from 'react-router-dom';

import StaffProtectedRoute from '@/components/StaffProtectedRoute';
import StaffLayout from '@/pages/staff/layout';
import StaffHome from '@/pages/staff';
import StaffWorkspace from '@/pages/staff/workspace';

/** Staff workspace app (role-gated). Rendered outside the vendor dashboard shell. */
export const staffRoutes: RouteObject[] = [
  {
    element: <StaffProtectedRoute />,
    children: [
      {
        element: <StaffLayout />,
        children: [
          { path: '/staff', element: <StaffHome /> },
          { path: '/staff/:role', element: <StaffWorkspace /> },
        ],
      },
    ],
  },
];
