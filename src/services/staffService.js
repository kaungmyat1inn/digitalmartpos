const Staff = require('../models/Staff');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Staff Service - Handles staff account management
 * Staff accounts can be created by super_admin (when setting up subscription for shop_admin)
 * or by shop_admin (within their tenant)
 */
class StaffService {
  /**
   * Create a new staff account
   * Note: This is typically called when super_admin sets up a shop_admin account
   * or when shop_admin creates additional staff
   */
  static async create(creatorId, creatorRole, tenantId, staffData) {
    const { name, email, phone, role, permissions } = staffData;
    
    // Validate creator permissions
    if (creatorRole === 'staff') {
      throw new ApiError(403, 'Staff cannot create accounts', 'FORBIDDEN');
    }
    
    // Check if email already exists in this tenant
    const existingStaff = await Staff.findOne({ tenantId, email: email.toLowerCase() });
    
    if (existingStaff) {
      throw new ApiError(409, 'Email already registered for this tenant', 'EMAIL_EXISTS');
    }
    
    // Generate IDs
    const staffId = await Staff.generateStaffId();
    const userId = await User.generateUserId();
    
    // Create user account
    const user = new User({
      userId,
      tenantId,
      email: email.toLowerCase(),
      passwordHash: staffData.password || Math.random().toString(36).slice(-8), // Temp password if not provided
      role: role === 'shop_admin' ? 'shop_admin' : 'staff',
      status: 'active',
      profile: {
        firstName: name,
        phone,
      },
      createdBy: creatorId,
    });
    
    await user.save();
    
    // Create staff record
    const staff = new Staff({
      staffId,
      tenantId,
      userId,
      name,
      email: email.toLowerCase(),
      phone,
      role: role || 'staff',
      permissions: permissions || {
        canManageProducts: role === 'shop_admin',
        canManageSales: true,
        canManageStaff: role === 'shop_admin',
        canViewReports: role === 'shop_admin' || role === 'manager',
        canApplyDiscount: role === 'shop_admin' || role === 'manager',
        canRefund: role === 'shop_admin' || role === 'manager',
      },
      createdBy: creatorId,
      createdByRole: creatorRole,
    });
    
    await staff.save();
    
    // Audit log
    await AuditLog.log({
      userId: creatorId,
      tenantId,
      userName: null,
      userRole: creatorRole,
      action: 'STAFF_CREATE',
      resource: { type: 'staff', id: staffId, name },
      details: {
        email,
        role,
        createdBy: creatorRole,
      },
      status: 'success',
    });
    
    return {
      staff,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      // Don't return password in production - this is for initial setup
      ...(staffData.password && { tempPassword: staffData.password }),
    };
  }
  
  /**
   * Get staff by ID
   */
  static async getById(tenantId, staffId) {
    const staff = await Staff.findOne({ tenantId, staffId });
    
    if (!staff) {
      throw new ApiError(404, 'Staff not found', 'STAFF_NOT_FOUND');
    }
    
    return staff;
  }
  
  /**
   * Get all staff for a tenant
   */
  static async getAll(tenantId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      role,
      status,
    } = options;
    
    const filter = { tenantId };
    
    if (role) filter.role = role;
    if (status) filter.status = status;
    
    const skip = (page - 1) * limit;
    
    const [staff, total] = await Promise.all([
      Staff.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Staff.countDocuments(filter),
    ]);
    
    return {
      staff,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Update staff details
   */
  static async update(tenantId, updaterId, updaterRole, staffId, updateData) {
    const staff = await Staff.findOne({ tenantId, staffId });
    
    if (!staff) {
      throw new ApiError(404, 'Staff not found', 'STAFF_NOT_FOUND');
    }
    
    const previousState = staff.toObject();
    
    // Only shop_admin or higher can update staff
    if (updaterRole === 'staff') {
      throw new ApiError(403, 'Staff cannot update accounts', 'FORBIDDEN');
    }
    
    // Prevent changing role to super_admin
    if (updateData.role === 'super_admin') {
      throw new ApiError(400, 'Cannot assign super_admin role', 'INVALID_ROLE');
    }
    
    // Update allowed fields
    const allowedFields = ['name', 'email', 'phone', 'role', 'permissions', 'status', 'shift', 'hireDate'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        staff[field] = updateData[field];
      }
    });
    
