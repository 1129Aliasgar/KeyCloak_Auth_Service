import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../redux/features/authSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import './Login.css';

/**
 * Login Screen
 * 
 * Why needed:
 * - Entry point for unauthenticated users
 * - Auto-redirects to Keycloak login page
 * - Shows loading state during redirect
 * 
 * How Keycloak Login Works:
 * 1. Component mounts and automatically redirects to Keycloak
 * 2. User enters credentials in Keycloak login page
 * 3. Keycloak validates and issues JWT token
 * 4. User redirected back to frontend with token
 * 5. Frontend stores token and updates auth state
 * 6. User sees dashboard
 */
const Login = () => {
  const dispatch = useDispatch();
  const { keycloak, isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Auto-redirect to Keycloak login page when component mounts
    if (keycloak && !keycloak.authenticated) {
      // Redirect directly to Keycloak login page
      keycloak.login({
        redirectUri: window.location.origin + '/dashboard',
      });
    } else if (!keycloak) {
      // If Keycloak not initialized yet, trigger login action
      dispatch(login());
    }
  }, [keycloak, dispatch]);

  // Show loading spinner while redirecting to Keycloak
  return <LoadingSpinner />;
};

export default Login;

