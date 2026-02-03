const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Staff = require('../models/Staff');
const AuditLog = require('../models/AuditLog');
const { calculateOrderTotals } = require('../utils/helpers');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Sale Service - Handles sales/orders management
 */
class SaleService {
  /**
   * Create a new sale
   */
  static async create(tenantId, userId, userName, saleData) {
    const { lineItems, paymentMethod, customer, notes } = saleData;
    
    // Validate and prepare line items
    if (!lineItems || lineItems.length === 0) {
      throw new ApiError(400, 'Sale must have at least one line item', 'EMPTY_SALE');
    }
    
    // Get product details and validate stock
    const processedLineItems = [];
    let subtotal = 0;
    
    for (const item of lineItems) {
      const product = await Product.findOne({ tenantId, productId: item.productId });
      
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`, 'PRODUCT_NOT_FOUND');
      }
      
      if (product.status !== 'active') {
        throw new ApiError(400, `Product is not available: ${product.name}`, 'PRODUCT_INACTIVE');
      }
      
      // Check stock if tracking inventory
      if (product.trackInventory && item.quantity > product.stockQuantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`, 'INSUFFICIENT_STOCK', {
          productId: product.productId,
          productName: product.name,
          availableStock: product.stockQuantity,
          requestedQuantity: item.quantity,
        });
      }
      
      // Calculate line item total
      const discount = item.discount || 0;
      const tax = item.tax || 0;
      const lineTotal = (product.price * item.quantity) - discount + tax;
      
      processedLineItems.push({
        productId: product.productId,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: product.price,
        discount,
        tax,
        total: lineTotal,
      });
      
      subtotal += product.price * item.quantity;
      
