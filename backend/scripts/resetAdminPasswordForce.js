#!/usr/bin/env node

/**
 * Script to forcefully reset admin password
 * Usage: node scripts/resetAdminPasswordForce.js
 */

require('dotenv').config();
const { User } = require('../models');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
    try {
        console.log('\n=== JSON Admin Password Reset ===\n');

        // Test database connection
        await sequelize.authenticate();

        // Find the admin user
        const email = 'admin@tekypro.com';
        const user = await User.findByEmail(email);

        if (!user) {
            console.error(`\n✗ Error: User with email '${email}' not found.\n`);
            process.exit(1);
        }

        // Force update password hash
        const newPassword = 'Admin@123';
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update via direct query to avoid any model hooks that might interfere
        await sequelize.query(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            {
                replacements: [hashedPassword, email],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        console.log(`\n✓ Success! Password for '${email}' has been forcefully reset to: ${newPassword}\n`);

    } catch (error) {
        console.error('\n✗ Error:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run the script
resetAdminPassword();
