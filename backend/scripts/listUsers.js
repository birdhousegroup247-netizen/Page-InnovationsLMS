#!/usr/bin/env node

/**
 * Script to list all users
 * Usage: node scripts/listUsers.js
 */

require('dotenv').config();
const { User } = require('../models');
const { sequelize } = require('../config/database');

async function listUsers() {
  try {
    console.log('\n=== User List ===\n');

    // Test database connection
    await sequelize.authenticate();

    // Get all users
    const users = await User.findAll({
      attributes: ['id', 'full_name', 'email', 'role', 'instructor_status', 'is_active', 'created_at'],
      order: [['id', 'ASC']]
    });

    if (users.length === 0) {
      console.log('No users found.\n');
    } else {
      console.log(`Found ${users.length} user(s):\n`);

      users.forEach(user => {
        const status = user.is_active ? '✓' : '✗';
        const instructorInfo = user.instructor_status !== 'none'
          ? ` (instructor: ${user.instructor_status})`
          : '';

        console.log(`${status} ID: ${user.id}`);
        console.log(`  Name: ${user.full_name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Role: ${user.role}${instructorInfo}`);
        console.log(`  Active: ${user.is_active}`);
        console.log(`  Created: ${user.created_at.toISOString().split('T')[0]}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
listUsers();
