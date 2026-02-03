const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

/**
 * Verify JWT access token from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      
      // Fetch user from database
      const user = await User.findOne({ userId: decoded.userId });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }
      
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Account is not active',
          code: 'ACCOUNT_INACTIVE',
        });
      }
      
      // Attach user and tenant info to request
      req.user = {
        userId: user.userId,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        status: user.status,
      };
      
      req.tenantId = user.tenantId;
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Access token expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid access token',
          code: 'TOKEN_INVALID',
        });
      }
      
      throw jwtError;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      const user = await User.findOne({ userId: decoded.userId });
      
      if (user && user.status === 'active') {
        req.user = {
          userId: user.userId,
          tenantId: user.tenantId,
          email: user.email,
          role: user.role,
          status: user.status,
        };
        req.tenantId = user.tenantId;
      }
    } catch (e) {
      // Ignore token errors for optional auth
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};

