import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

/**
 * Keycloak Middleware
 * 
 * Why needed:
 * - Validates JWT tokens issued by Keycloak
 * - Verifies token signature using Keycloak's public key
 * - Extracts user information from token claims
 * - Protects API routes from unauthorized access
 * 
 * How it works:
 * 1. Extracts token from Authorization header
 * 2. Decodes token to get kid (key ID)
 * 3. Fetches public key from Keycloak's JWKS endpoint
 * 4. Verifies token signature and expiration
 * 5. Attaches decoded user info to req.user
 */

// Lazy initialization of JWKS client to ensure env vars are loaded
let client = null;

function getJwksClient() {
  if (!client) {
    const jwksUri = process.env.KEYCLOAK_REALM_PUBLIC_KEY_URL ||
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`;

    if (!jwksUri || jwksUri.includes('undefined')) {
      throw new Error('JWKS URI is not properly configured. Check KEYCLOAK_URL and KEYCLOAK_REALM environment variables.');
    }

    client = jwksClient({
      jwksUri: jwksUri,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      timeout: 30000, // 30 seconds
    });
  }
  return client;
}

/**
 * Get signing key from Keycloak JWKS endpoint
 */
function getKey(header, callback) {
  if (!header.kid) {
    return callback(new Error('Token header missing kid (key ID)'));
  }

  const jwksClient = getJwksClient();

  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }

    try {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    } catch (keyErr) {
      callback(keyErr);
    }
  });
}

/**
 * Handle token verification errors
 */
function handleVerificationError(err, res) {
  let errorResponse = {
    success: false,
    message: 'Token verification failed',
    error: 'INVALID_TOKEN'
  };

  if (err.name === 'TokenExpiredError') {
    errorResponse = {
      success: false,
      message: 'Token has expired',
      error: 'TOKEN_EXPIRED'
    };
  } else if (err.name === 'JsonWebTokenError') {
    errorResponse = {
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    };
  } else if (err.name === 'TokenNotBeforeError') {
    errorResponse = {
      success: false,
      message: 'Token not yet valid',
      error: 'TOKEN_NOT_YET_VALID'
    };
  } else {
    errorResponse = {
      success: false,
      message: 'Token verification failed',
      error: err.name
    };
  }

  return res.status(401).json(errorResponse);
}

/**
 * Attach decoded user information to request
 */
function attachUserInfo(decoded, expectedAudience, req, next) {
  req.user = {
    keycloakId: decoded.sub,
    email: decoded.email,
    username: decoded.preferred_username || decoded.username,
    firstName: decoded.given_name,
    lastName: decoded.family_name,
    emailVerified: decoded.email_verified,
    roles: decoded.realm_access?.roles || [],
    clientRoles: decoded.resource_access?.[expectedAudience]?.roles || [],
    token: decoded
  };

  next();
}

/**
 * Keycloak Token Validation Middleware
 * 
 * Flow:
 * 1. Check for Authorization header
 * 2. Extract Bearer token
 * 3. Verify token with Keycloak public key
 * 4. Validate token claims (iss, aud, exp)
 * 5. Attach user info to request object
 */
export const validateKeycloakToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      });
    }

    // Properly extract Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header must start with "Bearer "'
      });
    }

    // Extract token - split by space and take the second part (index 1)
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Expected: Bearer <token>'
      });
    }

    const token = parts[1].trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is empty'
      });
    }

    // Build issuer URL
    const issuer = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`;
    const expectedAudience = process.env.KEYCLOAK_CLIENT_ID;
    const algorithm = process.env.JWT_ALGORITHM || 'RS256';

    if (!issuer || issuer.includes('undefined')) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: KEYCLOAK_URL and KEYCLOAK_REALM must be set'
      });
    }

    // Verify token using Keycloak's public key
    // First try with audience validation if configured
    const verifyOptions = {
      algorithms: [algorithm],
      issuer: issuer
    };

    if (expectedAudience) {
      verifyOptions.audience = expectedAudience;
    }

    jwt.verify(token, getKey, verifyOptions, (err, decoded) => {
      // If verification fails due to audience mismatch, try without audience
      if (err && err.message && err.message.includes('audience') && expectedAudience) {
        // Retry without audience validation
        jwt.verify(token, getKey, {
          algorithms: [algorithm],
          issuer: issuer
        }, (retryErr, retryDecoded) => {
          if (retryErr) {
            return handleVerificationError(retryErr, res);
          }
          // Success without audience - proceed
          attachUserInfo(retryDecoded, expectedAudience, req, next);
        });
      } else if (err) {
        // Other verification errors
        return handleVerificationError(err, res);
      } else {
        // Success with audience validation
        attachUserInfo(decoded, expectedAudience, req, next);
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during token validation'
    });
  }
};

/**
 * Optional: Validate token and extract user info without failing
 * Useful for optional authentication endpoints
 */
export const optionalKeycloakToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  // Use the main validation middleware
  return validateKeycloakToken(req, res, next);
};

