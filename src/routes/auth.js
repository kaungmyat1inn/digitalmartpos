const express = require('express');
const router = express.Router();
const { AuthService } = require('../services');
const { authenticate, authRateLimiter, asyncHandler } = require('../middleware');

/**
 * @route POST /api/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
      code: 'MISSING_CREDENTIALS',
    });
  }
  
  const result = await AuthService.login({ email, password });
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route POST /api/auth/logout
 * @desc Logout and invalidate tokens
 * @access Private
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await AuthService.logout(req.user.userId, refreshToken);
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}));

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token is required',
      code: 'REFRESH_TOKEN_REQUIRED',
    });
  }
  
  const tokens = await AuthService.refreshToken(refreshToken);
  
  res.json({
    success: true,
    data: tokens,
  });
}));

/**
 * @route POST /api/auth/setup
 * @desc Setup initial super admin (first time only)
 * @access Public (but disabled after setup)
 */
router.post('/setup', asyncHandler(async (req, res) => {
  // Check if super admin already exists
  const User = require('../models/User');
  const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
  
  if (existingSuperAdmin) {
    return res.status(409).json({
      success: false,
      error: 'System has already been set up',
      code: 'ALREADY_SETUP',
    });
  }
  
  const { email, password, firstName, lastName } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
      code: 'MISSING_FIELDS',
    });
  }
  
  const result = await AuthService.createSuperAdmin({ email, password, firstName, lastName });
  
  res.status(201).json({
    success: true,
    data: result,
    message: 'Super admin created successfully. Please login.',
  });
}));

/**
 * @route POST /api/auth/tenants
 * @desc Create a new tenant with shop admin (super_admin only)
 * @access Private (super_admin)
 */
router.post('/tenants', authenticate, asyncHandler(async (req, res) => {
  const { tenantName, shopAdminEmail, shopAdminPassword, shopAdminName, plan } = req.body;
  
  if (!tenantName || !shopAdminEmail || !shopAdminPassword) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      code: 'MISSING_FIELDS',
    });
  }
  
  const result = await AuthService.createTenantAndShopAdmin(req.user.userId, {
    tenantName,
    shopAdminEmail,
    shopAdminPassword,
    shopAdminName: shopAdminName || shopAdminEmail.split('@')[0],
    plan,
  });
  
  res.status(201).json({
    success: true,
    data: result,
  });
}));

module.exports = router;

