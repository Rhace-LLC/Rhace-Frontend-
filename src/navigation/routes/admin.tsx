import type { RouteObject } from 'react-router-dom';

import ErrorBoundary from '@/components/ErrorBoundary';

// Admin Dashboard
import AdminDashboard from '@/pages/admin/dashboard';
import AdminPayments from '@/pages/admin/payments';
import AdminReports from '@/pages/admin/reports';
import AdminReservations from '@/pages/admin/reservations';
import AdminReviews from '@/pages/admin/reviews';
import AdminSettings from '@/pages/admin/settings';
import AdminUsers from '@/pages/admin/users';
import AdminVendors from '@/pages/admin/vendors';

export const adminDashboardRoutes: RouteObject[] = [
  { index: true, element: <AdminDashboard /> },
  {
    path: 'vendors',
    element: (
      <ErrorBoundary>
        <AdminVendors />
      </ErrorBoundary>
    ),
  },
  { path: 'users', element: <AdminUsers /> },
  { path: 'reservations', element: <AdminReservations /> },
  { path: 'payments', element: <AdminPayments /> },
  { path: 'reports', element: <AdminReports /> },
  { path: 'reviews', element: <AdminReviews /> },
  { path: 'settings', element: <AdminSettings /> },
];
