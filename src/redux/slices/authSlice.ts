import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { AuthUser, AuthVendor, AuthAdmin } from '@/types';
import { clearTokens } from '@/lib/storage';

export interface AuthState {
  user: AuthUser | null;
  vendor: AuthVendor | null;
  admin: AuthAdmin | null;
  isAuthenticated: boolean;
  tokenExpiry: string | number | null;
  loading: boolean;
}

export const logoutAsync = createAsyncThunk(
  'auth/logoutAsync',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const userType = state.auth.user ? 'user' : state.auth.vendor ? 'vendor' : null;

    clearTokens();
    // Clear Redux state
    dispatch({ type: 'auth/logout' });

    // Navigate to respective login page
    if (userType === 'user') {
      window.location.href = '/auth/users/login';
    } else if (userType === 'vendor') {
      window.location.href = '/auth/vendor/login';
    }
  }
);

const initialState: AuthState = {
  user: null,
  vendor: null,
  admin: null,
  isAuthenticated: false,
  tokenExpiry: null,
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload;
      state.vendor = null;
      state.admin = null;
      state.isAuthenticated = true;
      state.tokenExpiry = action.payload?.expiresAt ?? null;
    },
    setVendor: (state, action: PayloadAction<AuthVendor | null>) => {
      state.vendor = action.payload;
      state.user = null;
      state.admin = null;
      state.isAuthenticated = true;
      state.tokenExpiry = action.payload?.expiresAt ?? null;
    },
    setAdmin: (state, action: PayloadAction<AuthAdmin | null>) => {
      state.admin = action.payload;
      state.user = null;
      state.vendor = null;
      state.isAuthenticated = true;
      state.tokenExpiry = action.payload?.expiresAt ?? null;
    },
    logout: (state) => {
      state.user = null;
      state.vendor = null;
      state.admin = null;
      state.isAuthenticated = false;
      state.tokenExpiry = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        // Already handled in the thunk via dispatch({ type: 'auth/logout' })
        state.loading = false;
      })
      .addCase(logoutAsync.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setUser, setVendor, setAdmin, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
