const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
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
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['super_admin', 'shop_admin', 'staff'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    avatar: String,
  },
  // For tracking who created this user
  createdBy: {
    type: String,
    required: false,
  },
  lastLogin: Date,
  refreshTokens: [{
    token: String,
    createdAt: Date,
    expiresAt: Date,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for email+tenant unique constraint
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  if (!this.isModified('passwordHash')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Generate unique user ID
userSchema.statics.generateUserId = async function() {
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
};

const User = mongoose.model('User', userSchema, 'users');

module.exports = User;

