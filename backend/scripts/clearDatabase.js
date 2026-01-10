require('dotenv').config();
const { User } = require('../models');
const sequelize = User.sequelize;

async function clearAllData() {
    console.log('🗑️  Clearing all database data...\n');

    try {
        // Disable foreign key checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        // Get all table names
        const [tables] = await sequelize.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);

        // Delete from each table
        for (const table of tableNames) {
            await sequelize.query(`DELETE FROM ${table}`);
            console.log(`   ✓ Cleared ${table}`);
        }

        // Re-enable foreign key checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n✅ All data cleared successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

clearAllData();
