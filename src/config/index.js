require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  // JWT Configuration
  jwt: {
    accessSecret: process.env.JWT_SECRET || 'default-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // MongoDB Configuration
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/digital_mart',
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // API URL
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  // Admin Account Configuration (for deployment initialization)
  admin: {
    // Super Admin Account
    superAdmin: {
      email: process.env.SUPER_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'admin123456',
      firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
      lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
    },
    // Default Tenant & Shop Admin (created after super admin)
    tenant: {
      name: process.env.DEFAULT_TENANT_NAME || 'Digital Mart',
      shopAdminEmail: process.env.DEFAULT_SHOP_ADMIN_EMAIL || 'shopadmin@example.com',
      shopAdminPassword: process.env.DEFAULT_SHOP_ADMIN_PASSWORD || 'shopadmin123',
      shopAdminName: process.env.DEFAULT_SHOP_ADMIN_NAME || 'Shop',
      plan: process.env.DEFAULT_TENANT_PLAN || 'professional',
    },
    // Flag to skip auto-creation if false
    autoCreate: process.env.ADMIN_AUTO_CREATE !== 'false',
  },
};

