#!/usr/bin/env node

/**
 * Script to promote a user to admin
 * Usage: node scripts/makeAdmin.js <email>
 */

require('dotenv').config();
const { User } = require('../models');
const { sequelize } = require('../config/database');

async function makeAdmin() {
    const email = process.argv[2];

    if (!email) {
        console.error('\nUsage: node scripts/makeAdmin.js <email>');
        console.error('Example: node scripts/makeAdmin.js user@example.com\n');
        process.exit(1);
    }

    try {
        // Test database connection
        await sequelize.authenticate();

        // Find the user
        const user = await User.findByEmail(email);

        if (!user) {
            console.error(`\n✗ Error: User with email '${email}' not found.\n`);
            process.exit(1);
        }

        // Update role
        const oldRole = user.role;
        user.role = 'admin';
        await user.save();

        console.log(`\n✓ Success! User '${email}' promoted from '${oldRole}' to 'admin'.\n`);
        console.log('You may need to log out and log back in for changes to take effect.\n');

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run the script
makeAdmin();
