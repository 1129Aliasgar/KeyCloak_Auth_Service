import './LoadingSpinner.css';

/**
 * Loading Spinner Component
 * 
 * Why needed:
 * - Shows loading state while Keycloak initializes
 * - Provides better UX during authentication checks
 * - Prevents flash of unauthenticated content
 */
const LoadingSpinner = () => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Initializing authentication...</p>
    </div>
  );
};

export default LoadingSpinner;

