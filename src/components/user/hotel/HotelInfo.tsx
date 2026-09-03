'use client';
import React, { type Dispatch, type SetStateAction } from 'react';
import Rooms, { type HotelRoom } from './Rooms';
import RestaurantReviews from '../restaurant/RestaurantReview';
import HotelOverview from './HotelOverview';
import Policies from './Policies';

interface HotelData {
  businessDescription?: string;
  policies?: Record<string, any>;
}

interface HotelInfoProps {
  data: HotelData;
  setShow: Dispatch<SetStateAction<boolean>>;
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  id: string;
  selectedRooms: HotelRoom[];
  setSelectedRooms: Dispatch<SetStateAction<HotelRoom[]>>;
  rooms: HotelRoom[];
  setRooms?: Dispatch<SetStateAction<HotelRoom[]>>;
}

const HotelInfo = ({
  data,
  setShow,
  activeTab,
  setActiveTab,
  id,
  selectedRooms,
  setSelectedRooms,
  rooms,
  setRooms,
}: HotelInfoProps) => {
  const tabs = [
    {
      name: 'Details',
      tab: 'details',
    },
    {
      name: 'Rooms',
      tab: 'rooms',
    },
    {
      name: 'Policies',
      tab: 'policies',
    },
    {
      name: 'Reviews',
      tab: 'reviews',
    },
  ];

  return (
    <div>
      <div className="border-[#E5E7EB] border-b  overflow-auto w-full">
        <div className="w-max flex-nowrap flex">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(tab.tab)}
              className={`p-3 w-max cursor-pointer font-semibold ${
                activeTab === tab.tab
                  ? 'border-b-2 text-[#0A6C6D] border-[#0A6C6D]'
                  : 'text-[#606368]'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 px-4 md:px-0">
        {activeTab === 'details' && <HotelOverview desc={data.businessDescription} />}
        {activeTab === 'policies' && <Policies data={data.policies} />}
        {activeTab === 'rooms' && (
          <Rooms
            setShow={setShow}
            selectedRooms={selectedRooms}
            setSelectedRooms={setSelectedRooms}
            rooms={rooms}
            setRooms={setRooms}
            id={id}
          />
        )}
        {activeTab === 'reviews' && <RestaurantReviews restaurantId={id} />}
      </div>
    </div>
  );
};

export default HotelInfo;
