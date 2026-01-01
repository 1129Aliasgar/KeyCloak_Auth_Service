import express from 'express';
import * as userController from '../controller/userController.js';
import { validateKeycloakToken } from '../middleware/keycloak.js';
import { validateUpdateUser } from '../validator/userValidator.js';

/**
 * User Routes
 * 
 * Why needed:
 * - Defines API endpoints for user operations
 * - Applies middleware (authentication, validation)
 * - Routes requests to appropriate controllers
 * 
 * How it works:
 * - Express router handles HTTP methods (GET, POST, PUT, DELETE)
 * - Middleware chain: validateKeycloakToken -> validator -> controller
 * - All routes protected by Keycloak token validation
 */

const router = express.Router();

/**
 * Public route - Health check
 * GET /api/users/health
 */
router.get('/health', userController.healthCheck);

/**
 * Protected routes - require Keycloak token
 * All routes below use validateKeycloakToken middleware
 */

// Get current authenticated user profile
router.get('/me', validateKeycloakToken, userController.getCurrentUser);

// Update current user profile
router.put('/me', validateKeycloakToken, validateUpdateUser, userController.updateCurrentUser);

// Delete current user (soft delete)
router.delete('/me', validateKeycloakToken, userController.deleteCurrentUser);

// Logout endpoint (optional - JWT tokens are stateless, but useful for logging)
router.post('/logout', validateKeycloakToken, userController.logout);

// Get user by ID
router.get('/:id', validateKeycloakToken, userController.getUserById);

// Get all users (with pagination)
router.get('/', validateKeycloakToken, userController.getAllUsers);

export default router;

