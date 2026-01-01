import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { initializeKeycloak } from './redux/features/authSlice';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import Profile from './screens/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

/**
 * App Component
 * 
 * Why needed:
 * - Main application entry point
 * - Initializes Keycloak authentication
 * - Sets up routing structure
 * - Manages global authentication state
 * 
 * How Frontend & Backend Communicate:
 * 1. User logs in via Keycloak (frontend -> Keycloak)
 * 2. Keycloak returns JWT token
 * 3. Frontend stores token in Redux state
 * 4. Frontend sends token in Authorization header to backend
 * 5. Backend validates token with Keycloak public key
 * 6. Backend returns user data or error
 * 
 * How Keycloak Fits:
 * - Keycloak handles authentication (login/logout)
 * - Issues JWT tokens with user claims
 * - Frontend uses token for API calls
 * - Backend validates token signature
 */
function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated, isLoading, keycloak } = useSelector((state) => state.auth);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Initialize Keycloak only once
    if (!initializedRef.current) {
      initializedRef.current = true;
      dispatch(initializeKeycloak());
    }
  }, [dispatch]);

  // Handle Keycloak callback and errors
  useEffect(() => {
    if (keycloak && location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      
      // Check for Keycloak errors in URL
      if (hashParams.has('error')) {
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        
        if (error === 'login_required') {
          // User needs to login - redirect to Keycloak login
          keycloak.login({
            redirectUri: window.location.origin + '/dashboard',
          });
        } else {
          // Clear hash to prevent redirect loop
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  }, [keycloak, location]);

  // Show loading spinner while Keycloak initializes
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Public route - auto-redirects to Keycloak login */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } 
      />
      
      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route 
        path="/" 
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        } 
      />
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

