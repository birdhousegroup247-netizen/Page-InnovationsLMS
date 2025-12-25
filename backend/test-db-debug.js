/**
 * Debug script to test database operations
 */

require('dotenv').config();
const { User, Course, Category } = require('./models');

async function testDatabaseOperations() {
  console.log('🔍 Testing database operations...\n');

  try {
    // Test 1: Create category
    console.log('1. Creating category...');
    const category = await Category.create({
      name: `Debug Category ${Date.now()}`,
      slug: `debug-cat-${Date.now()}`,
    });
    console.log('✅ Category created:', category.id);

    // Test 2: Create user
    console.log('\n2. Creating user...');
    const user = await User.create({
      full_name: 'Debug User',
      email: `debug_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      role: 'instructor',
    });
    console.log('✅ User created:', user.id);

    // Test 3: Create course
    console.log('\n3. Creating course...');
    const course = await Course.create({
      title: 'Debug Course',
      description: 'Testing course creation',
      instructor_id: user.id,
      category_id: category.id,
      level: 'beginner',
      language: 'en',
      is_published: true,
    });
    console.log('✅ Course created:', course.id);

    // Cleanup
    console.log('\n4. Cleaning up...');
    await course.destroy();
    await user.destroy();
    await category.destroy();
    console.log('✅ Cleanup complete');

    console.log('\n🎉 All database operations successful!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testDatabaseOperations();
