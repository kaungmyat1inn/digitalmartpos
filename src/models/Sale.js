const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  sku: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

const saleSchema = new mongoose.Schema({
  saleId: {
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
  invoiceNumber: {
    type: String,
    required: true,
  },
  customer: {
    customerId: String,
    name: String,
    phone: String,
    email: String,
  },
  lineItems: [lineItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  totalDiscount: {
    type: Number,
    default: 0,
  },
  totalTax: {
    type: Number,
    default: 0,
  },
  grandTotal: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_payment', 'bank_transfer', 'credit'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'refunded'],
    default: 'paid',
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded', 'pending'],
    default: 'completed',
  },
  staffId: {
    type: String,
    required: true,
  },
  staffName: String,
  notes: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
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
saleSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ tenantId: 1, createdAt: -1 });
saleSchema.index({ tenantId: 1, staffId: 1 });
saleSchema.index({ tenantId: 1, status: 1 });

// Update timestamp on save
saleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate unique sale ID
saleSchema.statics.generateSaleId = async function() {
  return `sale_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
};

// Generate invoice number
saleSchema.statics.generateInvoiceNumber = async function(tenantId) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await this.countDocuments({ tenantId, createdAt: { $gte: new Date(date.setHours(0,0,0,0)) } });
  return `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

const Sale = mongoose.model('Sale', saleSchema, 'sales');

module.exports = Sale;

