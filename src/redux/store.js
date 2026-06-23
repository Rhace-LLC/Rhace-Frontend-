import { configureStore } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import { combineReducers } from 'redux';
import authReducer from './slices/authSlice';
import vendorReducer from './slices/vendorSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'vendor'],
};

const rootReducer = combineReducers({
  auth: authReducer,
  vendor: vendorReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
