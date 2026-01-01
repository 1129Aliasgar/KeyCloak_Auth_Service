import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import Keycloak from 'keycloak-js';
import axios from 'axios';

/**
 * Auth Slice
 * 
 * Why needed:
 * - Manages authentication state (token, user, loading)
 * - Handles Keycloak initialization
 * - Provides actions for login/logout
 * - Manages API calls to backend with token
 * 
 * How it works:
 * - Uses Keycloak JS library to handle authentication
 * - Stores token in Redux state
 * - Configures axios to include token in requests
 * - Handles token refresh automatically
 */

// Keycloak configuration from environment variables
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
};

// Initialize Keycloak instance
let keycloakInstance = null;

// Track if we're already handling a 401 to prevent loops
let isHandling401 = false;

// Configure axios to include token in requests
const setupAxiosInterceptors = (getToken) => {
  axios.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        const cleanToken = token.trim();
        config.headers.Authorization = `Bearer ${cleanToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Handle 401 errors (token expired/invalid)
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401 && !isHandling401) {
        isHandling401 = true;
        
        // Try to refresh token first before logging out
        if (keycloakInstance && keycloakInstance.authenticated) {
          try {
            const refreshed = await keycloakInstance.updateToken(30);
            if (refreshed && keycloakInstance.token) {
              error.config.headers.Authorization = `Bearer ${keycloakInstance.token.trim()}`;
              isHandling401 = false;
              return axios.request(error.config);
            }
          } catch (refreshError) {
            // Token refresh failed, will logout below
          }
        }
        
        // Only logout if refresh failed or user not authenticated
        isHandling401 = false;
        if (keycloakInstance) {
          setTimeout(() => {
            keycloakInstance.logout({
              redirectUri: window.location.origin + '/login',
            });
          }, 1000);
        }
      }
      isHandling401 = false;
      return Promise.reject(error);
    }
  );
};

// Initialize Keycloak
export const initializeKeycloak = createAsyncThunk(
  'auth/initializeKeycloak',
  async (_, { dispatch }) => {
    try {
      keycloakInstance = new Keycloak(keycloakConfig);

      // Initialize with silent check-sso to avoid redirect loops
      const authenticated = await keycloakInstance.init({
        onLoad: 'check-sso', // Check SSO status silently without redirect
        checkLoginIframe: false,
        pkceMethod: 'S256', // Use PKCE for security
        enableLogging: false, // Set to true for debugging
      });

      // Setup axios interceptors
      setupAxiosInterceptors(() => keycloakInstance?.token);

      // Handle token updates
      keycloakInstance.onTokenExpired = () => {
        keycloakInstance.updateToken(30).then((refreshed) => {
          if (refreshed) {
            dispatch(setAuthenticated({ keycloak: keycloakInstance }));
          }
        }).catch(() => {
          dispatch(setUnauthenticated({ keycloak: keycloakInstance }));
        });
      };

      if (authenticated) {
        // User is already authenticated - ensure token is available
        if (keycloakInstance.token) {
          dispatch(setAuthenticated({ keycloak: keycloakInstance }));
        } else {
          // Try to get token
          try {
            await keycloakInstance.updateToken(30);
            if (keycloakInstance.token) {
              dispatch(setAuthenticated({ keycloak: keycloakInstance }));
            } else {
              dispatch(setUnauthenticated({ keycloak: keycloakInstance }));
            }
          } catch (error) {
            dispatch(setUnauthenticated({ keycloak: keycloakInstance }));
          }
        }
      } else {
        // User is not authenticated
        dispatch(setUnauthenticated({ keycloak: keycloakInstance }));
      }

      return { keycloak: keycloakInstance, authenticated: keycloakInstance.authenticated };
    } catch (error) {
      dispatch(setUnauthenticated({ keycloak: keycloakInstance }));
      return { keycloak: keycloakInstance, authenticated: false };
    }
  }
);

// Login action - redirects directly to Keycloak login page
export const login = createAsyncThunk(
  'auth/login',
  async (_, { getState }) => {
    const { auth } = getState();
    if (auth.keycloak) {
      // Redirect directly to Keycloak login page
      auth.keycloak.login({
        redirectUri: window.location.origin + '/dashboard',
      });
    } else {
      // If Keycloak not initialized, initialize first
      const keycloak = new Keycloak(keycloakConfig);
      await keycloak.init({ onLoad: 'login-required' });
    }
  }
);

// Logout action - clears token from frontend and backend
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState, dispatch }) => {
    const { auth } = getState();
    
    try {
      // Call backend logout endpoint (optional - for logging purposes)
      if (auth.keycloak && auth.keycloak.token) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        try {
          await axios.post(`${backendUrl}/api/users/logout`, {}, {
            headers: {
              Authorization: `Bearer ${auth.keycloak.token}`
            }
          });
        } catch (error) {
          // Ignore errors from logout endpoint (token might already be invalid)
        }
      }
    } catch (error) {
      // Continue with logout even if backend call fails
    }
    
    // Clear Redux state
    dispatch(clearAuthState());
    
    // Clear any stored tokens
    localStorage.clear();
    sessionStorage.clear();
    
    // Logout from Keycloak (this will clear Keycloak session and redirect)
    if (auth.keycloak) {
      auth.keycloak.logout({
        redirectUri: window.location.origin + '/login',
      });
    }
  }
);

// Check authentication status (without causing redirects)
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { getState }) => {
    const { auth } = getState();
    if (auth.keycloak) {
      // Check if token is still valid
      const authenticated = auth.keycloak.authenticated;
      if (authenticated && auth.keycloak.token) {
        // Update token if needed (silently)
        try {
          const refreshed = await auth.keycloak.updateToken(30);
          if (refreshed) {
            return true;
          }
        } catch (error) {
          return false;
        }
      }
      return authenticated;
    }
    return false;
  }
);

// Get current user from backend
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { getState, rejectWithValue }) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await axios.get(`${backendUrl}/api/users/me`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to get user' });
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    keycloak: null,
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
    error: null,
  },
  reducers: {
    setAuthenticated: (state, action) => {
      state.keycloak = action.payload.keycloak;
      state.isAuthenticated = true;
      state.token = action.payload.keycloak?.token || state.keycloak?.token;
      state.isLoading = false;
      state.error = null;
    },
    setUnauthenticated: (state, action) => {
      state.keycloak = action.payload.keycloak;
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.isLoading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearAuthState: (state) => {
      // Clear all authentication state
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize Keycloak
      .addCase(initializeKeycloak.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeKeycloak.fulfilled, (state, action) => {
        state.keycloak = action.payload.keycloak;
        state.isAuthenticated = action.payload.authenticated;
        state.token = action.payload.keycloak?.token;
        state.isLoading = false;
      })
      .addCase(initializeKeycloak.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })
      // Check Auth
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isAuthenticated = action.payload;
        state.token = state.keycloak?.token;
      })
      // Get Current User
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        const errorData = action.payload;
        state.error = errorData?.message || 'Failed to get user';
      });
  },
});

export const { setAuthenticated, setUnauthenticated, clearError, clearAuthState } = authSlice.actions;
export default authSlice.reducer;

