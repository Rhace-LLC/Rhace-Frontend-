import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LocationState } from '@/types';

const initialState: LocationState = {
  lat: null,
  lng: null,
  city: '',
  country: '',
  status: 'idle',
  error: null,
};

export type SetLocationPayload = Partial<LocationState>;

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<SetLocationPayload>) => {
      const { lat, lng, city, country, status, error } = action.payload;
      if (lat !== undefined) state.lat = lat;
      if (lng !== undefined) state.lng = lng;
      if (city !== undefined) state.city = city;
      if (country !== undefined) state.country = country;
      if (status !== undefined) state.status = status;
      if (error !== undefined) state.error = error;
    },
    clearLocation: () => initialState,
  },
});

export const { setLocation, clearLocation } = locationSlice.actions;
export default locationSlice.reducer;
