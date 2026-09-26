import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
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
import {
  hotelPlugin,
  nightclubPlugin,
  restaurantPlugin,
  PrototypeInventoryManager,
  PrototypeTimelineView,
} from '@/features/floor-plan';
import { VendorReservationsPage } from '@/pages/vendor/shared/reservations';
import { AllStaffTab } from '@/pages/vendor/shared/staff/AllStaffTab';
import { ShiftManagerTab } from '@/pages/vendor/shared/staff/ShiftManagerTab';
import { ReportsTab } from '@/pages/vendor/shared/staff/ReportsTab';
import { ActivityTab } from '@/pages/vendor/shared/staff/ActivityTab';

type VenueVertical = 'hotel' | 'club' | 'restaurant';
type ManagerTab =
  | 'allStaff'
  | 'shifts'
  | 'reports'
  | 'activity'
  | 'reservations'
  | 'inventory'
  | 'map';

const PLUGINS = {
  hotel: hotelPlugin,
  club: nightclubPlugin,
  restaurant: restaurantPlugin,
} as const;

/** A staffer belongs to exactly one vendor — its profile owns the vertical. */
function verticalForVendorType(vendorType?: string): VenueVertical {
  const normalized = String(vendorType ?? '').toLowerCase();
  if (normalized.includes('hotel')) return 'hotel';
  if (normalized.includes('club')) return 'club';
  return 'restaurant';
}

interface HubLink {
  tab: ManagerTab;
  title: string;
  sub: string;
  icon: typeof Users;
}

const LINKS: HubLink[] = [
  { tab: 'allStaff', title: 'All staff', sub: 'Team members, roles and invites', icon: Users },
  { tab: 'shifts', title: 'Shifts', sub: 'Rota, clock-ins and cover', icon: CalendarClock },
  { tab: 'reports', title: 'Reports', sub: 'Sales, attendance and activity', icon: BarChart3 },
  { tab: 'activity', title: 'Activity', sub: 'What the team did, in plain words', icon: Activity },
  { tab: 'reservations', title: 'Reservations', sub: 'Bookings, check-ins and payments', icon: ClipboardList },
  { tab: 'inventory', title: 'Inventory', sub: 'Room and table types', icon: Boxes },
  { tab: 'map', title: 'Floor map', sub: 'Live layout and timeline', icon: Map },
];

const SECTION_TITLES: Record<ManagerTab, string> = {
  allStaff: 'All staff',
  shifts: 'Shifts',
  reports: 'Reports',
  activity: 'Activity',
  reservations: 'Reservations',
  inventory: 'Inventory',
  map: 'Floor map',
};

const VALID_TABS = new Set<string>(LINKS.map((l) => l.tab));

/**
 * Manager hub: no ops board, no ticket queue — the venue's management
 * sections rendered right here under ?tab=, so a staff login never has to
 * enter the vendor dashboard shell (which would strand it on auth).
 */
export default function ManagerWorkspace() {
  const { staff } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vertical, setVertical] = useState<VenueVertical | null>(null);

  const rawTab = searchParams.get('tab');
  const tab: ManagerTab | null =
    rawTab && VALID_TABS.has(rawTab) ? (rawTab as ManagerTab) : null;

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

  const openTab = (next: ManagerTab) =>
    setSearchParams({ tab: next }, { preventScrollReset: true });
  const goHub = () => setSearchParams({}, { preventScrollReset: true });

  return (
    <div className="space-y-5">
      {!tab ? (
        <>
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
                <button
                  key={link.tab}
                  type="button"
                  onClick={() => openTab(link.tab)}
                  className="group flex cursor-pointer items-center gap-3.5 rounded-res-md border border-res-line bg-res-card p-4 text-left shadow-res-low transition-all duration-200 outline-none hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand"
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
                </button>
              ))}
            </nav>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={goHub}
            className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-card px-4 py-2 font-semibold text-res-ink shadow-res-low transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h1 className="type-res-h2 -mt-2 text-res-ink">{SECTION_TITLES[tab]}</h1>
          {!vertical ? (
            <div className="h-64 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
          ) : (
            <>
              {tab === 'allStaff' && <AllStaffTab vertical={vertical} />}
              {tab === 'shifts' && <ShiftManagerTab vertical={vertical} />}
              {tab === 'reports' && <ReportsTab />}
              {tab === 'activity' && <ActivityTab />}
              {tab === 'reservations' && <VendorReservationsPage vertical={vertical} />}
              {tab === 'inventory' && <PrototypeInventoryManager plugin={PLUGINS[vertical]} />}
              {tab === 'map' && <PrototypeTimelineView plugin={PLUGINS[vertical]} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
