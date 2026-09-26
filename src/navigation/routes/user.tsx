import type { RouteObject } from 'react-router-dom';

import UserProtectedRoute from '@/components/UserProtectedRoute';

// User Pages
import AccountSettings from '@/pages/user/account';
import BookingDetails from '@/pages/user/bookings/detail';
import BookingsPage from '@/pages/user/bookings';
import UserOrdersPage from '@/pages/user/orders';
import Favorites from '@/pages/user/favorites';
import PaymentsHistory from '@/pages/user/payments';
import PreOrderPage from '@/pages/public/preorder';
import QuickOrderPage from '@/pages/public/quickorder';
import PrivacyPolicy from '@/pages/public/privacy-policy';
import ReservationHomePage from '@/pages/public/home';
import Terms from '@/pages/public/terms';

const userGeneralRoutes: RouteObject[] = [
  { path: '/bookings', element: <BookingsPage /> },
  { path: '/orders', element: <UserOrdersPage /> },
  { path: '/favorites', element: <Favorites /> },
  { path: '/bookings/:id', element: <BookingDetails /> },
  { path: '/preorder/:reservationId', element: <PreOrderPage /> },
  { path: '/order/:vendorId', element: <QuickOrderPage /> },
  { path: '/payments', element: <PaymentsHistory /> },
  { path: '/account-settings', element: <AccountSettings /> },
  { path: '/book-reservation', element: <ReservationHomePage /> },
  { path: '/terms', element: <Terms /> },
  { path: '/privacy-policy', element: <PrivacyPolicy /> },
];

export const userRoutes: RouteObject[] = [
  {
    element: <UserProtectedRoute />,
    children: [...userGeneralRoutes],
  },
];
