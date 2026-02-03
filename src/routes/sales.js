const express = require('express');
const router = express.Router();
const { SaleService } = require('../services');
const { authenticate, requireTenantAccess, staffPermissions, asyncHandler } = require('../middleware');

/**
 * @route GET /api/sales
 * @desc Get all sales with pagination and filters
 * @access Private (shop_admin, staff)
 */
router.get('/', authenticate, requireTenantAccess, asyncHandler(async (req, res) => {
  const { page, limit, sort, status, paymentStatus, staffId, startDate, endDate } = req.query;
  
  const result = await SaleService.getAll(req.tenantId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
    sort: sort || '-createdAt',
    status,
    paymentStatus,
    staffId,
    startDate,
    endDate,
  });
  
  res.json({
    success: true,
    data: result.sales,
    pagination: result.pagination,
  });
}));

/**
 * @route GET /api/sales/summary
 * @desc Get sales summary/analytics
 * @access Private (shop_admin, manager)
 */
router.get('/summary', authenticate, requireTenantAccess, staffPermissions.canViewReports, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: 'Start date and end date are required',
      code: 'MISSING_DATES',
    });
  }
  
  const summary = await SaleService.getSummary(req.tenantId, startDate, endDate);
  
  res.json({
    success: true,
    data: summary,
  });
}));

/**
 * @route GET /api/sales/:saleId
 * @desc Get sale by ID
 * @access Private (shop_admin, staff)
 */
router.get('/:saleId', authenticate, requireTenantAccess, asyncHandler(async (req, res) => {
  const sale = await SaleService.getById(req.tenantId, req.params.saleId);
  
  res.json({
    success: true,
    data: sale,
  });
}));

/**
 * @route POST /api/sales
 * @desc Create a new sale
 * @access Private (all authenticated users - staff can create sales)
 */
router.post('/', authenticate, requireTenantAccess, staffPermissions.canManageSales, asyncHandler(async (req, res) => {
  const saleData = req.body;
  
  // Ensure tenantId is set
  saleData.tenantId = req.tenantId;
  
  const sale = await SaleService.create(
    req.tenantId,
    req.user.userId,
    req.user.profile?.firstName || req.user.email,
    saleData
  );
  
  res.status(201).json({
    success: true,
    data: sale,
  });
}));

/**
 * @route POST /api/sales/:saleId/cancel
 * @desc Cancel a sale
 * @access Private (shop_admin only)
 */
router.post('/:saleId/cancel', authenticate, requireTenantAccess, staffPermissions.canManageSales, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const sale = await SaleService.cancel(
    req.tenantId,
    req.user.userId,
    req.user.profile?.firstName || req.user.email,
    req.params.saleId,
    reason
  );
  
  res.json({
    success: true,
    data: sale,
  });
}));

/**
 * @route POST /api/sales/:saleId/refund
 * @desc Refund a sale
 * @access Private (shop_admin, manager - those with refund permission)
 */
router.post('/:saleId/refund', authenticate, requireTenantAccess, staffPermissions.canRefund, asyncHandler(async (req, res) => {
  const { refundAmount, reason } = req.body;
  
  if (refundAmount === undefined || refundAmount === null) {
    return res.status(400).json({
      success: false,
      error: 'Refund amount is required',
      code: 'MISSING_AMOUNT',
    });
  }
  
  const sale = await SaleService.refund(
    req.tenantId,
    req.user.userId,
    req.user.profile?.firstName || req.user.email,
    req.params.saleId,
    parseFloat(refundAmount),
    reason
  );
  
  res.json({
    success: true,
    data: sale,
  });
}));

module.exports = router;

