const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetPasswords() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pageinnovation_lms'
  });

  try {
    console.log('Connected to database...');

    // Hash the password "Admin@123"
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('Updating passwords for test users...');

    // Update passwords for all test users
    const testUsers = [
      'student@pageinnovation.com',
      'instructor@pageinnovation.com',
      'admin@pageinnovation.com'
    ];

    for (const email of testUsers) {
      await connection.execute(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [hashedPassword, email]
      );
      console.log(`✓ Updated password for ${email}`);
    }

    console.log('\n✅ All test user passwords have been reset to: Admin@123');
    console.log('\nTest accounts:');
    console.log('- student@pageinnovation.com / Admin@123');
    console.log('- instructor@pageinnovation.com / Admin@123');
    console.log('- admin@pageinnovation.com / Admin@123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

resetPasswords();
