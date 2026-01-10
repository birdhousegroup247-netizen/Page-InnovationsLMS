#!/usr/bin/env node

/**
 * Script to reset admin password
 * Usage: node scripts/resetAdminPassword.js
 */

require('dotenv').config();
const { User } = require('../models');
const { sequelize } = require('../config/database');

async function resetAdminPassword() {
  try {
    console.log('\n=== Reset Admin Password ===\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Find admin user
    const admin = await User.findByEmail('admin@tekypro.com');

    if (!admin) {
      console.error('✗ Admin user not found!');
      console.log('Available emails in database:');
      const users = await User.findAll({
        attributes: ['email', 'role'],
        where: { role: ['admin', 'super_admin'] }
      });
      users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
      process.exit(1);
    }

    // Set new password
    const newPassword = 'Admin@123456';
    const hashedPassword = await User.hashPassword(newPassword);
    admin.password_hash = hashedPassword;
    await admin.save();

    console.log('✓ Password reset successfully!\n');
    console.log('Login Credentials:');
    console.log('==================');
    console.log(`Email: admin@tekypro.com`);
    console.log(`Password: Admin@123456`);
    console.log('');
    console.log('Login at: http://localhost:5174');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password after logging in!\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
resetAdminPassword();
