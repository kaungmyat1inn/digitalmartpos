const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userName: String,
  userRole: {
    type: String,
    enum: ['super_admin', 'shop_admin', 'staff'],
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'PASSWORD_CHANGE',
      'TOKEN_REFRESH',
      'TOKEN_REVOKED',
      
      // Tenant Management
      'TENANT_CREATE',
      'TENANT_UPDATE',
      'TENANT_SUSPEND',
      'TENANT_DELETE',
      
      // User Management
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'USER_SUSPEND',
      'USER_ACTIVATE',
      
      // Staff Management
      'STAFF_CREATE',
      'STAFF_UPDATE',
      'STAFF_DELETE',
      'STAFF_SUSPEND',
      
      // Product Management
      'PRODUCT_CREATE',
      'PRODUCT_UPDATE',
      'PRODUCT_DELETE',
      'PRODUCT_STOCK_UPDATE',
      
      // Sales
      'SALE_CREATE',
      'SALE_UPDATE',
      'SALE_CANCEL',
      'SALE_REFUND',
      
      // System
      'SETTINGS_UPDATE',
      'EXPORT_DATA',
      'IMPORT_DATA',
    ],
  },
  resource: {
    type: {
      type: String,
      enum: ['tenant', 'user', 'staff', 'product', 'sale', 'settings', 'system'],
    },
    id: String,
    name: String,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  previousState: {
    type: mongoose.Schema.Types.Mixed,
  },
  newState: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success',
  },
  errorMessage: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Indexes for common queries
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });

// Generate unique log ID
auditLogSchema.statics.generateLogId = async function() {
  return `log_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
};

// Static method to create audit log entry
auditLogSchema.statics.log = async function(data) {
  try {
    const log = new this({
      logId: await this.generateLogId(),
      ...data,
      createdAt: new Date(),
    });
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break main operations
  }
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema, 'audit_logs');

module.exports = AuditLog;

