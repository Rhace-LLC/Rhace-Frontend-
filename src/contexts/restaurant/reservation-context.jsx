'use client';

import { createContext, useContext, useState } from 'react';

const defaultReservationData = {
  restaurant: {
    name: 'Kapadoccia Restaurant',
    address: '16, Idowu Taylor Street, Victoria Island 101241 Nigeria',
  },
  reservationId: '#RES12345',
  date: 'May 29, 2025',
  time: '7:30 PM',
  guests: 4,
  items: [],
  meals: [
    {
      id: '',
      name: '',
      price: 0,
      quantity: 0,
    },
  ],
  specialRequest: 'One guest is allergic to garlic. Please consider this',
  totalAmount: 0,
  paymentStatus: 'paid',
  paymentDate: '8:00 am, May 28, 2025',
};

const ReservationContext = createContext(undefined);

export function ReservationProvider({ children }) {
  const [reservationData, setReservationData] = useState(defaultReservationData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateReservationData = (data) => {
    setReservationData((prev) => ({ ...prev, ...data }));
  };

  const setLoading = (loading) => {
    setIsLoading(loading);
    if (loading) setError(null);
  };

  const processPayment = async (cardDetails) => {
    setLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (cardDetails.cardNumber.replace(/\s/g, '').length < 16) {
        throw new Error('Invalid card number');
      }

      if (cardDetails.cvv.length < 3) {
        throw new Error('Invalid CVV');
      }

      updateReservationData({
        paymentStatus: 'paid',
        paymentDate: new Date().toLocaleString(),
      });

      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <ReservationContext.Provider
      value={{
        reservationData,
        isLoading,
        error,
        updateReservationData,
        setLoading,
        setError,
        processPayment,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservation() {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error('useReservation must be used within a ReservationProvider');
  }
  return context;
}
