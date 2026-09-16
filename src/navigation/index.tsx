import type { RouteObject } from 'react-router-dom';
import { useRoutes } from 'react-router-dom';

import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import ProtectedRoute from '@/components/ProtectedRoutes';
import ScrollToTop from '@/components/ScrollToTop';

import AdminLayout from './admin_layout';
import PublicLayout from './public_layout';
import UserLayout from './user_layout';
import VendorLayout from './vendor_layout';

import { adminDashboardRoutes } from './routes/admin';
import { publicRoutes } from './routes/public';
import { staffRoutes } from './routes/staff';
import { userRoutes } from './routes/user';
import {
  vendorDashboardRoutes,
  vendorStandaloneRoutes,
} from './routes/vendor';

const routes: RouteObject[] = [
  { element: <PublicLayout />, children: publicRoutes },

  ...staffRoutes,

  { element: <UserLayout />, children: userRoutes },

  {
    element: <ProtectedRoute />,
    children: [
      ...vendorStandaloneRoutes,
      {
        element: <VendorLayout />,
        children: [{ path: '/dashboard', children: vendorDashboardRoutes }],
      },
    ],
  },

  {
    element: <AdminProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [{ path: '/dashboard/admin', children: adminDashboardRoutes }],
      },
    ],
  },
];

export function Navigation() {
  const element = useRoutes(routes);

  return (
    <>
      <ScrollToTop />
      {element}
    </>
  );
}

export default Navigation;
