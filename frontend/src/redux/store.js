import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice';

/**
 * Redux Store
 * 
 * Why needed:
 * - Centralized state management
 * - Stores authentication state (token, user info)
 * - Enables components to access global state
 * - Handles async actions (API calls)
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types (Keycloak object is not serializable)
        ignoredActions: ['auth/initializeKeycloak'],
      },
    }),
});

