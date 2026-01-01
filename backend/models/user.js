import mongoose from 'mongoose';

/**
 * User Model
 * 
 * Why needed:
 * - Stores user profile information synced from Keycloak
 * - Allows extending user data beyond what Keycloak provides
 * - Enables custom user attributes and relationships
 * - Provides a local cache of user data for faster queries
 */
const userSchema = new mongoose.Schema({
  keycloakId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  // Custom fields beyond Keycloak
  profilePicture: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  lastLogin: {
    type: Date
  },
  preferences: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'users'
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Method to transform user data for API responses
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  userObject.id = userObject._id;
  delete userObject._id;
  delete userObject.__v;
  return userObject;
};

const User = mongoose.model('User', userSchema);

export default User;

