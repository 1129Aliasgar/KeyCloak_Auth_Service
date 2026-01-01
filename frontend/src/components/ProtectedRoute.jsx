import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Protected Route Component
 * 
 * Why needed:
 * - Prevents unauthorized access to protected pages
 * - Redirects to login if user is not authenticated
 * - Wraps components that require authentication
 * 
 * How it works:
 * - Checks Redux auth state
 * - Redirects to login if not authenticated
 * - Renders children if authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

