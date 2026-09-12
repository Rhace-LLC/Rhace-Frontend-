import type { RouteObject } from 'react-router-dom';

import Onboard from '@/pages/vendor/onboarding';

// Vendor Dashboard
import VendorDashboard from '@/pages/vendor/restaurant/dashboard';
import PaymentDashboard from '@/pages/vendor/shared/payments';
import CreateMenu from '@/pages/vendor/restaurant/menu/create';
import CreateMenuItem from '@/pages/vendor/restaurant/menu/items/create';
import CreateReservation from '@/pages/vendor/restaurant/reservations/create';
import MenuDashboard from '@/pages/vendor/restaurant/menu';
import ReservationDashboard from '@/pages/vendor/restaurant/reservations';
import RestaurantSettings from '@/pages/vendor/restaurant/settings';
import StaffManagementSystem from '@/pages/vendor/shared/staff';

// Vendor - Club
import BottleServiceManager from '@/pages/vendor/club/drinks/add';
import ClubDashboard from '@/pages/vendor/club/dashboard';
import { DrinksTable } from '@/pages/vendor/club/drinks';
import ClubReservationTable from '@/pages/vendor/club/reservations';

// Vendor - Hotel
import AddRooms from '@/pages/vendor/hotel/rooms/add';
import BookingManagement from '@/pages/vendor/hotel/bookings';
import HotelDashboard from '@/pages/vendor/hotel/dashboard';
import HotelProfile from '@/pages/vendor/hotel/profile';
import RoomsManagement from '@/pages/vendor/hotel/rooms';
import HotelSettings from '@/pages/vendor/hotel/settings';

const dashboardRestaurantRoutes: RouteObject[] = [
  { path: 'restaurant', element: <VendorDashboard /> },
  { path: 'restaurant/payments', element: <PaymentDashboard /> },
  { path: 'restaurant/staffs', element: <StaffManagementSystem /> },
  { path: 'restaurant/reservation', element: <ReservationDashboard /> },
  { path: 'restaurant/reservation/new', element: <CreateReservation /> },
  { path: 'restaurant/menu', element: <MenuDashboard /> },
  { path: 'restaurant/menu/new', element: <CreateMenu /> },
  { path: 'restaurant/menu/item/new', element: <CreateMenuItem /> },
  { path: 'restaurant/settings', element: <RestaurantSettings /> },
];

const hotelVendorRoutes: RouteObject[] = [
  { path: 'hotel', element: <HotelDashboard /> },
  { path: 'hotel/bookings', element: <BookingManagement /> },
  { path: 'hotel/rooms', element: <RoomsManagement /> },
  { path: 'hotel/payments', element: <PaymentDashboard /> },
  { path: 'hotel/staffs', element: <StaffManagementSystem /> },
  { path: 'hotel/profile', element: <HotelProfile /> },
  { path: 'hotel/settings', element: <HotelSettings /> },
];

const clubVendorRoutes: RouteObject[] = [
  { path: 'club', element: <ClubDashboard /> },
  { path: 'club/drinks', element: <DrinksTable /> },
  { path: 'club/reservations', element: <ClubReservationTable /> },
  { path: 'club/payments', element: <PaymentDashboard /> },
  { path: 'club/staffs', element: <StaffManagementSystem /> },
  { path: 'club/add-drinks', element: <BottleServiceManager /> },
  { path: 'club/settings', element: <RestaurantSettings /> },
];

// Routes that render outside the vendor dashboard shell.
export const vendorStandaloneRoutes: RouteObject[] = [
  { path: '/auth/vendor/onboarding', element: <Onboard /> },
  { path: '/dashboard/hotel/addrooms', element: <AddRooms /> },
];

// Routes rendered inside the VendorLayout shell.
export const vendorDashboardRoutes: RouteObject[] = [
  ...dashboardRestaurantRoutes,
  ...hotelVendorRoutes,
  ...clubVendorRoutes,
];
