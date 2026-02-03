const express = require('express');
const router = express.Router();
const { ProductService } = require('../services');
const { authenticate, requireTenantAccess, staffPermissions, asyncHandler, parsePagination, parseSort, parseFilter } = require('../middleware');

/**
 * @route GET /api/products
 * @desc Get all products with pagination and filters
 * @access Private (shop_admin, staff)
 */
router.get('/', authenticate, requireTenantAccess, asyncHandler(async (req, res) => {
  const { page, limit, sort, category, status, search, minPrice, maxPrice } = req.query;
  
  const result = await ProductService.getAll(req.tenantId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
    sort,
    category,
    status,
    search,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
  });
  
  res.json({
    success: true,
    data: result.products,
    pagination: result.pagination,
  });
}));

/**
 * @route GET /api/products/categories
 * @desc Get all product categories
 * @access Private (shop_admin, staff)
 */
router.get('/categories', authenticate, requireTenantAccess, asyncHandler(async (req, res) => {
  const categories = await ProductService.getCategories(req.tenantId);
  
  res.json({
    success: true,
    data: categories,
  });
}));

/**
 * @route GET /api/products/low-stock
 * @desc Get products with low stock
 * @access Private (shop_admin, staff)
 */
router.get('/low-stock', authenticate, requireTenantAccess, asyncHandler(async (req, res) => {
  const products = await ProductService.getLowStock(req.tenantId);
  
  res.json({
    success: true,
    data: products,
  });
}));

/**
 * @route GET /api/products/:productId
 * @desc Get product by ID
 * @access Private (shop_admin, staff)
 */
router.get('/:productId', authenticate, requireTenantAccess, asyncHandler(async (req, res) => {
  const product = await ProductService.getById(req.tenantId, req.params.productId);
  
  res.json({
    success: true,
    data: product,
  });
}));

/**
 * @route POST /api/products
 * @desc Create a new product
 * @access Private (shop_admin only)
 */
router.post('/', authenticate, requireTenantAccess, staffPermissions.canManageProducts, asyncHandler(async (req, res) => {
  const productData = req.body;
  
  // Ensure tenantId is set
  productData.tenantId = req.tenantId;
  
  const product = await ProductService.create(
    req.tenantId,
    req.user.userId,
    req.user.profile?.firstName || req.user.email,
    productData
  );
  
  res.status(201).json({
    success: true,
    data: product,
  });
}));

/**
 * @route PUT /api/products/:productId
 * @desc Update a product
 * @access Private (shop_admin only)
 */
router.put('/:productId', authenticate, requireTenantAccess, staffPermissions.canManageProducts, asyncHandler(async (req, res) => {
  const updateData = req.body;
  
  const product = await ProductService.update(
    req.tenantId,
    req.user.userId,
    req.user.profile?.firstName || req.user.email,
    req.params.productId,
    updateData
  );
  
  res.json({
    success: true,
    data: product,
  });
}));

/**
 * @route DELETE /api/products/:productId
 * @desc Delete (soft) a product
 * @access Private (shop_admin only)
 */
router.delete('/:productId', authenticate, requireTenantAccess, staffPermissions.canManageProducts, asyncHandler(async (req, res) => {
  const result = await ProductService.delete(
    req.tenantId,
    req.user.userId,
    req.user.profile?.firstName || req.user.email,
    req.params.productId
  );
  
  res.json({
    success: true,
    ...result,
  });
}));

/**
 * @route POST /api/products/:productId/stock
 * @desc Update product stock
 * @access Private (shop_admin only)
 */
router.post('/:productId/stock', authenticate, requireTenantAccess, staffPermissions.canManageProducts, asyncHandler(async (req, res) => {
  const { quantityChange, reason } = req.body;
  
  if (quantityChange === undefined || quantityChange === null) {
    return res.status(400).json({
      success: false,
      error: 'Quantity change is required',
      code: 'MISSING_QUANTITY',
    });
  }
  
  const result = await ProductService.updateStock(
    req.tenantId,
    req.user.userId,
    req.user.profile?.firstName || req.user.email,
    req.params.productId,
    parseInt(quantityChange, 10),
    reason
  );
  
  res.json({
    success: true,
    data: result,
  });
}));

module.exports = router;

