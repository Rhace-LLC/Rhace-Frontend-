import Footer from '@/navigation/user_layout/_sub_component/Footer';
import UserHeader from '@/navigation/user_layout/_sub_component/UserHeader';
import { TAB_TO_VERTICAL, VENUE_SECTIONS } from './_subcomponents/config/venue.config';
import { VenueGrid } from './_subcomponents/grid/VenueGrid';
import { VenueHero } from './_subcomponents/hero/VenueHero';
import { useActiveTab } from './_subcomponents/hooks/useActiveTab';

function ReservationHomePage() {
  const { activeTab, setActiveTab } = useActiveTab();
  const vertical = TAB_TO_VERTICAL[activeTab];

  return (
    <div>
      <UserHeader />
      <VenueHero activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mt-16 sm:mt-[65px] mx-auto lg:px-8 py-8">
        {VENUE_SECTIONS[activeTab].map((section) => (
          <VenueGrid
            key={section.title}
            title={section.title}
            vertical={vertical}
            filter={section.filter}
          />
        ))}
      </div>
      <Footer />
    </div>
  );
}

export default ReservationHomePage;