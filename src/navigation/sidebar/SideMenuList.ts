import type { ComponentType } from 'react';
import {
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Settings,
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
    },
    {
      label: 'Staff',
      path: '/dashboard/club/staffs',
      icon: Users,
    },
  ],
  bottomItems: [
    {
      label: 'Settings',
      path: '/dashboard/club/settings',
      icon: Settings,
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
    },
    {
      label: 'Staff',
      path: '/dashboard/hotel/staffs',
      icon: Users,
    },
  ],
  bottomItems: [
    {
      label: 'Settings',
      path: '/dashboard/hotel/settings',
      icon: Settings,
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
    },
    {
      label: 'Staff',
      path: '/dashboard/restaurant/staffs',
      icon: Users,
    },
  ],
  bottomItems: [
    {
      label: 'Settings',
      path: '/dashboard/restaurant/settings',
      icon: Settings,
    },
    {
      label: 'Logout',
      path: '#logout',
      icon: LogOut,
    },
  ],
};
