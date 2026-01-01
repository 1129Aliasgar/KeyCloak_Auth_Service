import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../redux/features/authSlice';
import './Dashboard.css';

/**
 * Dashboard Screen
 * 
 * Why needed:
 * - Main page after login
 * - Displays user information
 * - Shows protected content
 * - Demonstrates authenticated API calls
 */
const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, keycloak, error, isAuthenticated } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [userError, setUserError] = useState(null);

  useEffect(() => {
    // Only fetch user if authenticated and keycloak is available
    if (isAuthenticated && keycloak && keycloak.token) {
      setLoading(true);
      setUserError(null);
      
      dispatch(getCurrentUser())
        .then((result) => {
          if (getCurrentUser.rejected.match(result)) {
            setUserError(result.payload?.message || 'Failed to load user data');
          }
          setLoading(false);
        })
        .catch((err) => {
          setUserError('Failed to load user data');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [dispatch, isAuthenticated, keycloak]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleViewProfile = () => {
    navigate('/profile');
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>User Service Dashboard</h2>
        <div className="nav-actions">
          <button onClick={handleViewProfile} className="nav-button">
            Profile
          </button>
          <button onClick={handleLogout} className="nav-button logout">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h1>Welcome to Dashboard</h1>
          <p>You are successfully authenticated with Keycloak!</p>
        </div>

        {loading && (
          <div className="user-info-card">
            <p>Loading user data...</p>
          </div>
        )}

        {userError && (
          <div className="user-info-card" style={{ background: '#fee', color: '#c33' }}>
            <h3>Error Loading User Data</h3>
            <p>{userError}</p>
            <button 
              onClick={() => dispatch(getCurrentUser())} 
              className="nav-button"
              style={{ marginTop: '10px' }}
            >
              Retry
            </button>
          </div>
        )}

        {user && !loading && (
          <div className="user-info-card">
            <h3>User Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Email:</label>
                <span>{user.email}</span>
              </div>
              <div className="info-item">
                <label>Username:</label>
                <span>{user.username}</span>
              </div>
              {user.firstName && (
                <div className="info-item">
                  <label>First Name:</label>
                  <span>{user.firstName}</span>
                </div>
              )}
              {user.lastName && (
                <div className="info-item">
                  <label>Last Name:</label>
                  <span>{user.lastName}</span>
                </div>
              )}
              <div className="info-item">
                <label>Email Verified:</label>
                <span>{user.emailVerified ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="info-section">
          <h3>How This Works</h3>
          <ul>
            <li>✅ You logged in via Keycloak</li>
            <li>✅ Your JWT token is stored in Redux</li>
            <li>✅ Backend validates your token on each API call</li>
            <li>✅ User data is synced from Keycloak to MongoDB</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