      // Update stock
      if (product.trackInventory) {
        product.stockQuantity -= item.quantity;
        await product.save();
      }
    }
    
    // Calculate totals
    const totals = calculateOrderTotals(processedLineItems, {
      globalDiscount: saleData.globalDiscount || 0,
      globalTaxRate: saleData.globalTaxRate || 0,
    });
    
    // Generate invoice number
    const invoiceNumber = await Sale.generateInvoiceNumber(tenantId);
    
    // Create sale
    const saleId = await Sale.generateSaleId();
    
    const sale = new Sale({
      saleId,
      tenantId,
      invoiceNumber,
      customer: customer || {},
      lineItems: processedLineItems,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount + (saleData.globalDiscount || 0),
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      paymentMethod,
      paymentStatus: 'paid',
      status: 'completed',
      staffId: userId,
      staffName: userName,
      notes,
    });
    
    await sale.save();
    
    // Audit log
    await AuditLog.log({
      userId,
      tenantId,
      userName,
      userRole: null,
      action: 'SALE_CREATE',
      resource: { type: 'sale', id: saleId, name: invoiceNumber },
      details: {
        lineItemsCount: lineItems.length,
        grandTotal: totals.grandTotal,
        paymentMethod,
      },
      status: 'success',
    });
    
    return sale;
  }
  
  /**
   * Get sale by ID
   */
  static async getById(tenantId, saleId) {
    const sale = await Sale.findOne({ tenantId, saleId });
    
    if (!sale) {
      throw new ApiError(404, 'Sale not found', 'SALE_NOT_FOUND');
    }
    
    return sale;
  }
  
  /**
   * Get all sales with pagination and filters
   */
  static async getAll(tenantId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      status,
      paymentStatus,
      staffId,
      startDate,
      endDate,
    } = options;
    
    const filter = { tenantId };
    
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (staffId) filter.staffId = staffId;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Sale.countDocuments(filter),
    ]);
    
    return {
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Cancel a sale
   */
  static async cancel(tenantId, userId, userName, saleId, reason = '') {
    const sale = await Sale.findOne({ tenantId, saleId });
    
    if (!sale) {
      throw new ApiError(404, 'Sale not found', 'SALE_NOT_FOUND');
    }
    
    if (sale.status === 'cancelled') {
      throw new ApiError(400, 'Sale is already cancelled', 'SALE_ALREADY_CANCELLED');
    }
    
    if (sale.status === 'refunded') {
      throw new ApiError(400, 'Cannot cancel a refunded sale', 'SALE_REFUNDED');
    }
    
    const previousState = sale.toObject();
    
    // Restore stock
    for (const item of sale.lineItems) {
      const product = await Product.findOne({ tenantId, productId: item.productId });
      if (product && product.trackInventory) {
        product.stockQuantity += item.quantity;
        await product.save();
      }
    }
    
    // Update sale status
    sale.status = 'cancelled';
    sale.paymentStatus = 'refunded';
    sale.notes = `${sale.notes || ''}\n\nCancellation reason: ${reason}`.trim();
    
    await sale.save();
    
    // Audit log
    await AuditLog.log({
      userId,
      tenantId,
      userName,
      userRole: null,
      action: 'SALE_CANCEL',
      resource: { type: 'sale', id: saleId, name: sale.invoiceNumber },
      previousState,
      newState: sale.toObject(),
      details: { reason },
      status: 'success',
    });
    
    return sale;
  }
  
  /**
   * Refund a sale
   */
  static async refund(tenantId, userId, userName, saleId, refundAmount, reason = '') {
    const sale = await Sale.findOne({ tenantId, saleId });
    
    if (!sale) {
      throw new ApiError(404, 'Sale not found', 'SALE_NOT_FOUND');
    }
    
    if (sale.status === 'refunded') {
      throw new ApiError(400, 'Sale is already refunded', 'SALE_ALREADY_REFUNDED');
    }
    
    if (sale.status === 'cancelled') {
      throw new ApiError(400, 'Cannot refund a cancelled sale', 'SALE_CANCELLED');
    }
    
    const previousState = sale.toObject();
    
    // Calculate refund
    const remainingRefund = sale.grandTotal - (sale.grandTotal - (sale.totalDiscount || 0));
    
    if (refundAmount > remainingRefund) {
      throw new ApiError(400, 'Refund amount exceeds sale total', 'REFUND_AMOUNT_EXCEEDED', {
        saleTotal: sale.grandTotal,
        maxRefund: remainingRefund,
      });
    }
    
    // Restore stock for refunded items
    for (const item of sale.lineItems) {
      const product = await Product.findOne({ tenantId, productId: item.productId });
      if (product && product.trackInventory) {
        product.stockQuantity += item.quantity;
        await product.save();
      }
    }
    
    // Update sale status
    sale.status = 'refunded';
    sale.paymentStatus = 'refunded';
    sale.notes = `${sale.notes || ''}\n\nRefund reason: ${reason} | Amount: ${refundAmount}`.trim();
    
    await sale.save();
    
    // Audit log
    await AuditLog.log({
      userId,
      tenantId,
      userName,
      userRole: null,
      action: 'SALE_REFUND',
      resource: { type: 'sale', id: saleId, name: sale.invoiceNumber },
      previousState,
      newState: sale.toObject(),
      details: { refundAmount, reason },
      status: 'success',
    });
    
    return sale;
  }
  
  /**
   * Get sales summary/analytics
   */
  static async getSummary(tenantId, startDate, endDate) {
    const filter = {
      tenantId,
      status: 'completed',
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
    
    const sales = await Sale.find(filter);
    
    // Calculate summary
    let totalSales = 0;
    let totalDiscount = 0;
    let totalItems = 0;
    
    sales.forEach(sale => {
      totalSales += sale.grandTotal;
      totalDiscount += sale.totalDiscount || 0;
      totalItems += sale.lineItems.reduce((sum, item) => sum + item.quantity, 0);
    });
    
    // Sales by payment method
    const salesByPaymentMethod = {};
    sales.forEach(sale => {
      if (!salesByPaymentMethod[sale.paymentMethod]) {
        salesByPaymentMethod[sale.paymentMethod] = { count: 0, total: 0 };
      }
      salesByPaymentMethod[sale.paymentMethod].count++;
      salesByPaymentMethod[sale.paymentMethod].total += sale.grandTotal;
    });
    
    return {
      period: { startDate, endDate },
      totalSales: sales.length,
      totalRevenue: totalSales,
      totalDiscount,
      totalItemsSold: totalItems,
      averageOrderValue: sales.length > 0 ? totalSales / sales.length : 0,
      salesByPaymentMethod,
    };
  }
}

module.exports = SaleService;

