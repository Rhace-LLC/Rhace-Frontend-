'use client';
import React, { useState } from 'react';
import ClubInfos from './ClubInfos';
import RestaurantReviews from '@/pages/public/restaurants/_subcomponents/RestaurantReview';
import ComingSoonIcon from '@/public/images/coming-soon_icon.png';
import ClubDrinks from './ClubDrinks';
import { useLocation } from 'react-router';
import type { Club } from '@/types';

interface ClubInfoProps {
  data?: Club;
}

const ClubInfo = ({ data }: ClubInfoProps) => {
  const location = useLocation();
  const section = location.hash ? location.hash.substring(1) : 'info';
  const [activeTab, setActiveTab] = useState(section);

  const tabs = [
    {
      name: 'Info',
      tab: 'info',
    },
    {
      name: 'Drinks',
      tab: 'drinks',
    },
    {
      name: 'Reviews',
      tab: 'reviews',
    },
    {
      name: 'Upcoming events',
      tab: 'events',
    },
  ];
  return (
    <div>
      <div className="w-full overflow-x-auto hide-scrollbar">
        <div
          role="tablist"
          aria-label="Club sections"
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
        {activeTab === 'info' && (
          <ClubInfos
            address={data?.address}
            openingTime={data?.openingTime}
            closingTime={data?.closingTime}
            dressCode={data?.dressCode}
            desc={data?.businessDescription}
            ageLimit={String(data?.agePolicy ?? '')}
          />
        )}
        {activeTab === 'drinks' && <ClubDrinks id={data?._id} />}
        {activeTab === 'reviews' && (
          <RestaurantReviews restaurantId={data?._id} ratings={data?.rating} />
        )}
        {activeTab === 'events' && (
          <div className="w-full h-[200px]">
            <div className="mx-auto max-w-3xs flex flex-col items-center gap-4">
              <img src={ComingSoonIcon} alt="Coming Soon" className="w-24" />
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-700">Coming Soon</h2>
                <p className="text-sm text-gray-500">Stay tuned for updates!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubInfo;
