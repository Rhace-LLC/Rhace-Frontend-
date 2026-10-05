import type { ComponentType } from 'react';
import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck,
  ConciergeBell,
  Landmark,
  Plug,
  RotateCcw,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Receipt,
  Settings,
  Tags,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { RhaceIcon } from '@/components/icons/icons';

export { RhaceIcon };

export interface SideMenuItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string; color?: string }>;
  active?: boolean;
  children?: SideMenuItem[];
}

export interface SideMenuListConfig {
  topItems: SideMenuItem[];
  bottomItems: SideMenuItem[];
}

export const AdminList: SideMenuListConfig = {
  topItems: [
    {
      label: 'Dashboard',
      path: '/dashboard/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'Vendors',
      path: '/dashboard/admin/vendors',
      icon: Building2,
    },
    {
      label: 'Users',
      path: '/dashboard/admin/users',
      icon: Users,
    },
    {
      label: 'Reservations',
      path: '/dashboard/admin/reservations',
      icon: CalendarCheck,
    },
    {
      label: 'Payments',
      path: '/dashboard/admin/payments',
      icon: CreditCard,
    },
    {
      label: 'Reports',
      path: '/dashboard/admin/reports',
      icon: BarChart3,
    },
  ],
  bottomItems: [
    {
      label: 'Settings',
      path: '/dashboard/admin/settings',
      icon: Settings,
    },
    {
      label: 'Logout',
      path: '#logout',
      icon: LogOut,
    },
  ],
};

export const ClubList: SideMenuListConfig = {
  topItems: [
    {
      label: 'Dashboard',
      path: '/dashboard/club',
      icon: LayoutDashboard,
    },
    {
      label: 'Reservations',
      path: '/dashboard/club/reservations',
      icon: CalendarCheck,
    },
    {
      label: 'Orders',
      path: '/dashboard/club/orders',
      icon: Receipt,
    },
    {
      label: 'Drinks',
      path: '/dashboard/club/drinks',
      icon: UtensilsCrossed,
      children: [
        {
          label: 'Drinks',
          path: '/dashboard/club/drinks',
          icon: UtensilsCrossed,
        },
        {
          label: 'Categories',
          path: '/dashboard/club/drinks/categories',
          icon: LayoutGrid,
        },
        {
          label: 'Bottle Sets',
          path: '/dashboard/club/add-drinks',
          icon: Boxes,
        },
      ],
    },
    {
      label: 'Add-ons',
      path: '/dashboard/club/addons',
      icon: Boxes,
    },
    {
      label: 'Inventory',
      path: '/dashboard/club/table/prototype',
      icon: Boxes,
      children: [
        {
          label: 'All Inventory',
          path: '/dashboard/club/inventory/prototype',
          icon: Boxes,
        },
        {
          label: 'Manage',
          path: '/dashboard/club/table/prototype',
          icon: LayoutGrid,
        },
        {
          label: 'Layout',
          path: '/dashboard/club/table/layouts/prototype',
          icon: LayoutGrid,
        },
        {
          label: 'Reservation Calendar',
          path: '/dashboard/club/timeline/prototype',
          icon: CalendarCheck,
        },
      ],
    },
    {
      label: 'Payments',
      path: '/dashboard/club/payments',
      icon: CreditCard,
      children: [
        {
          label: 'Payments',
          path: '/dashboard/club/payments',
          icon: CreditCard,
        },
        {
          label: 'Refunds',
          path: '/dashboard/club/refunds',
          icon: RotateCcw,
        },
        {
          label: 'Settlements',
          path: '/dashboard/club/settlements',
          icon: Landmark,
        },
      ],
    },
    {
      label: 'Linked hotels',
      path: '/dashboard/club/linked-hotels',
      icon: Building2,
    },
    {
      label: 'Staff',
      path: '/dashboard/club/staffs',
      icon: Users,
      children: [
        {
          label: 'All Staff',
          path: '/dashboard/club/staffs/all',
          icon: Users,
        },
        {
          label: 'Shift Manager',
          path: '/dashboard/club/staffs/shifts',
          icon: CalendarCheck,
        },
        {
          label: 'Reports',
          path: '/dashboard/club/staffs/reports',
          icon: BarChart3,
        },
        {
          label: 'Activity',
          path: '/dashboard/club/staffs/activity',
          icon: Activity,
        },
      ],
    },
  ],
  bottomItems: [
    {
      label: 'Settings',
      path: '/dashboard/club/settings',
      icon: Settings,
      children: [
        {
          label: 'General',
          path: '/dashboard/club/settings',
          icon: Settings,
        },
        {
          label: 'Integrations',
          path: '/dashboard/club/integrations',
          icon: Plug,
        },
      ],
    },
    {
      label: 'Logout',
      path: '#logout',
      icon: LogOut,
    },
  ],
};

