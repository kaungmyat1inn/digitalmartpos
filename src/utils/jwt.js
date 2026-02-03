const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate access token for a user
 */
function generateAccessToken(user) {
  const payload = {
    userId: user.userId,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
  };
  
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
    issuer: 'digital-mart-pos',
  });
}

/**
 * Generate refresh token for a user
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.userId,
    type: 'refresh',
  };
  
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
    issuer: 'digital-mart-pos',
  });
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

/**
 * Decode token without verification (for debugging)
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Generate token pair (access + refresh)
 */
function generateTokenPair(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
    tokenType: 'Bearer',
    expiresIn: config.jwt.accessExpiry,
  };
}

/**
 * Get token expiry timestamp
 */
function getTokenExpiry(token) {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.exp) return null;
  return new Date(decoded.exp * 1000);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  generateTokenPair,
  getTokenExpiry,
};

