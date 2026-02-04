const config = require('../config');
const AuditLog = require('../models/AuditLog');
const eventBus = require('../utils/eventBus');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error codes mapping
 */
const ERROR_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    code: err.code,
    stack: config.env === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    body: config.env === 'development' ? req.body : undefined,
  });
  const tenantId = req.tenantId || req.user?.tenantId || 'global';
  const userId = req.user?.userId || 'unknown';
  const payload = {
    level: 'error',
    message: err.message,
    code: err.code,
    stack: config.env === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    tenantId,
    userId,
    statusCode: err.statusCode || 500,
    timestamp: new Date().toISOString(),
  };
  eventBus.emit('log', payload);
  AuditLog.log({
    userId,
    tenantId,
    userName: req.user?.email || null,
    userRole: req.user?.role || 'unknown',
    action: 'SYSTEM_ERROR',
    resource: { type: 'system' },
    details: { path: req.path, method: req.method, statusCode: payload.statusCode },
    status: 'failure',
    errorMessage: err.message,
    metadata: { code: err.code },
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: `Duplicate value for field: ${field}`,
      code: 'DUPLICATE_ENTRY',
      details: { field },
    });
  }

  // Handle Mongoose cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`,
      code: 'INVALID_ID',
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'TOKEN_INVALID',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token has expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Handle rate limit errors
  if (err.name === 'RateLimitExceeded') {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = config.env === 'production' 
    ? 'An unexpected error occurred' 
    : err.message;

  return res.status(statusCode).json({
    success: false,
    error: message,
    code: ERROR_CODES[statusCode] || 'INTERNAL_ERROR',
    ...(config.env === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Resource not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
