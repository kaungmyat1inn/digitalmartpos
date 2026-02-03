const User = require('../models/User');
const Tenant = require('../models/Tenant');
const AuditLog = require('../models/AuditLog');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Auth Service - Handles authentication and user management
 */
class AuthService {
  /**
   * Login user with email and password
   */
  static async login({ email, password, tenantId }) {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      await AuditLog.log({
        userId: 'unknown',
        tenantId: tenantId || 'global',
        userName: email,
        userRole: 'unknown',
        action: 'LOGIN_FAILED',
        details: { email, reason: 'User not found' },
        ipAddress: null,
        status: 'failure',
        errorMessage: 'User not found',
      });
      
      throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      throw new ApiError(403, 'Account is not active', 'ACCOUNT_INACTIVE');
    }
    
    // Verify password
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      await AuditLog.log({
        userId: user.userId,
        tenantId: user.tenantId,
        userName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
        userRole: user.role,
        action: 'LOGIN_FAILED',
        details: { email, reason: 'Invalid password' },
        status: 'failure',
        errorMessage: 'Invalid password',
      });
      
      throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }
    
    // Check tenant status
    if (user.role !== 'super_admin') {
      const tenant = await Tenant.findOne({ tenantId: user.tenantId });
      if (!tenant || tenant.status !== 'active') {
        throw new ApiError(403, 'Tenant account is not active', 'TENANT_INACTIVE');
      }
    }
    
    // Generate tokens
    const tokens = generateTokenPair(user);
    
    // Save refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
    
    user.refreshTokens.push({
      token: tokens.refreshToken,
      createdAt: new Date(),
      expiresAt: refreshTokenExpiry,
    });
    
    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    // Log successful login
    await AuditLog.log({
      userId: user.userId,
      tenantId: user.tenantId,
      userName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
      userRole: user.role,
      action: 'LOGIN',
      status: 'success',
    });
    
    return {
      user: {
        userId: user.userId,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      ...tokens,
    };
  }
  
  /**
   * Logout user
   */
  static async logout(userId, refreshToken) {
    const user = await User.findOne({ userId });
    
    if (user && refreshToken) {
      // Remove the specific refresh token
      user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
      await user.save();
      
      await AuditLog.log({
        userId: user.userId,
        tenantId: user.tenantId,
        userName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
        userRole: user.role,
        action: 'LOGOUT',
        status: 'success',
      });
    }
    
    return { success: true };
  }
  
  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token required', 'REFRESH_TOKEN_REQUIRED');
    }
    
    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      const user = await User.findOne({ userId: decoded.userId });
      
      if (!user) {
        throw new ApiError(401, 'User not found', 'USER_NOT_FOUND');
      }
      
      // Check if refresh token exists in user's tokens
      const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
      
      if (!tokenExists) {
        await AuditLog.log({
          userId: user.userId,
          tenantId: user.tenantId,
          userName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
          userRole: user.role,
          action: 'TOKEN_REVOKED',
          details: { reason: 'Token not found in user session' },
          status: 'failure',
        });
        
        throw new ApiError(401, 'Invalid refresh token', 'TOKEN_INVALID');
      }
      
      // Check if token is expired
      const tokenData = user.refreshTokens.find(t => t.token === refreshToken);
      if (tokenData && tokenData.expiresAt < new Date()) {
        throw new ApiError(401, 'Refresh token expired', 'TOKEN_EXPIRED');
      }
      
      // Generate new token pair
      const tokens = generateTokenPair(user);
      
      // Remove old refresh token and add new one
      user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
      
      const newRefreshExpiry = new Date();
      newRefreshExpiry.setDate(newRefreshExpiry.getDate() + 7);
      
      user.refreshTokens.push({
        token: tokens.refreshToken,
        createdAt: new Date(),
        expiresAt: newRefreshExpiry,
      });
      
      await user.save();
      
      await AuditLog.log({
        userId: user.userId,
        tenantId: user.tenantId,
        userName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
        userRole: user.role,
        action: 'TOKEN_REFRESH',
        status: 'success',
      });
      
      return tokens;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      
      if (error.name === 'JsonWebTokenError') {
        throw new ApiError(401, 'Invalid refresh token', 'TOKEN_INVALID');
      }
      
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Refresh token expired', 'TOKEN_EXPIRED');
      }
      
      throw error;
    }
  }
  
  /**
   * Create super admin account (initial setup)
   */
  static async createSuperAdmin({ email, password, firstName, lastName }) {
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      throw new ApiError(409, 'Super admin already exists', 'SUPER_ADMIN_EXISTS');
    }
    
    const userId = await User.generateUserId();
    
    const user = new User({
      userId,
      tenantId: 'global',
      email: email.toLowerCase(),
      passwordHash: password,
      role: 'super_admin',
      status: 'active',
      profile: {
        firstName,
        lastName,
      },
      createdBy: 'system',
    });
    
    await user.save();
    
    await AuditLog.log({
      userId: user.userId,
      tenantId: 'global',
      userName: `${firstName || ''} ${lastName || ''}`.trim(),
      userRole: 'super_admin',
      action: 'USER_CREATE',
      details: { role: 'super_admin', email },
      status: 'success',
    });
    
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
  }
  
  /**
   * Create tenant and shop admin (by super admin)
   */
  static async createTenantAndShopAdmin(creatorId, { tenantName, shopAdminEmail, shopAdminPassword, shopAdminName, plan = 'free' }) {
    const creator = await User.findOne({ userId: creatorId });
    
    if (!creator || creator.role !== 'super_admin') {
      throw new ApiError(403, 'Only super admin can create tenants', 'FORBIDDEN');
    }
    
    // Generate tenant ID
    const tenantId = await Tenant.generateTenantId(tenantName);
    const dbName = `tenant_${tenantId}`;
    
    // Create tenant
    const tenant = new Tenant({
      tenantId,
      name: tenantName,
      status: 'active',
      plan,
      dbName,
    });
    
    await tenant.save();
    
    // Generate user and staff IDs
    const userId = await User.generateUserId();
    
    // Create shop admin user
    const shopAdmin = new User({
      userId,
      tenantId,
      email: shopAdminEmail.toLowerCase(),
      passwordHash: shopAdminPassword,
      role: 'shop_admin',
      status: 'active',
      profile: {
        firstName: shopAdminName,
      },
      createdBy: creatorId,
    });
    
    await shopAdmin.save();
    
    // Log tenant creation
    await AuditLog.log({
      userId: creatorId,
      tenantId: 'global',
      userName: `${creator.profile?.firstName || ''} ${creator.profile?.lastName || ''}`.trim(),
      userRole: 'super_admin',
      action: 'TENANT_CREATE',
      resource: { type: 'tenant', id: tenantId, name: tenantName },
      details: { plan, shopAdminEmail },
      status: 'success',
    });
    
    // Log shop admin creation
    await AuditLog.log({
      userId,
      tenantId,
      userName: shopAdminName,
      userRole: 'shop_admin',
      action: 'USER_CREATE',
      resource: { type: 'user', id: userId },
      details: { email: shopAdminEmail, createdBy: 'super_admin' },
      status: 'success',
    });
    
    return {
      tenant: {
        tenantId: tenant.tenantId,
        name: tenant.name,
        status: tenant.status,
        plan: tenant.plan,
      },
      shopAdmin: {
        userId: shopAdmin.userId,
        email: shopAdmin.email,
        role: shopAdmin.role,
      },
    };
  }
}

module.exports = AuthService;

