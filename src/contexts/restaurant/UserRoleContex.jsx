'use client';
import { createContext, useContext } from 'react';

export const UserRoleContext = createContext('hotel-owner');
export const useUserRole = () => useContext(UserRoleContext);
