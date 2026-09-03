import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Star,
  MapPin,
  Zap,
  Clock,
  ChevronRight,
  Utensils,
  Hotel,
  Music,
} from 'lucide-react';
import { DiscoveryListCard, DiscoverySkeletonList, type VendorLike } from './VenueCard';
import { FoodIcon } from '@/public/icons/icons';

// ── Recent searches pill row ───────────────────────────────────────────────────
interface RecentSearchPillsProps {
  recentSearches?: string[];
  onSearch: (term: string) => void;
}

const RecentSearchPills = ({ recentSearches = [], onSearch }: RecentSearchPillsProps) => {
  if (!recentSearches.length) return null;
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-3">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Recent Searches
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {recentSearches.slice(0, 8).map((s) => (
          <button
            key={s}
            onClick={() => onSearch(s)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-[#0A6C6D] hover:text-[#0A6C6D] hover:bg-[#0A6C6D]/5 transition-all font-medium shadow-sm"
          >
            <Clock className="w-2.5 h-2.5" />
            {s}
          </button>
        ))}
      </div>
    </section>
  );
};

// ── Section heading ────────────────────────────────────────────────────────────
interface SectionHeadingProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}

const SectionHeading = ({ icon, title, subtitle, action, onAction }: SectionHeadingProps) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {/* <div className="w-7 h-7 flex items-center justify-center bg-[#0A6C6D]/10 rounded-lg text-[#0A6C6D]">
        {icon}
      </div> */}
      <div>
        <h3 className="text-sm sm:text-base font-black text-gray-900 leading-none">{title}</h3>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && (
      <button
        onClick={onAction}
        className="text-xs font-bold text-[#0A6C6D] hover:underline flex items-center gap-0.5 shrink-0"
      >
        See all <ChevronRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

// ── Divider between items ──────────────────────────────────────────────────────
const ListDivider = () => <div className="border-t border-gray-300 mx-4" />;

// ── Card list section (up to 8 items) ─────────────────────────────────────────
interface CardSectionProps {
  vendors?: VendorLike[];
  isLoading: boolean;
  type?: string;
  skeletonCount?: number;
  onAction?: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

const CardSection = ({ vendors = [], isLoading, type, skeletonCount = 4, onAction, navigate }: CardSectionProps) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl  border-gray-100 overflow-hidden">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i}>
            <DiscoverySkeletonList />
            {i < skeletonCount - 1 && <ListDivider />}
          </div>
        ))}
      </div>
    );
  }
  if (!vendors.length)
    return <p className="text-sm text-gray-400 py-6 text-center">No listings available yet.</p>;

  const sliced = vendors.slice(0, 8);

  return (
    <div className="overflow-hidden">
      {sliced.map((v, i) => (
        <div key={v._id}>
          <DiscoveryListCard vendor={v} activeType={type} navigate={navigate} />
          {i < sliced.length - 1 && <ListDivider />}
        </div>
      ))}
    </div>
  );
};

// ── Type filter chips ──────────────────────────────────────────────────────────
const TYPE_TABS = [
  { val: '', label: 'All', icon: <Zap className="w-3.5 h-3.5" /> },
  {
    val: 'restaurant',
    label: 'Restaurants',
    icon: <FoodIcon />,
  },
  { val: 'hotel', label: 'Hotels', icon: <Hotel className="w-3.5 h-3.5" /> },
  { val: 'club', label: 'Clubs', icon: <Music className="w-3.5 h-3.5" /> },
];

interface DiscoveryData {
  nearby?: VendorLike[];
  topRated?: VendorLike[];
  restaurants?: VendorLike[];
  hotels?: VendorLike[];
  clubs?: VendorLike[];
}

interface DiscoveryHomeProps {
  discovery: DiscoveryData;
  isDiscLoading: boolean;
  locationState: { location?: { city?: string } };
  updateFilter: (key: string, value: unknown) => void;
  submitSearch: (term?: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  activeType?: string;
  recentSearches?: string[];
}

// ── Main discovery home ────────────────────────────────────────────────────────
export const DiscoveryHome = ({
  discovery,
  isDiscLoading,
  locationState,
  submitSearch,
  activeType = '',
  recentSearches = [],
}: DiscoveryHomeProps) => {
  const navigate = useNavigate();
  const { nearby = [], topRated = [], restaurants = [], hotels = [], clubs = [] } = discovery;

  // Which sections to show based on activeType
  const showAll = !activeType;
  const showRestaurants = showAll || activeType === 'restaurant';
  const showHotels = showAll || activeType === 'hotel';
  const showClubs = showAll || activeType === 'club';
  const showNearby = nearby.length > 0 || isDiscLoading;

  void TYPE_TABS;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-8">
      {/* Recent searches */}
      <RecentSearchPills recentSearches={recentSearches} onSearch={submitSearch} />

      {/* Desktop: two-column grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-8">
          {/* Near You */}
          {showNearby && (
            <section>
              <SectionHeading
                icon={<MapPin className="w-4 h-4" />}
                title={
                  locationState.location?.city ? `Near ${locationState.location.city}` : 'Near You'
                }
                subtitle="Based on your current location"
              />
              <CardSection
                vendors={nearby}
                isLoading={isDiscLoading}
                navigate={navigate}
                skeletonCount={3}
              />
            </section>
          )}

          {/* Restaurants */}
          {showRestaurants && (isDiscLoading || restaurants.length > 0) && (
            <section>
              <SectionHeading
                icon={<Utensils className="w-4 h-4" />}
                title="Top Restaurants"
                subtitle="Highly rated dining experiences"
              />
              <CardSection
                vendors={restaurants}
                isLoading={isDiscLoading}
                type="restaurant"
                navigate={navigate}
              />
            </section>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-8">
          {/* Trending */}
          {(showAll || activeType) && (
            <section>
              <SectionHeading
                icon={<TrendingUp className="w-4 h-4" />}
                title="Trending Now"
                subtitle="Most popular bookings right now"
              />
              <CardSection
                vendors={topRated}
                isLoading={isDiscLoading}
                navigate={navigate}
                skeletonCount={4}
              />
            </section>
          )}

          {/* Hotels */}
          {showHotels && (isDiscLoading || hotels.length > 0) && (
            <section>
              <SectionHeading
                icon={<Star className="w-4 h-4" />}
                title="Featured Hotels"
                subtitle="Luxury & budget stays"
              />
              <CardSection
                vendors={hotels}
                isLoading={isDiscLoading}
                type="hotel"
                navigate={navigate}
              />
            </section>
          )}

          {/* Clubs */}
          {showClubs && (isDiscLoading || clubs.length > 0) && (
            <section>
              <SectionHeading
                icon={<Zap className="w-4 h-4" />}
                title="Tonight's Clubs"
                subtitle="Plan your perfect night out"
              />
              <CardSection
                vendors={clubs}
                isLoading={isDiscLoading}
                type="club"
                navigate={navigate}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};