export const HotelList: SideMenuListConfig = {
  topItems: [
    {
      label: 'Dashboard',
      path: '/dashboard/hotel',
      icon: LayoutDashboard,
    },
    {
      label: 'Bookings',
      path: '/dashboard/hotel/bookings',
      icon: CalendarCheck,
    },
    {
      label: 'Orders',
      path: '/dashboard/hotel/orders',
      icon: Receipt,
    },
    {
      label: 'Services',
      path: '/dashboard/hotel/services',
      icon: ConciergeBell,
      children: [
        {
          label: 'Amenities & Experiences',
          path: '/dashboard/hotel/services',
          icon: ConciergeBell,
        },
        {
          label: 'Service Categories',
          path: '/dashboard/hotel/services/categories',
          icon: Tags,
        },
        {
          label: 'Experience Bookings',
          path: '/dashboard/hotel/services/bookings',
          icon: CalendarCheck,
        },
      ],
    },
    {
      label: 'Inventory',
      path: '/dashboard/hotel/room/prototype',
      icon: Boxes,
      children: [
        {
          label: 'All Inventory',
          path: '/dashboard/hotel/inventory/prototype',
          icon: Boxes,
        },
        {
          label: 'Manage',
          path: '/dashboard/hotel/room/prototype',
          icon: LayoutGrid,
        },
        {
          label: 'Layout',
          path: '/dashboard/hotel/room/layouts/prototype',
          icon: LayoutGrid,
        },
        {
          label: 'Reservation Calendar',
          path: '/dashboard/hotel/timeline/prototype',
          icon: CalendarCheck,
        },
      ],
    },
    {
      label: 'Payments',
      path: '/dashboard/hotel/payments',
      icon: CreditCard,
      children: [
        {
          label: 'Payments',
          path: '/dashboard/hotel/payments',
          icon: CreditCard,
        },
        {
          label: 'Refunds',
          path: '/dashboard/hotel/refunds',
          icon: RotateCcw,
        },
        {
          label: 'Settlements',
          path: '/dashboard/hotel/settlements',
          icon: Landmark,
        },
      ],
    },
    {
      label: 'Outlets',
      path: '/dashboard/hotel/outlets',
      icon: UtensilsCrossed,
      children: [
        {
          label: 'Linked outlets',
          path: '/dashboard/hotel/outlets',
          icon: UtensilsCrossed,
        },
        {
          label: 'Delivery zones',
          path: '/dashboard/hotel/zones',
          icon: LayoutGrid,
        },
        {
          label: 'Windows & fees',
          path: '/dashboard/hotel/ordering-rules',
          icon: CalendarCheck,
        },
        {
          label: 'In-stay orders',
          path: '/dashboard/hotel/outlet-orders',
          icon: Receipt,
        },
      ],
    },
    {
      label: 'Staff',
      path: '/dashboard/hotel/staffs',
      icon: Users,
      children: [
        {
          label: 'All Staff',
          path: '/dashboard/hotel/staffs/all',
          icon: Users,
        },
        {
          label: 'Shift Manager',
          path: '/dashboard/hotel/staffs/shifts',
          icon: CalendarCheck,
        },
        {
          label: 'Reports',
          path: '/dashboard/hotel/staffs/reports',
          icon: BarChart3,
        },
        {
          label: 'Activity',
          path: '/dashboard/hotel/staffs/activity',
          icon: Activity,
        },
      ],
    },
  ],
  bottomItems: [
    {
      label: 'Settings',
      path: '/dashboard/hotel/settings',
      icon: Settings,
      children: [
        {
          label: 'General',
          path: '/dashboard/hotel/settings',
          icon: Settings,
        },
        {
          label: 'Integrations',
          path: '/dashboard/hotel/integrations',
          icon: Plug,
        },
      ],
    },
    {
      label: 'Logout',
      path: '#logout',
      icon: LogOut,
    },
  ],
};

