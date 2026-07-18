import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  lat: null,
  lng: null,
  city: '',
  country: '',
  status: 'idle',
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation: (state, action) => {
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
