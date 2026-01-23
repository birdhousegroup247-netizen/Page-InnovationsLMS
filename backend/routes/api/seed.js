/**
 * Seed Database Route
 * WARNING: This should be disabled after initial setup!
 * Call this endpoint ONCE to populate initial data
 */

const express = require('express');
const router = express.Router();

// SECURITY: In production, require SEED_SECRET to be set
const SEED_SECRET = process.env.SEED_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

// If production and no SEED_SECRET configured, disable seeding
if (isProduction && !SEED_SECRET) {
  module.exports = router;
  return;
}

const bcrypt = require('bcrypt');

/**
 * @route   POST /api/seed
 * @desc    Seed database with initial data (ONE TIME USE)
 * @access  Public (but protected by secret key)
 */
router.post('/', async (req, res) => {
  try {
    // Security check - require secret key
    const { secret } = req.body;

    if (secret !== process.env.SEED_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Invalid seed secret. Set SEED_SECRET environment variable.',
      });
    }

    // Import models
    const { User, Category, Course } = require('../../models');

    // Check if already seeded (prevent duplicate runs)
    const existingAdmin = await User.findOne({
      where: { email: 'admin@tekypro.com' }
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Database already seeded! Admin user exists.',
        hint: 'Use a different email or delete the existing admin first.',
      });
    }

    console.log('🌱 Starting database seeding...');

    // 1. Create Super Admin
    const hashedPassword = await bcrypt.hash('password123', 10);
    const superAdmin = await User.create({
      full_name: 'Super Admin',
      email: 'admin@tekypro.com',
      password_hash: hashedPassword,
      role: 'super_admin',
      is_active: true,
      email_verified: true,
    });
    console.log('✓ Created super admin');

    // 2. Create Categories
    const categories = await Category.bulkCreate([
      {
        name: 'Programming',
        description: 'Learn programming languages and software development',
        slug: 'programming',
        is_active: true,
      },
      {
        name: 'Databases',
        description: 'Master database design, administration, and optimization',
        slug: 'databases',
        is_active: true,
      },
      {
        name: 'Web Development',
        description: 'Build modern web applications and websites',
        slug: 'web-development',
        is_active: true,
      },
      {
        name: 'Cloud Computing',
        description: 'Learn cloud platforms and deployment strategies',
        slug: 'cloud-computing',
        is_active: true,
      },
      {
        name: 'Data Science',
        description: 'Analyze data and build machine learning models',
        slug: 'data-science',
        is_active: true,
      },
    ]);
    console.log(`✓ Created ${categories.length} categories`);

    // 3. Create Sample Instructor
    const instructor = await User.create({
      full_name: 'John Smith',
      email: 'instructor@tekypro.com',
      password_hash: hashedPassword,
      role: 'instructor',
      instructor_status: 'approved',
      is_active: true,
      email_verified: true,
    });
    console.log('✓ Created sample instructor');

    // 4. Create Sample Course
    const course = await Course.create({
      title: 'Introduction to Database Administration',
      slug: 'intro-database-admin',
      description: 'Learn the fundamentals of database administration including installation, configuration, backup, and recovery.',
      category_id: categories[1].id, // Databases category
      instructor_id: instructor.id,
      level: 'beginner',
      price: 0,
      currency: 'USD',
      duration_hours: 10,
      status: 'published',
      published_at: new Date(),
    });
    console.log('✓ Created sample course');

    res.json({
      success: true,
      message: 'Database seeded successfully! 🎉',
      data: {
        users: {
          superAdmin: {
            email: 'admin@tekypro.com',
            password: 'password123',
            role: 'super_admin',
          },
          instructor: {
            email: 'instructor@tekypro.com',
            password: 'password123',
            role: 'instructor',
          },
        },
        categories: categories.length,
        courses: 1,
      },
      note: 'You can now login with admin@tekypro.com / password123',
    });

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed database',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * @route   GET /api/seed/status
 * @desc    Check if database has been seeded
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const { User, Category, Course } = require('../../models');

    const [userCount, categoryCount, courseCount] = await Promise.all([
      User.count(),
      Category.count(),
      Course.count(),
    ]);

    const isSeeded = userCount > 0;

    res.json({
      success: true,
      seeded: isSeeded,
      counts: {
        users: userCount,
        categories: categoryCount,
        courses: courseCount,
      },
      message: isSeeded
        ? 'Database is seeded ✅'
        : 'Database is empty - needs seeding',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check seed status',
      error: error.message,
    });
  }
});

module.exports = router;