    await staff.save();
    
    // Also update user if email changed
    if (updateData.email) {
      await User.updateOne(
        { userId: staff.userId },
        { email: updateData.email.toLowerCase() }
      );
    }
    
    // Audit log
    await AuditLog.log({
      userId: updaterId,
      tenantId,
      userName: null,
      userRole: updaterRole,
      action: 'STAFF_UPDATE',
      resource: { type: 'staff', id: staffId, name: staff.name },
      previousState,
      newState: staff.toObject(),
      status: 'success',
    });
    
    return staff;
  }
  
  /**
   * Suspend staff account
   */
  static async suspend(tenantId, suspenderId, suspenderRole, staffId, reason = '') {
    const staff = await Staff.findOne({ tenantId, staffId });
    
    if (!staff) {
      throw new ApiError(404, 'Staff not found', 'STAFF_NOT_FOUND');
    }
    
    if (suspenderRole === 'staff') {
      throw new ApiError(403, 'Staff cannot suspend accounts', 'FORBIDDEN');
    }
    
    // Cannot suspend shop_admin unless by super_admin
    if (staff.role === 'shop_admin' && suspenderRole !== 'super_admin') {
      throw new ApiError(403, 'Only super_admin can suspend shop_admin', 'FORBIDDEN');
    }
    
    // Update staff status
    staff.status = 'suspended';
    await staff.save();
    
    // Also suspend user
    await User.updateOne(
      { userId: staff.userId },
      { status: 'suspended' }
    );
    
    // Audit log
    await AuditLog.log({
      userId: suspenderId,
      tenantId,
      userName: null,
      userRole: suspenderRole,
      action: 'STAFF_SUSPEND',
      resource: { type: 'staff', id: staffId, name: staff.name },
      details: { reason },
      status: 'success',
    });
    
    return { success: true, message: 'Staff suspended successfully' };
  }
  
  /**
   * Activate suspended staff
   */
  static async activate(tenantId, activatorId, activatorRole, staffId) {
    const staff = await Staff.findOne({ tenantId, staffId });
    
    if (!staff) {
      throw new ApiError(404, 'Staff not found', 'STAFF_NOT_FOUND');
    }
    
    if (activatorRole === 'staff') {
      throw new ApiError(403, 'Staff cannot activate accounts', 'FORBIDDEN');
    }
    
    staff.status = 'active';
    await staff.save();
    
    // Also activate user
    await User.updateOne(
      { userId: staff.userId },
      { status: 'active' }
    );
    
    // Audit log
    await AuditLog.log({
      userId: activatorId,
      tenantId,
      userName: null,
      userRole: activatorRole,
      action: 'USER_ACTIVATE',
      resource: { type: 'staff', id: staffId, name: staff.name },
      status: 'success',
    });
    
    return { success: true, message: 'Staff activated successfully' };
  }
  
  /**
   * Delete staff (soft delete)
   */
  static async delete(tenantId, deleterId, deleterRole, staffId) {
    const staff = await Staff.findOne({ tenantId, staffId });
    
    if (!staff) {
      throw new ApiError(404, 'Staff not found', 'STAFF_NOT_FOUND');
    }
    
    if (deleterRole === 'staff') {
      throw new ApiError(403, 'Staff cannot delete accounts', 'FORBIDDEN');
    }
    
    // Cannot delete shop_admin unless by super_admin
    if (staff.role === 'shop_admin' && deleterRole !== 'super_admin') {
      throw new ApiError(403, 'Only super_admin can delete shop_admin', 'FORBIDDEN');
    }
    
    // Soft delete - just set status to inactive
    staff.status = 'inactive';
    await staff.save();
    
    // Also set user to inactive
    await User.updateOne(
      { userId: staff.userId },
      { status: 'inactive' }
    );
    
    // Audit log
    await AuditLog.log({
      userId: deleterId,
      tenantId,
      userName: null,
      userRole: deleterRole,
      action: 'STAFF_DELETE',
      resource: { type: 'staff', id: staffId, name: staff.name },
      status: 'success',
    });
    
    return { success: true, message: 'Staff deleted successfully' };
  }
}

module.exports = StaffService;

