import * as userService from '../service/userService.js';

/**
 * User Controller
 * 
 * Why needed:
 * - Handles HTTP requests and responses
 * - Coordinates between routes, services, and validators
 * - Formats API responses consistently
 * - Manages error handling at the HTTP layer
 * 
 * How it works:
 * - Receives requests from routes
 * - Calls service layer for business logic
 * - Returns formatted JSON responses
 * - Handles errors and sends appropriate status codes
 */

/**
 * Get current user profile
 * GET /api/users/me
 * 
 * Flow:
 * 1. User info extracted from token by keycloak middleware
 * 2. Sync user data from Keycloak to local DB
 * 3. Return user profile
 */
export const getCurrentUser = async (req, res) => {
  try {
    // Sync user from Keycloak token to local database
    const user = await userService.syncUserFromKeycloak({
      keycloakId: req.user.keycloakId,
      email: req.user.email,
      username: req.user.username,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      emailVerified: req.user.emailVerified,
      enabled: true
    });

    // Convert user to plain object if it's a Mongoose document
    const userObject = user.toObject ? user.toObject() : user;

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        ...userObject,
        // Include decoded token info for frontend
        tokenInfo: {
          keycloakId: req.user.keycloakId,
          email: req.user.email,
          username: req.user.username,
          roles: req.user.roles,
          clientRoles: req.user.clientRoles
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      error: error.message
    });
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    const statusCode = error.message === 'User not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Get all users (with pagination)
 * GET /api/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await userService.getAllUsers(page, limit);
    
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

/**
 * Update user profile
 * PUT /api/users/me
 */
export const updateCurrentUser = async (req, res) => {
  try {
    const updatedUser = await userService.updateUserProfile(
      req.user.keycloakId,
      req.body
    );
    
    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    const statusCode = error.message === 'User not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Delete user (soft delete)
 * DELETE /api/users/me
 */
export const deleteCurrentUser = async (req, res) => {
  try {
    await userService.deleteUser(req.user.keycloakId);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'User not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Logout endpoint
 * POST /api/users/logout
 * 
 * Note: JWT tokens are stateless, so we can't invalidate them server-side.
 * This endpoint acknowledges the logout and logs the event.
 * The actual token clearing happens on the frontend and Keycloak side.
 */
export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful. Token should be cleared on frontend.',
      data: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

/**
 * Health check for user service
 * GET /api/users/health
 */
export const healthCheck = async (req, res) => {
  try {
    const dbConnected = await userService.checkDatabaseConnection();
    
    res.status(200).json({
      success: true,
      message: 'User service health check',
      data: {
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};

