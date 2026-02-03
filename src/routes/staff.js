const express = require('express');
const router = express.Router();
const { StaffService } = require('../services');
const { authenticate, requireTenantAccess, requireRole, asyncHandler } = require('../middleware');

/**
 * @route GET /api/staff
 * @desc Get all staff for the tenant
 * @access Private (shop_admin only)
 */
router.get('/', authenticate, requireTenantAccess, requireRole('shop_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { page, limit, sort, role, status } = req.query;
  
  const result = await StaffService.getAll(req.tenantId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
    sort: sort || '-createdAt',
    role,
    status,
  });
  
  res.json({
    success: true,
    data: result.staff,
    pagination: result.pagination,
  });
}));

/**
 * @route GET /api/staff/:staffId
 * @desc Get staff by ID
 * @access Private (shop_admin only)
 */
router.get('/:staffId', authenticate, requireTenantAccess, requireRole('shop_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const staff = await StaffService.getById(req.tenantId, req.params.staffId);
  
  res.json({
    success: true,
    data: staff,
  });
}));

/**
 * @route POST /api/staff
 * @desc Create a new staff account
 * @access Private (shop_admin, super_admin)
 * 
 * Note: When super_admin creates a shop_admin account, it's typically
 * done through the tenant creation process in auth routes.
 */
router.post('/', authenticate, requireTenantAccess, requireRole('shop_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const staffData = req.body;
  
  if (!staffData.name || !staffData.email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required',
      code: 'MISSING_FIELDS',
    });
  }
  
  // Super_admin can create staff across tenants
  const tenantId = req.user.role === 'super_admin' 
    ? (staffData.tenantId || req.body.tenantId) 
    : req.tenantId;
  
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant ID is required',
      code: 'MISSING_TENANT',
    });
  }
  
  const result = await StaffService.create(
    req.user.userId,
    req.user.role,
    tenantId,
    staffData
  );
  
  res.status(201).json({
    success: true,
    data: result,
  });
}));

/**
 * @route PUT /api/staff/:staffId
 * @desc Update staff details
 * @access Private (shop_admin, super_admin)
 */
router.put('/:staffId', authenticate, requireTenantAccess, requireRole('shop_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const updateData = req.body;
  
  const staff = await StaffService.update(
    req.tenantId,
    req.user.userId,
    req.user.role,
    req.params.staffId,
    updateData
  );
  
  res.json({
    success: true,
    data: staff,
  });
}));

/**
 * @route POST /api/staff/:staffId/suspend
 * @desc Suspend a staff account
 * @access Private (shop_admin, super_admin)
 */
router.post('/:staffId/suspend', authenticate, requireTenantAccess, requireRole('shop_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const result = await StaffService.suspend(
    req.tenantId,
    req.user.userId,
    req.user.role,
    req.params.staffId,
    reason
  );
  
  res.json({
    success: true,
    ...result,
  });
}));

/**
 * @route POST /api/staff/:staffId/activate
 * @desc Activate a suspended staff account
 * @access Private (shop_admin, super_admin)
 */
router.post('/:staffId/activate', authenticate, requireTenantAccess, requireRole('shop_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const result = await StaffService.activate(
    req.tenantId,
    req.user.userId,
    req.user.role,
    req.params.staffId
  );
  
  res.json({
    success: true,
    ...result,
  });
}));

/**
 * @route DELETE /api/staff/:staffId
 * @desc Delete (soft) a staff account
 * @access Private (shop_admin, super_admin)
 */
router.delete('/:staffId', authenticate, requireTenantAccess, requireRole('shop_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const result = await StaffService.delete(
    req.tenantId,
    req.user.userId,
    req.user.role,
    req.params.staffId
  );
  
  res.json({
    success: true,
    ...result,
  });
}));

module.exports = router;

