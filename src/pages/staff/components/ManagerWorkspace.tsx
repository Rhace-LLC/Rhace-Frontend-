import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  Map,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/user.service';

type VenueVertical = 'hotel' | 'club' | 'restaurant';

const RESERVATIONS_PATH: Record<VenueVertical, string> = {
  hotel: 'hotel/bookings',
  club: 'club/reservations',
  restaurant: 'restaurant/reservation',
};

/** A staffer belongs to exactly one vendor — its profile owns the vertical. */
function verticalForVendorType(vendorType?: string): VenueVertical {
  const normalized = String(vendorType ?? '').toLowerCase();
  if (normalized.includes('hotel')) return 'hotel';
  if (normalized.includes('club')) return 'club';
  return 'restaurant';
}

interface HubLink {
  title: string;
  sub: string;
  icon: typeof Users;
  path: (vertical: VenueVertical) => string;
}

const LINKS: HubLink[] = [
  {
    title: 'All staff',
    sub: 'Team members, roles and invites',
    icon: Users,
    path: (v) => `/dashboard/${v}/staffs/all`,
  },
  {
    title: 'Shifts',
    sub: 'Rota, clock-ins and cover',
    icon: CalendarClock,
    path: (v) => `/dashboard/${v}/staffs/shifts`,
  },
  {
    title: 'Reports',
    sub: 'Sales, attendance and activity',
    icon: BarChart3,
    path: (v) => `/dashboard/${v}/staffs/reports`,
  },
  {
    title: 'Activity',
    sub: 'What the team did, in plain words',
    icon: Activity,
    path: (v) => `/dashboard/${v}/staffs/activity`,
  },
  {
    title: 'Reservations',
    sub: 'Bookings, check-ins and payments',
    icon: ClipboardList,
    path: (v) => `/dashboard/${RESERVATIONS_PATH[v]}`,
  },
  {
    title: 'Inventory',
    sub: 'Room and table types',
    icon: Boxes,
    path: (v) => `/dashboard/${v}/inventory/prototype`,
  },
  {
    title: 'Floor map',
    sub: 'Live layout and timeline',
    icon: Map,
    path: (v) => `/dashboard/${v}/timeline/prototype`,
  },
];

/**
 * Manager hub: no ops board, no ticket queue — a doorway to the pages a
 * manager runs (staff, bookings, inventory), on their venue's vertical.
 */
export default function ManagerWorkspace() {
  const { staff } = useAuth();
  const [vertical, setVertical] = useState<VenueVertical | null>(null);

  useEffect(() => {
    let cancelled = false;
    const vendorId = staff?.vendor;
    if (!vendorId) {
      setVertical('restaurant');
      return;
    }
    userService
      .getVendor(vendorId)
      .then((res) => {
        if (cancelled) return;
        setVertical(verticalForVendorType(res?.data?.vendorType));
      })
      .catch(() => {
        if (!cancelled) setVertical('restaurant');
      });
    return () => {
      cancelled = true;
    };
  }, [staff?.vendor]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="type-res-h2 text-res-ink">
          {staff?.name ? `Welcome, ${staff.name.split(' ')[0]}` : 'Manager'}
        </h1>
        <p className="type-res-body mt-1 font-normal text-res-ink-muted">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}{' '}
          · everything you oversee, in one place.
        </p>
      </div>

      {!vertical ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-res-md bg-res-card shadow-res-low" />
          ))}
        </div>
      ) : (
        <nav aria-label="Manager pages" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((link) => (
            <Link
              key={link.title}
              to={link.path(vertical)}
              className="group flex items-center gap-3.5 rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low transition-all duration-200 outline-none hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand"
            >
              <span className="rounded-full bg-res-surface p-2.5 transition-colors group-hover:bg-res-secondary">
                <link.icon className="h-5 w-5 text-res-brand" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="type-res-h3 block text-res-ink">{link.title}</span>
                <span className="type-res-small block truncate font-normal text-res-ink-muted">
                  {link.sub}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-res-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-res-brand" />
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
