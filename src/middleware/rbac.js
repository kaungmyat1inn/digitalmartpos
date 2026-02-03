const Tenant = require('../models/Tenant');

/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Defines permission hierarchies and role-specific access rules.
 * 
 * Role Hierarchy:
 * - super_admin: Full system access across all tenants
 * - shop_admin: Full access within their tenant
 * - staff: Limited access based on permissions
 */

// Define allowed roles for each endpoint type
const ROLE_HIERARCHY = {
  super_admin: ['super_admin'],
  shop_admin: ['super_admin', 'shop_admin'],
  staff: ['super_admin', 'shop_admin', 'staff'],
};

/**
 * Require specific roles to access the endpoint
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }
    
    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: userRole,
      });
    }
    
    next();
  };
};

/**
 * Require super_admin role only
 */
const requireSuperAdmin = requireRole('super_admin');

/**
 * Require shop_admin or super_admin
 */
const requireShopAdminOrHigher = requireRole('super_admin', 'shop_admin');

/**
 * Check if user can access a specific tenant
 * - super_admin can access all tenants
 * - shop_admin and staff can only access their own tenant
 */
const requireTenantAccess = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }
    
    // Super admins can access any tenant
    if (user.role === 'super_admin') {
      // If no specific tenant requested, allow
      if (!req.params.tenantId && !req.body.tenantId) {
        return next();
      }
      
      const requestedTenant = req.params.tenantId || req.body.tenantId;
      
      // Super admins can access any tenant
      return next();
    }
    
    // For shop_admin and staff, enforce tenant isolation
    const requestedTenant = req.params.tenantId || req.body.tenantId || req.tenantId;
    
    if (requestedTenant && requestedTenant !== user.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this tenant',
        code: 'TENANT_FORBIDDEN',
      });
    }
    
    // Ensure the user's tenant is active
    const tenant = await Tenant.findOne({ tenantId: user.tenantId });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND',
      });
    }
    
    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Tenant account is not active',
        code: 'TENANT_INACTIVE',
      });
    }
    
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant access check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Access check failed',
      code: 'ACCESS_CHECK_ERROR',
    });
  }
};

/**
 * Shop admin can only manage resources within their tenant
 */
const shopAdminTenantScope = async (req, res, next) => {
  if (req.user.role === 'super_admin') {
    return next();
  }
  
  // Force tenantId to be the user's tenantId
  if (req.user.role === 'shop_admin' || req.user.role === 'staff') {
    req.body.tenantId = req.user.tenantId;
    req.params.tenantId = req.user.tenantId;
    req.query.tenantId = req.user.tenantId;
  }
  
  next();
};

/**
 * Staff permission checks
 */
const staffPermissions = {
  canManageProducts: (req, res, next) => {
    if (!req.user || req.user.role === 'staff') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Cannot manage products',
        code: 'NO_PRODUCT_PERMISSION',
      });
    }
    next();
  },
  
  canManageSales: (req, res, next) => {
    // All authenticated users can create sales
    if (req.method === 'POST' && req.path.includes('/sales')) {
      return next();
    }
    
    if (!req.user || req.user.role === 'staff') {
      // Staff can only read sales, not update/delete
      if (req.method === 'GET') {
        return next();
      }
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Cannot modify sales',
        code: 'NO_SALES_PERMISSION',
      });
    }
    next();
  },
  
  canManageStaff: (req, res, next) => {
    if (!req.user || req.user.role === 'staff') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Cannot manage staff',
        code: 'NO_STAFF_PERMISSION',
      });
    }
    next();
  },
  
  canViewReports: (req, res, next) => {
    if (!req.user || (req.user.role === 'staff' && !req.user.permissions?.canViewReports)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Cannot view reports',
        code: 'NO_REPORT_PERMISSION',
      });
    }
    next();
  },
  
  canApplyDiscount: (req, res, next) => {
    if (!req.user || (req.user.role === 'staff' && !req.user.permissions?.canApplyDiscount)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Cannot apply discounts',
        code: 'NO_DISCOUNT_PERMISSION',
      });
    }
    next();
  },
  
  canRefund: (req, res, next) => {
    if (!req.user || (req.user.role === 'staff' && !req.user.permissions?.canRefund)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Cannot process refunds',
        code: 'NO_REFUND_PERMISSION',
      });
    }
    next();
  },
};

module.exports = {
  requireRole,
  requireSuperAdmin,
  requireShopAdminOrHigher,
  requireTenantAccess,
  shopAdminTenantScope,
  staffPermissions,
  ROLE_HIERARCHY,
};

