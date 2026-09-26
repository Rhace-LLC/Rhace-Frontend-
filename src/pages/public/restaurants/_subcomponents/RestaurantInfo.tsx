import React, { useState } from 'react';
import RestaurantOverview from './RestaurantOverview';
import RestaurantAvailableSlot from './RestaurantAvailableSlot';
import RestaurantMenu from './RestaurantMenu';
import RestaurantReviews from './RestaurantReview';
import { useLocation } from 'react-router';

interface RestaurantData {
  _id: string;
  address: string;
  openingTime: string;
  closingTime: string;
  cuisines: string[];
  businessDescription: string;
  priceRange?: string;
  availableSlots: string[];
  rating: number;
}

interface RestaurantInfoProps {
  data: RestaurantData;
}

const RestaurantInfo = ({ data }: RestaurantInfoProps) => {
  const location = useLocation();
  const section = location.hash ? location.hash.substring(1) : 'overview';
  const [activeTab, setActiveTab] = useState(section);

  const tabs = [
    {
      name: 'Overview',
      tab: 'overview',
    },
    {
      name: 'Menu',
      tab: 'menu',
    },
    {
      name: 'Reviews',
      tab: 'reviews',
    },
  ];
  return (
    <div>
      <div className="w-full overflow-x-auto hide-scrollbar">
        <div
          role="tablist"
          aria-label="Restaurant sections"
          className="flex w-full gap-1 rounded-res-md bg-res-surface p-1 sm:w-max sm:rounded-full"
        >
          {tabs.map((tab, i) => {
            const isActive = activeTab === tab.tab;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.tab)}
                className={`type-res-body flex-1 cursor-pointer rounded-full px-5 py-2 whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-res-brand sm:flex-none ${
                  isActive
                    ? 'bg-res-card text-res-brand shadow-res-low'
                    : 'text-res-ink-muted hover:text-res-ink'
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-5">
        {activeTab === 'overview' && (
          <RestaurantOverview
            address={data.address}
            openingTime={data.openingTime}
            closingTime={data.closingTime}
            cuisines={data.cuisines}
            desc={data.businessDescription}
            priceRange={data?.priceRange ?? ''}
          />
        )}
        {activeTab === 'menu' && <RestaurantMenu id={data._id} />}
        {activeTab === 'available' && (
          <RestaurantAvailableSlot
            openingTime={data.openingTime}
            closingTime={data.closingTime}
            availableSlots={data.availableSlots}
          />
        )}
        {activeTab === 'reviews' && (
          <RestaurantReviews restaurantId={data._id} ratings={data.rating} />
        )}
      </div>
    </div>
  );
};

export default RestaurantInfo;
