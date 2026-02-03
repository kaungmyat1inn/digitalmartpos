/**
 * Generate a unique ID
 */
function generateId(prefix = 'id') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}${random}`;
}

/**
 * Generate a unique invoice number
 */
function generateInvoiceNumber(existingNumbers = []) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Find the highest sequence number for today
  let maxSeq = 0;
  existingNumbers.forEach(num => {
    if (num.startsWith(`INV-${dateStr}`)) {
      const seq = parseInt(num.split('-')[2], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });
  
  const newSeq = String(maxSeq + 1).padStart(4, '0');
  return `INV-${dateStr}-${newSeq}`;
}

/**
 * Calculate line item totals
 */
function calculateLineItem(item) {
  const subtotal = item.quantity * item.unitPrice;
  const discountAmount = item.discount || 0;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = item.tax || 0;
  const total = afterDiscount + taxAmount;
  
  return {
    ...item,
    subtotal,
    discountAmount,
    afterDiscount,
    taxAmount,
    total,
  };
}

/**
 * Calculate order totals
 */
function calculateOrderTotals(lineItems, options = {}) {
  const { globalDiscount = 0, globalTaxRate = 0 } = options;
  
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  
  const calculatedItems = lineItems.map(item => {
    const calculated = calculateLineItem(item);
    subtotal += calculated.subtotal;
    totalDiscount += calculated.discountAmount;
    totalTax += calculated.taxAmount;
    return calculated;
  });
  
  const afterGlobalDiscount = subtotal - globalDiscount;
  const globalTaxAmount = afterGlobalDiscount * (globalTaxRate / 100);
  const grandTotal = afterGlobalDiscount + globalTaxAmount;
  
  return {
    items: calculatedItems,
    subtotal,
    totalDiscount,
    totalTax,
    globalDiscount,
    globalTaxRate,
    globalTaxAmount,
    grandTotal,
  };
}

/**
 * Sanitize object for response (remove sensitive fields)
 */
function sanitizeUser(user) {
  if (!user) return null;
  const obj = typeof user.toJSON === 'function' ? user.toJSON() : user;
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format currency
 */
function formatCurrency(amount, currency = 'MMK') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse query parameters for pagination
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Build sort object from query
 */
function parseSort(query, defaultSort = { createdAt: -1 }) {
  if (!query.sort) return defaultSort;
  
  const sortParts = query.sort.split(',');
  const sort = {};
  
  sortParts.forEach(part => {
    const field = part.startsWith('-') ? part.substring(1) : part;
    const order = part.startsWith('-') ? -1 : 1;
    sort[field] = order;
  });
  
  return sort;
}

/**
 * Build filter object from query
 */
function parseFilter(query, allowedFields = []) {
  const filter = {};
  
  Object.keys(query).forEach(key => {
    if (['page', 'limit', 'sort', 'fields'].includes(key)) return;
    
    if (allowedFields.includes(key) && query[key] !== undefined && query[key] !== '') {
      filter[key] = query[key];
    }
  });
  
  return filter;
}

/**
 * Sleep utility for testing/retries
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateId,
  generateInvoiceNumber,
  calculateLineItem,
  calculateOrderTotals,
  sanitizeUser,
  isValidEmail,
  validatePassword,
  formatCurrency,
  parsePagination,
  parseSort,
  parseFilter,
  sleep,
};

