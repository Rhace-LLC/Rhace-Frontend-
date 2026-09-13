import type { ComponentType } from 'react';
import {
  BarChart3,
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

// Toggle the mock floor-plan prototype entries in the vendor sidebar.
export const SHOW_PROTOTYPE_ITEMS = true;

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
      label: 'Drink Menu',
      path: '/dashboard/club/drinks',
      icon: UtensilsCrossed,
    },
    {
      label: 'Tables',
      path: '/dashboard/club/tables',
      icon: LayoutGrid,
      children: [
        {
          label: 'Manage Tables',
          path: '/dashboard/club/tables',
          icon: UtensilsCrossed,
        },
        {
          label: 'Floor Layout',
          path: '/dashboard/club/tables/layout',
          icon: LayoutGrid,
        },
        ...(SHOW_PROTOTYPE_ITEMS
          ? [
              {
                label: 'Prototype Manager',
                path: '/dashboard/club/table/prototype',
                icon: LayoutGrid,
              },
              {
                label: 'Prototype Layout',
                path: '/dashboard/club/table/layouts/prototype',
                icon: LayoutGrid,
              },
            ]
          : []),
      ],
    },
    {
      label: 'Payments',
      path: '/dashboard/club/payments',
      icon: CreditCard,
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
      label: 'Rooms',
      path: '/dashboard/hotel/rooms',
      icon: Building2,
      children: [
        {
          label: 'Room Management',
          path: '/dashboard/hotel/rooms',
          icon: Building2,
        },
        {
          label: 'Room Layout',
          path: '/dashboard/hotel/rooms/layout',
          icon: LayoutGrid,
        },
        ...(SHOW_PROTOTYPE_ITEMS
          ? [
              {
                label: 'Prototype Manager',
                path: '/dashboard/hotel/room/prototype',
                icon: LayoutGrid,
              },
              {
                label: 'Prototype Layout',
                path: '/dashboard/hotel/room/layouts/prototype',
                icon: LayoutGrid,
              },
            ]
          : []),
      ],
    },
    {
      label: 'Payments',
      path: '/dashboard/hotel/payments',
      icon: CreditCard,
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
      label: 'Menu Management',
      path: '/dashboard/restaurant/menu',
      icon: UtensilsCrossed,
    },
    {
      label: 'Tables',
      path: '/dashboard/restaurant/tables',
      icon: LayoutGrid,
      children: [
        {
          label: 'Manage Tables',
          path: '/dashboard/restaurant/tables',
          icon: UtensilsCrossed,
        },
        {
          label: 'Floor Layout',
          path: '/dashboard/restaurant/tables/layout',
          icon: LayoutGrid,
        },
        ...(SHOW_PROTOTYPE_ITEMS
          ? [
              {
                label: 'Prototype Manager',
                path: '/dashboard/restaurant/table/prototype',
                icon: LayoutGrid,
              },
              {
                label: 'Prototype Layout',
                path: '/dashboard/restaurant/table/layouts/prototype',
                icon: LayoutGrid,
              },
            ]
          : []),
      ],
    },
    {
      label: 'Payments',
      path: '/dashboard/restaurant/payments',
      icon: CreditCard,
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
