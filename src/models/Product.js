const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
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
  sku: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  costPrice: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'MMK',
  },
  category: {
    type: String,
    default: 'Uncategorized',
  },
  brand: {
    type: String,
  },
  // Variant attributes
  color: {
    type: String,
  },
  capacity: {
    type: String,
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'g', 'lb', 'oz'],
      default: 'kg',
    },
  },
  // Inventory
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
  },
  trackInventory: {
    type: Boolean,
    default: true,
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Images
  images: [{
    url: String,
    isPrimary: Boolean,
  }],
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active',
  },
  createdBy: {
    type: String,
  },
  updatedBy: {
    type: String,
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

// Indexes
productSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
productSchema.index({ tenantId: 1, name: 'text', description: 'text' });
productSchema.index({ tenantId: 1, category: 1 });
productSchema.index({ tenantId: 1, status: 1 });

// Update timestamp on save
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for checking low stock
productSchema.virtual('isLowStock').get(function() {
  return this.trackInventory && this.stockQuantity <= this.lowStockThreshold;
});

// Generate unique product ID
productSchema.statics.generateProductId = async function() {
  return `prod_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
};

// Ensure virtuals are included in JSON output
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema, 'products');

module.exports = Product;

