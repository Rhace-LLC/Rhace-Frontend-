import type { RouteObject } from 'react-router-dom';

// Auth
import AdminLogin from '@/pages/public/auth/admin/login';
import ForgotPassword from '@/pages/public/auth/user/forgot-password';
import Login from '@/pages/public/auth/user/login';
import Otp from '@/pages/public/auth/user/otp';
import ResetPassword from '@/pages/public/auth/user/reset-password';
import Signup from '@/pages/public/auth/user/signup';
import VendorForgotPassword from '@/pages/public/auth/vendor/forgot-password';
import VendorLogin from '@/pages/public/auth/vendor/login';
import VendorOtp from '@/pages/public/auth/vendor/otp';
import VendorResetPassword from '@/pages/public/auth/vendor/reset-password';
import VendorSignup from '@/pages/public/auth/vendor/signup';

// Public pages
import AboutRhace from '@/pages/public/about';
import ClubPage from '@/pages/public/clubs';
import ContactRhace from '@/pages/public/contact';
import CookiesPage from '@/pages/public/cookies';
import DiscoverPage from '@/pages/public/discover';
import HelpCenterRhace from '@/pages/public/faq';
import HotelsPage from '@/pages/public/hotels';
import MenuPage from '@/pages/public/menus';
import NotFound from '@/pages/public/not-found';
import PrivacyPolicy from '@/pages/public/privacy-policy';
import ReservationHomePage from '@/pages/public/home';
import ConfirmationPage from '@/pages/public/confirmation';
import RestaurantsPage from '@/pages/public/restaurants';
import ReserveBlueprintPage from '@/pages/public/reserve';
import SearchPage from '@/pages/public/search';
import Terms from '@/pages/public/terms';
import VendornHomePage from '@/pages/public/partner';

import PaystackCallback from '@/components/PaystackCallback';
import QrRedirectPage from '@/pages/public/qr-redirect';

export const publicRoutes: RouteObject[] = [
  // Home / Info Pages
  { path: '/', element: <ReservationHomePage /> },
  { path: '/about', element: <AboutRhace /> },
  { path: '/contact', element: <ContactRhace /> },
  { path: '/faq', element: <HelpCenterRhace /> },
  { path: '/terms', element: <Terms /> },
  { path: '/cookies', element: <CookiesPage /> },
  { path: '/privacy-policy', element: <PrivacyPolicy /> },
  { path: '/partner', element: <VendornHomePage /> },
  { path: '/discover', element: <DiscoverPage /> },
  { path: '/search', element: <SearchPage /> },

  // Authentication Routes
  {
    path: '/auth',
    children: [
      {
        path: 'user',
        children: [
          { path: 'signup', element: <Signup /> },
          { path: 'login', element: <Login /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'reset-password', element: <ResetPassword /> },
          { path: 'otp', element: <Otp /> },
        ],
      },
      {
        path: 'vendor',
        children: [
          { index: true, element: <VendorLogin /> },
          { path: 'signup', element: <VendorSignup /> },
          { path: 'login', element: <VendorLogin /> },
          { path: 'forgot-password', element: <VendorForgotPassword /> },
          { path: 'reset-password', element: <VendorResetPassword /> },
          { path: 'otp', element: <VendorOtp /> },
        ],
      },
      {
        path: 'admin',
        children: [{ path: 'login', element: <AdminLogin /> }],
      },
    ],
  },

  { path: '/menus/:id', element: <MenuPage /> },

  // Confirmation (UnitReservation engine)
  { path: '/restaurants/confirmation/:id', element: <ConfirmationPage /> },
  { path: '/clubs/confirmation/:id', element: <ConfirmationPage /> },
  { path: '/hotels/confirmation/:id', element: <ConfirmationPage /> },

  // Restaurants
  { path: '/restaurants/:id/reserve/:blueprintId', element: <ReserveBlueprintPage /> },
  { path: '/restaurants/:id', element: <RestaurantsPage /> },

  // Clubs
  { path: '/clubs/:id/reserve/:blueprintId', element: <ReserveBlueprintPage /> },
  { path: '/clubs/:id', element: <ClubPage /> },

  // Hotels
  { path: '/hotels/:id/reserve/:blueprintId', element: <ReserveBlueprintPage /> },
  { path: '/hotels/:id', element: <HotelsPage /> },

  // Paystack Callback
  { path: '/paystack/callback', element: <PaystackCallback /> },
  { path: '/q/:token', element: <QrRedirectPage /> },

  // 404
  { path: '*', element: <NotFound /> },
];
