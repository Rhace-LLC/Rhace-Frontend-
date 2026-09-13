import api from '@/lib/axios';
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { Room } from '@/types';

// Async thunk to fetch room types for a given hotelId
export const fetchRoomTypes = createAsyncThunk(
  'vendor/fetchRoomTypes',
  async (hotelId: string, { rejectWithValue }) => {
    if (!hotelId) return rejectWithValue('Missing hotelId');
    try {
      const res = await api.get(`/hotels/${hotelId}/roomtypes`);
      // axios responses expose the payload on `data`
      return res.data;
    } catch (err) {
      // prefer server-provided message when available
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message =
        (err as { response?: { data?: unknown } })?.response?.data || e?.message || 'Network error';
      return rejectWithValue(message);
    }
  }
);

interface VendorDetails {
  id: string;
  email: string;
  [key: string]: unknown;
}

interface RoomTypesState {
  items: Room[] | unknown[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: unknown;
}

interface VendorState {
  type: string | null;
  details: VendorDetails;
  roomTypes: RoomTypesState;
}

const initialState: VendorState = {
  type: null,
  details: {
    id: '',
    email: '',
  },
  roomTypes: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
};

const vendorSlice = createSlice({
  name: 'vendor',
  initialState,
  reducers: {
    setVendorType: (state, action: PayloadAction<string | null>) => {
      state.type = action.payload;
    },
    setVendorDetails: (state, action: PayloadAction<Partial<VendorDetails>>) => {
      state.details = { ...state.details, ...action.payload };
    },
    resetVendor: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoomTypes.pending, (state) => {
        state.roomTypes.status = 'loading';
        state.roomTypes.error = null;
      })
      .addCase(fetchRoomTypes.fulfilled, (state, action) => {
        state.roomTypes.status = 'succeeded';
        // store items directly; action.payload expected to be an array
        state.roomTypes.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchRoomTypes.rejected, (state, action) => {
        state.roomTypes.status = 'failed';
        state.roomTypes.error = action.payload || action.error.message;
      });
  },
});

export const { setVendorType, setVendorDetails, resetVendor } = vendorSlice.actions;
export const selectVendorDetails = (state: RootState) => state.vendor.details;
export const selectRoomTypes = (state: RootState) => state.vendor.roomTypes;
export default vendorSlice.reducer;
