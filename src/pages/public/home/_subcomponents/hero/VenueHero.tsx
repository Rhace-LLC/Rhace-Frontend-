import { VENUE_HERO, type VenueTab } from '../config/venue.config';
import { VenueSearchBar } from '../search/VenueSearchBar';
import { VenueTabs } from './VenueTabs';

interface VenueHeroProps {
  activeTab: VenueTab;
  onTabChange: (tab: VenueTab) => void;
}

/** Homepage hero: background + heading + tabs + search. Data-driven, no ternaries. */
export const VenueHero = ({ activeTab, onTabChange }: VenueHeroProps) => {
  const hero = VENUE_HERO[activeTab];

  return (
    <div className="relative min-h-[400px] sm:min-h-[400px]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-br-[20px] rounded-bl-[20px]"
        style={{ backgroundImage: `url(${hero.image})` }}
      />
      <div className="absolute inset-0 bg-black/50 rounded-br-[20px] rounded-bl-[20px]" />

      <div className="relative max-w-7xl mx-auto px-4 min-h-[420px] sm:px-6 lg:px-8 py-14 sm:py-20 flex flex-col justify-center items-center text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 sm:mb-1 leading-snug mt-4[40px] sm:mt-6 lg:mt-8">
          {hero.title}
        </h1>
        <p className="text-xs font-normal sm:text-base md:text-xl text-white/90 mb-5 sm:mb-8 leading-relaxed">
          {hero.subtitle}
        </p>

        <VenueTabs activeTab={activeTab} onChange={onTabChange} />

        <div className="relative w-full mt-4 sm:mt-5 lg:mt-6 px-1 sm:px-0 z-50">
          <VenueSearchBar activeTab={activeTab} onSearch={() => {}} />
        </div>
      </div>
    </div>
  );
};
