import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../redux/features/authSlice';
import axios from 'axios';
import './Profile.css';

/**
 * Profile Screen
 * 
 * Why needed:
 * - Shows detailed user profile
 * - Allows users to update their profile
 * - Demonstrates PUT API calls with token
 */
const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, keycloak } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await axios.put(`${backendUrl}/api/users/me`, formData);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      dispatch(getCurrentUser()); // Refresh user data
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  if (!user) {
    return <div className="profile-container">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <nav className="profile-nav">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back to Dashboard
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </nav>

      <div className="profile-content">
        <div className="profile-card">
          <h1>User Profile</h1>

          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="disabled-input"
              />
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={user.username}
                disabled
                className="disabled-input"
              />
            </div>

            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+1234567890"
              />
            </div>

            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

