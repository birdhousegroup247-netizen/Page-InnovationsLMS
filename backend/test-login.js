const bcrypt = require('bcrypt');
const { User } = require('./models');

async function testLogin() {
    try {
        console.log('🔍 Testing login credentials...\n');

        const testEmails = [
            'admin@tekypro.com',
            'jerod.homenick38@tekypro.com',
            'aliyah_veum@tekypro.com',
            'shannon_hayes71@yahoo.com',
            'arnold98@gmail.com',
            'carlotta_moen@tekypro.com',
            'lela53@yahoo.com',
            'grover.barton@yahoo.com',
            'rene83@yahoo.com'
        ];

        const testPassword = 'password123';

        for (const email of testEmails) {
            const user = await User.findByEmail(email);

            if (!user) {
                console.log(`❌ ${email} - NOT FOUND IN DATABASE`);
                continue;
            }

            const isValid = await user.comparePassword(testPassword);
            const status = isValid ? '✅ VALID' : '❌ INVALID';

            console.log(`${status} - ${email} (Role: ${user.role}, Active: ${user.is_active})`);

            // Show password hash for debugging
            if (!isValid) {
                console.log(`   Hash: ${user.password_hash?.substring(0, 20)}...`);
            }
        }

        console.log('\n✨ Test complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testLogin();
