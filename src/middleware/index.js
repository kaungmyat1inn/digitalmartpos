const { authenticate, optionalAuth } = require('./auth');
const { 
  requireRole, 
  requireSuperAdmin, 
  requireShopAdminOrHigher,
  requireTenantAccess,
  shopAdminTenantScope,
  staffPermissions,
} = require('./rbac');
const { 
  ApiError, 
  errorHandler, 
  notFoundHandler, 
  asyncHandler 
} = require('./errorHandler');
const { rateLimiter, authRateLimiter, userRateLimiter } = require('./rateLimiter');

module.exports = {
  // Authentication
  authenticate,
  optionalAuth,
  
  // RBAC
  requireRole,
  requireSuperAdmin,
  requireShopAdminOrHigher,
  requireTenantAccess,
  shopAdminTenantScope,
  staffPermissions,
  
  // Error Handling
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Rate Limiting
  rateLimiter,
  authRateLimiter,
  userRateLimiter,
};