export const RestaurantList: SideMenuListConfig = {
  topItems: [
    {
      label: 'Dashboard',
      path: '/dashboard/restaurant',
      icon: LayoutDashboard,
    },
    {
      label: 'Reservations',
      path: '/dashboard/restaurant/reservation',
      icon: CalendarCheck,
    },
    {
      label: 'Orders',
      path: '/dashboard/restaurant/orders',
      icon: Receipt,
    },
    {
      label: 'Menu',
      path: '/dashboard/restaurant/menu',
      icon: UtensilsCrossed,
      children: [
        {
          label: 'Dishes',
          path: '/dashboard/restaurant/menu',
          icon: UtensilsCrossed,
        },
        {
          label: 'Categories',
          path: '/dashboard/restaurant/menu/categories',
          icon: LayoutGrid,
        },
      ],
    },
    {
      label: 'Drinks',
      path: '/dashboard/restaurant/menu/drinks',
      icon: LayoutGrid,
      children: [
        {
          label: 'Drinks',
          path: '/dashboard/restaurant/menu/drinks',
          icon: UtensilsCrossed,
        },
        {
          label: 'Categories',
          path: '/dashboard/restaurant/menu/drink-categories',
          icon: LayoutGrid,
        },
      ],
    },
    {
      label: 'Add-ons',
      path: '/dashboard/restaurant/menu/addons',
      icon: Boxes,
    },
    {
      label: 'Inventory',
      path: '/dashboard/restaurant/table/prototype',
      icon: Boxes,
      children: [
        {
          label: 'All Inventory',
          path: '/dashboard/restaurant/inventory/prototype',
          icon: Boxes,
        },
        {
          label: 'Manage',
          path: '/dashboard/restaurant/table/prototype',
          icon: LayoutGrid,
        },
        {
          label: 'Layout',
          path: '/dashboard/restaurant/table/layouts/prototype',
          icon: LayoutGrid,
        },
        {
          label: 'Reservation Calendar',
          path: '/dashboard/restaurant/timeline/prototype',
          icon: CalendarCheck,
        },
      ],
    },
    {
      label: 'Payments',
      path: '/dashboard/restaurant/payments',
      icon: CreditCard,
      children: [
        {
          label: 'Payments',
          path: '/dashboard/restaurant/payments',
          icon: CreditCard,
        },
        {
          label: 'Refunds',
          path: '/dashboard/restaurant/refunds',
          icon: RotateCcw,
        },
        {
          label: 'Settlements',
          path: '/dashboard/restaurant/settlements',
          icon: Landmark,
        },
      ],
    },
    {
      label: 'Linked hotels',
      path: '/dashboard/restaurant/linked-hotels',
      icon: Building2,
    },
    {
      label: 'Staff',
      path: '/dashboard/restaurant/staffs',
      icon: Users,
      children: [
        {
          label: 'All Staff',
          path: '/dashboard/restaurant/staffs/all',
          icon: Users,
        },
        {
          label: 'Shift Manager',
          path: '/dashboard/restaurant/staffs/shifts',
          icon: CalendarCheck,
        },
        {
          label: 'Reports',
          path: '/dashboard/restaurant/staffs/reports',
          icon: BarChart3,
        },
        {
          label: 'Activity',
          path: '/dashboard/restaurant/staffs/activity',
          icon: Activity,
        },
      ],
    },
  ],
  bottomItems: [
    {
      label: 'Settings',
      path: '/dashboard/restaurant/settings',
      icon: Settings,
      children: [
        {
          label: 'General',
          path: '/dashboard/restaurant/settings',
          icon: Settings,
        },
        {
          label: 'Integrations',
          path: '/dashboard/restaurant/integrations',
          icon: Plug,
        },
      ],
    },
    {
      label: 'Logout',
      path: '#logout',
      icon: LogOut,
    },
  ],
};
