import { SvgIcon, SvgIcon2, SvgIcon3 } from '@/components/icons/icons';
import type { VenueTab } from '../config/venue.config';

const TAB_DEFS: { name: string; value: VenueTab; icon: typeof SvgIcon }[] = [
  { name: 'Restaurants', value: 'restaurants', icon: SvgIcon },
  { name: 'Hotels', value: 'hotels', icon: SvgIcon2 },
  { name: 'Clubs', value: 'clubs', icon: SvgIcon3 },
];

interface VenueTabsProps {
  activeTab: VenueTab;
  onChange: (tab: VenueTab) => void;
}

export const VenueTabs = ({ activeTab, onChange }: VenueTabsProps) => (
  <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 mt-1 sm:mt-4 mb-2 sm:-mb-10">
    {TAB_DEFS.map((tab) => {
      const Icon = tab.icon as (props: { isActive: boolean }) => React.ReactElement;
      return (
        <button
          key={tab.value}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-[36px] gap-1.5 sm:gap-2.5 cursor-pointer text-[12px] sm:text-sm flex items-center font-medium transition-colors duration-200 ${
            activeTab === tab.value
              ? 'bg-slate-200 text-gray-900'
              : 'bg-transparent text-gray-50 hover:bg-white/10'
          }`}
          onClick={() => onChange(tab.value)}
        >
          <figure className="w-4 h-4 sm:w-5 sm:h-5 flex items-center">
            <Icon isActive={activeTab === tab.value} />
          </figure>
          <span>{tab.name}</span>
        </button>
      );
    })}
  </div>
);
