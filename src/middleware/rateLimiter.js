const config = require('../config');

/**
 * Simple in-memory rate limiter (fallback when Redis is not available)
 */
const createMemoryRateLimiter = () => {
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;
  
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean old entries
    for (const [k, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(t => now - t < windowMs);
      if (validTimestamps.length === 0) {
        requests.delete(k);
      } else {
        requests.set(k, validTimestamps);
      }
    }
    
    // Get current request timestamps
    const timestamps = requests.get(key) || [];
    timestamps.push(now);
    requests.set(key, timestamps);
    
    // Check if over limit
    if (timestamps.length > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }
    
    next();
  };
};

/**
 * Create rate limiter based on environment
 */
const rateLimiter = createMemoryRateLimiter();

/**
 * Strict rate limiter for auth endpoints (login, register)
 */
const authRateLimiter = (() => {
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean old entries
    for (const [k, data] of attempts.entries()) {
      if (now - data.windowStart > windowMs) {
        attempts.delete(k);
      }
    }
    
    const attemptData = attempts.get(key) || { count: 0, windowStart: now };
    attemptData.count++;
    attempts.set(key, attemptData);
    
    if (attemptData.count > maxAttempts) {
      const retryAfter = Math.ceil((attemptData.windowStart + windowMs - now) / 1000);
      
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter,
      });
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxAttempts);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxAttempts - attemptData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((attemptData.windowStart + windowMs) / 1000));
    
    next();
  };
})();

/**
 * Per-user rate limiter (more strict)
 */
const userRateLimiter = (() => {
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60;
  
  const requests = new Map();
  
  return (req, res, next) => {
    if (!req.user) return next();
    
    const key = req.user.userId;
    const now = Date.now();
    
    // Clean old entries
    for (const [k, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(t => now - t < windowMs);
      if (validTimestamps.length === 0) {
        requests.delete(k);
      } else {
        requests.set(k, validTimestamps);
      }
    }
    
    const timestamps = requests.get(key) || [];
    timestamps.push(now);
    requests.set(key, timestamps);
    
    if (timestamps.length > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'USER_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }
    
    next();
  };
})();

module.exports = {
  rateLimiter,
  authRateLimiter,
  userRateLimiter,
};

