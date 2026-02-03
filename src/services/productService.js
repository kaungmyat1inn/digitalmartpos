const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Product Service - Handles product management
 */
class ProductService {
  /**
   * Create a new product
   */
  static async create(tenantId, userId, userName, productData) {
    const productId = await Product.generateProductId();
    
    const product = new Product({
      productId,
      tenantId,
      ...productData,
      createdBy: userId,
      updatedBy: userId,
    });
    
    await product.save();
    
    // Audit log
    await AuditLog.log({
      userId,
      tenantId,
      userName,
      userRole: null,
      action: 'PRODUCT_CREATE',
      resource: { type: 'product', id: productId, name: productData.name },
      newState: productData,
      status: 'success',
    });
    
    return product;
  }
  
  /**
   * Get product by ID
   */
  static async getById(tenantId, productId) {
    const product = await Product.findOne({ tenantId, productId });
    
    if (!product) {
      throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
    
    return product;
  }
  
  /**
   * Get all products with pagination and filters
   */
  static async getAll(tenantId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      category,
      status,
      search,
      minPrice,
      maxPrice,
    } = options;
    
    const filter = { tenantId };
    
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }
    
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);
    
    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Update product
   */
  static async update(tenantId, userId, userName, productId, updateData) {
    const product = await Product.findOne({ tenantId, productId });
    
    if (!product) {
      throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
    
    // Store previous state for audit
    const previousState = product.toObject();
    
    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'productId' && key !== 'tenantId') {
        product[key] = updateData[key];
      }
    });
    
    product.updatedBy = userId;
    await product.save();
    
    // Audit log
    await AuditLog.log({
      userId,
      tenantId,
      userName,
      userRole: null,
      action: 'PRODUCT_UPDATE',
      resource: { type: 'product', id: productId, name: product.name },
      previousState,
      newState: product.toObject(),
      status: 'success',
    });
    
    return product;
  }
  
  /**
   * Delete product (soft delete - set status to inactive)
   */
  static async delete(tenantId, userId, userName, productId) {
    const product = await Product.findOne({ tenantId, productId });
    
    if (!product) {
      throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
    
    const previousState = product.toObject();
    
    product.status = 'discontinued';
    product.updatedBy = userId;
    await product.save();
    
    // Audit log
    await AuditLog.log({
      userId,
      tenantId,
      userName,
      userRole: null,
      action: 'PRODUCT_DELETE',
      resource: { type: 'product', id: productId, name: product.name },
      previousState,
      status: 'success',
    });
    
    return { success: true, message: 'Product deleted successfully' };
  }
  
  /**
   * Update product stock
   */
  static async updateStock(tenantId, userId, userName, productId, quantityChange, reason = '') {
    const product = await Product.findOne({ tenantId, productId });
    
    if (!product) {
      throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
    
    const previousStock = product.stockQuantity;
    const newStock = previousStock + quantityChange;
    
    if (newStock < 0) {
      throw new ApiError(400, 'Insufficient stock', 'INSUFFICIENT_STOCK', {
        currentStock: previousStock,
        requestedChange: quantityChange,
      });
    }
    
    product.stockQuantity = newStock;
    product.updatedBy = userId;
    await product.save();
    
    // Audit log
    await AuditLog.log({
      userId,
      tenantId,
      userName,
      userRole: null,
      action: 'PRODUCT_STOCK_UPDATE',
      resource: { type: 'product', id: productId, name: product.name },
      details: {
        reason,
        previousStock,
        newStock,
        change: quantityChange,
      },
      status: 'success',
    });
    
    return {
      product,
      stockChange: {
        previous: previousStock,
        new: newStock,
        change: quantityChange,
      },
    };
  }
  
  /**
   * Get low stock products
   */
  static async getLowStock(tenantId, threshold = null) {
    const filter = {
      tenantId,
      status: 'active',
      trackInventory: true,
    };
    
    if (threshold) {
      filter.lowStockThreshold = threshold;
    }
    
    const products = await Product.find({
      ...filter,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    }).sort({ stockQuantity: 1 });
    
    return products;
  }
  
  /**
   * Get product categories for a tenant
   */
  static async getCategories(tenantId) {
    const categories = await Product.distinct('category', { tenantId });
    return categories.filter(c => c);
  }
}

module.exports = ProductService;

