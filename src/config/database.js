const mongoose = require('mongoose');
const config = require('./index');

/**
 * Global mongoose connection options
 */
const mongooseOptions = {
  // Production optimizations
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Connect to MongoDB with proper error handling
 */
async function connectDatabase() {
  try {
    await mongoose.connect(config.mongo.uri, mongooseOptions);
    console.log(`✅ MongoDB Connected to: ${config.mongo.uri}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB gracefully
 */
async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error.message);
  }
}

/**
 * Get tenant-specific database connection
 * Uses collection prefix strategy for multi-tenancy
 */
function getTenantConnection(tenantId) {
  const tenantDb = mongoose.connection.useDb(`tenant_${tenantId}`);
  return tenantDb;
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getTenantConnection,
  mongoose,
};

