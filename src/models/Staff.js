const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  staffId: {
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
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
  },
  role: {
    type: String,
    enum: ['shop_admin', 'staff', 'manager', 'cashier'],
    default: 'staff',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  permissions: {
    canManageProducts: {
      type: Boolean,
      default: false,
    },
    canManageSales: {
      type: Boolean,
      default: true,
    },
    canManageStaff: {
      type: Boolean,
      default: false,
    },
    canViewReports: {
      type: Boolean,
      default: false,
    },
    canApplyDiscount: {
      type: Boolean,
      default: false,
    },
    canRefund: {
      type: Boolean,
      default: false,
    },
  },
  // Track who created this staff account
  createdBy: {
    type: String,
    required: true,
  },
  // For audit trail
  createdByRole: {
    type: String,
    enum: ['super_admin', 'shop_admin'],
    required: true,
  },
  shift: {
    start: String,
    end: String,
  },
  hireDate: Date,
  lastActiveAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
staffSchema.index({ tenantId: 1, email: 1 }, { unique: true });
staffSchema.index({ tenantId: 1, role: 1 });
staffSchema.index({ tenantId: 1, status: 1 });

// Update timestamp on save
staffSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate unique staff ID
staffSchema.statics.generateStaffId = async function() {
  return `staff_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
};

const Staff = mongoose.model('Staff', staffSchema, 'staff');

module.exports = Staff;

