'use client';

import { createContext, useContext, useState } from 'react';

const BookingsContext = createContext(undefined);

export function BookingsProvider({ children }) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [activeType, setActiveType] = useState('past');

  return (
    <BookingsContext.Provider value={{ setActiveTab, activeTab, activeType, setActiveType }}>
      {children}
    </BookingsContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingsContext);
  if (context === undefined) {
    throw new Error('useBookings must be used within a BookingsProvider');
  }
  return context;
}
