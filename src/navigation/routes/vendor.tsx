/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
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
import RestaurantTableManagement from '@/pages/vendor/restaurant/tables';
import RestaurantFloorLayout from '@/pages/vendor/restaurant/tables/layout';
import StaffManagementSystem from '@/pages/vendor/shared/staff';

// Vendor - Club
import BottleServiceManager from '@/pages/vendor/club/drinks/add';
import ClubDashboard from '@/pages/vendor/club/dashboard';
import { DrinksTable } from '@/pages/vendor/club/drinks';
import ClubReservationTable from '@/pages/vendor/club/reservations';
import ManageTables from '@/pages/vendor/club/tables';
import ClubFloorLayout from '@/pages/vendor/club/tables/layout';

// Vendor - Hotel
import AddRooms from '@/pages/vendor/hotel/rooms/add';
import BookingManagement from '@/pages/vendor/hotel/bookings';
import HotelDashboard from '@/pages/vendor/hotel/dashboard';
import HotelProfile from '@/pages/vendor/hotel/profile';
import RoomsManagement from '@/pages/vendor/hotel/rooms';
import HotelRoomLayout from '@/pages/vendor/hotel/rooms/layout';
import HotelSettings from '@/pages/vendor/hotel/settings';

// Prototype (mock-backed) — lazy so the canvas engine stays out of the main bundle.
const PrototypeManageTableRestaurant = lazy(
  () => import('@/pages/vendor/prototype/restaurant/ManageTableRestaurant')
);
const PrototypeFloorPlanRestaurant = lazy(
  () => import('@/pages/vendor/prototype/restaurant/FloorPlanRestaurant')
);
const PrototypeManageTableClub = lazy(
  () => import('@/pages/vendor/prototype/club/ManageTableClub')
);
const PrototypeFloorPlanClub = lazy(() => import('@/pages/vendor/prototype/club/FloorPlanClub'));
const PrototypeManageRoomHotel = lazy(
  () => import('@/pages/vendor/prototype/hotel/ManageRoomHotel')
);
const PrototypeFloorPlanHotel = lazy(
  () => import('@/pages/vendor/prototype/hotel/FloorPlanHotel')
);
const PrototypeInventoryRestaurant = lazy(
  () => import('@/pages/vendor/prototype/restaurant/InventoryRestaurant')
);
const PrototypeInventoryClub = lazy(
  () => import('@/pages/vendor/prototype/club/InventoryClub')
);
const PrototypeInventoryHotel = lazy(
  () => import('@/pages/vendor/prototype/hotel/InventoryHotel')
);

function PrototypeFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center text-sm text-gray-500">
      Loading prototype…
    </div>
  );
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PrototypeFallback />}>{node}</Suspense>;
}

const dashboardRestaurantRoutes: RouteObject[] = [
  { path: 'restaurant', element: <VendorDashboard /> },
  { path: 'restaurant/payments', element: <PaymentDashboard /> },
  { path: 'restaurant/staffs', element: <StaffManagementSystem /> },
  { path: 'restaurant/reservation', element: <ReservationDashboard /> },
  { path: 'restaurant/reservation/new', element: <CreateReservation /> },
  { path: 'restaurant/menu', element: <MenuDashboard /> },
  { path: 'restaurant/menu/new', element: <CreateMenu /> },
  { path: 'restaurant/menu/item/new', element: <CreateMenuItem /> },
  { path: 'restaurant/tables', element: <RestaurantTableManagement /> },
  { path: 'restaurant/tables/layout', element: <RestaurantFloorLayout /> },
  {
    path: 'restaurant/table/prototype',
    element: withSuspense(<PrototypeManageTableRestaurant />),
  },
  {
    path: 'restaurant/table/layouts/prototype',
    element: withSuspense(<PrototypeFloorPlanRestaurant />),
  },
  {
    path: 'restaurant/inventory/prototype',
    element: withSuspense(<PrototypeInventoryRestaurant />),
  },
  { path: 'restaurant/settings', element: <RestaurantSettings /> },
];

const hotelVendorRoutes: RouteObject[] = [
  { path: 'hotel', element: <HotelDashboard /> },
  { path: 'hotel/bookings', element: <BookingManagement /> },
  { path: 'hotel/rooms', element: <RoomsManagement /> },
  { path: 'hotel/rooms/layout', element: <HotelRoomLayout /> },
  { path: 'hotel/room/prototype', element: withSuspense(<PrototypeManageRoomHotel />) },
  {
    path: 'hotel/room/layouts/prototype',
    element: withSuspense(<PrototypeFloorPlanHotel />),
  },
  { path: 'hotel/inventory/prototype', element: withSuspense(<PrototypeInventoryHotel />) },
  { path: 'hotel/payments', element: <PaymentDashboard /> },
  { path: 'hotel/staffs', element: <StaffManagementSystem /> },
  { path: 'hotel/profile', element: <HotelProfile /> },
  { path: 'hotel/settings', element: <HotelSettings /> },
];

const clubVendorRoutes: RouteObject[] = [
  { path: 'club', element: <ClubDashboard /> },
  { path: 'club/drinks', element: <DrinksTable /> },
  { path: 'club/tables', element: <ManageTables /> },
  { path: 'club/tables/layout', element: <ClubFloorLayout /> },
  { path: 'club/table/prototype', element: withSuspense(<PrototypeManageTableClub />) },
  {
    path: 'club/table/layouts/prototype',
    element: withSuspense(<PrototypeFloorPlanClub />),
  },
  { path: 'club/inventory/prototype', element: withSuspense(<PrototypeInventoryClub />) },
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
