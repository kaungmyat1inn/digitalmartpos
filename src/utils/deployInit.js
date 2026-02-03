/**
 * Deployment Initialization Script
 * Automatically creates super admin and default tenant/shop admin accounts on first deployment
 */

const User = require('../models/User');
const Tenant = require('../models/Tenant');
const AuthService = require('../services/authService');
const config = require('../config');

/**
 * Initialize admin accounts during deployment
 */
async function initializeAdminAccounts() {
  // Check if auto-creation is enabled
  if (!config.admin.autoCreate) {
    console.log('ℹ️  Admin auto-creation is disabled (ADMIN_AUTO_CREATE=false)');
    return null;
  }

  console.log('\n🚀 Starting deployment initialization...\n');

  let superAdminResult = null;
  let tenantResult = null;

  // Step 1: Create Super Admin if not exists
  try {
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      console.log('✅ Super Admin already exists:', existingSuperAdmin.email);
    } else {
      console.log('📝 Creating Super Admin account...');
      superAdminResult = await AuthService.createSuperAdmin({
        email: config.admin.superAdmin.email,
        password: config.admin.superAdmin.password,
        firstName: config.admin.superAdmin.firstName,
        lastName: config.admin.superAdmin.lastName,
      });
      console.log('✅ Super Admin created successfully!');
      console.log(`   Email: ${superAdminResult.email}`);
      console.log(`   Role: ${superAdminResult.role}`);
    }
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Super Admin already exists');
    } else {
      console.error('❌ Failed to create Super Admin:', error.message);
    }
  }

  // Step 2: Create Default Tenant and Shop Admin
  try {
    // Check if default tenant already exists
    const existingTenant = await Tenant.findOne({ 
      name: config.admin.tenant.name 
    });
    
    if (existingTenant) {
      console.log(`✅ Default tenant "${existingTenant.name}" already exists`);
      
      // Check if shop admin exists for this tenant
      const existingShopAdmin = await User.findOne({
        tenantId: existingTenant.tenantId,
        role: 'shop_admin'
      });
      
      if (existingShopAdmin) {
        console.log('✅ Shop Admin already exists:', existingShopAdmin.email);
      } else {
        console.log('📝 Creating Shop Admin account...');
        tenantResult = await AuthService.createTenantAndShopAdmin(
          (await User.findOne({ role: 'super_admin' })).userId,
          {
            tenantName: config.admin.tenant.name,
            shopAdminEmail: config.admin.tenant.shopAdminEmail,
            shopAdminPassword: config.admin.tenant.shopAdminPassword,
            shopAdminName: config.admin.tenant.shopAdminName,
            plan: config.admin.tenant.plan,
          }
        );
        console.log('✅ Shop Admin created successfully!');
        console.log(`   Email: ${tenantResult.shopAdmin.email}`);
        console.log(`   Tenant: ${tenantResult.tenant.name}`);
      }
    } else {
      // Need super admin to create tenant
      const superAdmin = await User.findOne({ role: 'super_admin' });
      
      if (!superAdmin) {
        console.log('⚠️  Cannot create tenant: Super Admin not found');
        console.log('   Please create Super Admin first via API or set environment variables');
      } else {
        console.log('📝 Creating default tenant and shop admin...');
        tenantResult = await AuthService.createTenantAndShopAdmin(
          superAdmin.userId,
          {
            tenantName: config.admin.tenant.name,
            shopAdminEmail: config.admin.tenant.shopAdminEmail,
            shopAdminPassword: config.admin.tenant.shopAdminPassword,
            shopAdminName: config.admin.tenant.shopAdminName,
            plan: config.admin.tenant.plan,
          }
        );
        console.log('✅ Default tenant and Shop Admin created successfully!');
        console.log(`   Tenant: ${tenantResult.tenant.name}`);
        console.log(`   Plan: ${tenantResult.tenant.plan}`);
        console.log(`   Shop Admin Email: ${tenantResult.shopAdmin.email}`);
      }
    }
  } catch (error) {
    if (error.message?.includes('already exists')) {
      console.log('✅ Default tenant already exists');
    } else {
      console.error('❌ Failed to create tenant/shop admin:', error.message);
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                   Deployment Summary                         ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Super Admin:                                               ║');
  console.log(`║    Email: ${(config.admin.superAdmin.email || '').padEnd(37)}║`);
  console.log(`║    Password: ${(config.admin.superAdmin.password ? '********' : 'N/A').padEnd(36)}║`);
  console.log('║                                                              ║');
  console.log('║  Default Tenant:                                           ║');
  console.log(`║    Name: ${(config.admin.tenant.name || '').padEnd(41)}║`);
  console.log(`║    Plan: ${(config.admin.tenant.plan || '').padEnd(40)}║`);
  console.log('║                                                              ║');
  console.log('║  Shop Admin:                                               ║');
  console.log(`║    Email: ${(config.admin.tenant.shopAdminEmail || '').padEnd(37)}║`);
  console.log(`║    Password: ${(config.admin.tenant.shopAdminPassword ? '********' : 'N/A').padEnd(34)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log('💡 For security, please change the default passwords after first login!\n');

  return {
    superAdmin: superAdminResult,
    tenant: tenantResult,
  };
}

/**
 * Check if admin accounts are properly set up
 */
async function checkAdminSetup() {
  const superAdmin = await User.findOne({ role: 'super_admin' });
  const tenants = await Tenant.find();
  
  return {
    hasSuperAdmin: !!superAdmin,
    tenantCount: tenants.length,
    superAdminEmail: superAdmin?.email,
  };
}

module.exports = {
  initializeAdminAccounts,
  checkAdminSetup,
};

