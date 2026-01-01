import User from '../models/user.js';
import mongoose from 'mongoose';

/**
 * User Service
 * 
 * Why needed:
 * - Handles all database operations (separation of concerns)
 * - Provides reusable business logic
 * - Centralizes data access patterns
 * - Makes testing easier (can mock service layer)
 * 
 * How it works:
 * - Contains methods for CRUD operations
 * - Handles MongoDB connection and queries
 * - Returns data or throws errors for controller to handle
 */

/**
 * Create or update user from Keycloak token
 * Syncs user data from Keycloak to local database
 */
export const syncUserFromKeycloak = async (userData) => {
  try {
    const user = await User.findOneAndUpdate(
      { keycloakId: userData.keycloakId },
      {
        $set: {
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          enabled: userData.enabled !== false,
          emailVerified: userData.emailVerified || false,
          lastLogin: new Date()
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    return user;
  } catch (error) {
    throw new Error(`Failed to sync user: ${error.message}`);
  }
};

/**
 * Get user by Keycloak ID
 */
export const getUserByKeycloakId = async (keycloakId) => {
  try {
    const user = await User.findOne({ keycloakId });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
};

/**
 * Get user by MongoDB ID
 */
export const getUserById = async (userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID format');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    return user;
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
};

/**
 * Get all users with pagination
 */
export const getAllUsers = async (page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments()
    ]);
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (keycloakId, updateData) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'profilePicture', 'preferences'];
    const updateFields = {};
    
    // Only allow specific fields to be updated
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields[key] = updateData[key];
      }
    });
    
    const user = await User.findOneAndUpdate(
      { keycloakId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
};

/**
 * Delete user (soft delete by setting enabled to false)
 */
export const deleteUser = async (keycloakId) => {
  try {
    const user = await User.findOneAndUpdate(
      { keycloakId },
      { $set: { enabled: false } },
      { new: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

/**
 * Check MongoDB connection
 */
export const checkDatabaseConnection = async () => {
  try {
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    return state === 1;
  } catch (error) {
    return false;
  }
};

