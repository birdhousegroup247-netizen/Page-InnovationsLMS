#!/usr/bin/env node

/**
 * Script to create an admin user
 * Usage: node scripts/createAdmin.js
 */

require('dotenv').config();
const { User } = require('../models');
const { sequelize } = require('../config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('\n=== Create Admin User ===\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Get user input
    const fullName = await question('Enter full name: ');
    const email = await question('Enter email: ');
    const password = await question('Enter password (min 8 chars, include uppercase, lowercase, number, special char): ');
    const roleInput = await question('Enter role (admin/super_admin) [default: admin]: ');

    const role = roleInput.trim() || 'admin';

    if (!['admin', 'super_admin'].includes(role)) {
      console.error('\n✗ Invalid role. Must be "admin" or "super_admin"');
      process.exit(1);
    }

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('\n⚠ User already exists. Updating role...');
      existingUser.role = role;
      await existingUser.save();
      console.log(`✓ User role updated to: ${role}`);
      console.log(`✓ User ID: ${existingUser.id}`);
      console.log(`✓ Email: ${existingUser.email}`);
      console.log(`✓ Name: ${existingUser.full_name}\n`);
    } else {
      // Create new user
      const user = await User.createUser({
        full_name: fullName,
        email: email,
        password: password,
        role: role,
        is_active: true,
        email_verified: true,
      });

      console.log('\n✓ Admin user created successfully!');
      console.log(`✓ User ID: ${user.id}`);
      console.log(`✓ Email: ${user.email}`);
      console.log(`✓ Name: ${user.full_name}`);
      console.log(`✓ Role: ${user.role}\n`);
    }

    console.log('You can now login with these credentials at:');
    console.log('- Main App: http://localhost:5173');
    console.log('- Admin App: http://localhost:5174\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
    process.exit(1);
  } finally {
    rl.close();
    await sequelize.close();
  }
}

// Run the script
createAdmin();
