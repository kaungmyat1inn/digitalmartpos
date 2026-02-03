const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending', 'cancelled'],
    default: 'pending',
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'professional', 'enterprise'],
    default: 'free',
  },
  dbName: {
    type: String,
    required: true,
  },
  subscription: {
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: true,
    },
  },
  settings: {
    currency: {
      type: String,
      default: 'MMK',
    },
    timezone: {
      type: String,
      default: 'Asia/Yangon',
    },
    taxRate: {
      type: Number,
      default: 0,
    },
  },
  contact: {
    email: String,
    phone: String,
    address: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
tenantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate unique tenant ID
tenantSchema.statics.generateTenantId = async function(name) {
  const prefix = name.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `tenant_${prefix}_${timestamp}`;
};

const Tenant = mongoose.model('Tenant', tenantSchema, 'tenants');

module.exports = Tenant;

