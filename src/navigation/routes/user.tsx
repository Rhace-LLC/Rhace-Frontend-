import type { RouteObject } from 'react-router-dom';

import UserProtectedRoute from '@/components/UserProtectedRoute';
import ClubReservationLayout from '@/pages/user/reservations/_layouts/ClubReservationLayout';
import HotelReservationLayout from '@/pages/user/reservations/_layouts/HotelReservationLayout';
import ReservationLayout from '@/pages/user/reservations/_layouts/ReservationLayout';

// User Pages
import AccountSettings from '@/pages/user/account';
import BookingDetails from '@/pages/user/bookings/detail';
import BookingsPage from '@/pages/user/bookings';
import ClubConfirmPage from '@/pages/user/reservations/club/confirmation';
import ClubReservation from '@/pages/user/reservations/club';
import Favorites from '@/pages/user/favorites';
import HotelReservation from '@/pages/user/reservations/hotel';
import PaymentsHistory from '@/pages/user/payments';
import PrivacyPolicy from '@/pages/public/privacy-policy';
import ReservationHomePage from '@/pages/public/home';
import PrePaymentPage from '@/pages/user/reservations/restaurant/pre-payment';
import Reservation from '@/pages/user/reservations/restaurant';
import Terms from '@/pages/public/terms';

const hotelReservationRoutes: RouteObject[] = [
  { path: '/hotels/:id/reservations', element: <HotelReservation /> },
];

const clubReservationRoutes: RouteObject[] = [
  { path: '/clubs/:id/reservations', element: <ClubReservation /> },
  { path: '/clubs/confirmation/:id', element: <ClubConfirmPage /> },
];

const restaurantReservationRoutes: RouteObject[] = [
  { path: '/restaurants/:id/reservations', element: <Reservation /> },
  { path: '/restaurants/pre-payment/:id', element: <PrePaymentPage /> },
];

const userGeneralRoutes: RouteObject[] = [
  { path: '/bookings', element: <BookingsPage /> },
  { path: '/favorites', element: <Favorites /> },
  { path: '/bookings/:id', element: <BookingDetails /> },
  { path: '/payments', element: <PaymentsHistory /> },
  { path: '/account-settings', element: <AccountSettings /> },
  { path: '/book-reservation', element: <ReservationHomePage /> },
  { path: '/terms', element: <Terms /> },
  { path: '/privacy-policy', element: <PrivacyPolicy /> },
];

export const userRoutes: RouteObject[] = [
  {
    element: <UserProtectedRoute />,
    children: [
      {
        element: <HotelReservationLayout />,
        children: hotelReservationRoutes,
      },
      {
        element: <ClubReservationLayout />,
        children: clubReservationRoutes,
      },
      {
        element: <ReservationLayout />,
        children: restaurantReservationRoutes,
      },
      ...userGeneralRoutes,
    ],
  },
];
