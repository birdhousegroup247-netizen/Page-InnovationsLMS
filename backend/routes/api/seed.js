/**
 * Seed Database Route
 * WARNING: This should be disabled after initial setup!
 * Call this endpoint ONCE to populate initial data
 */

const express = require('express');
const router = express.Router();

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

    // Check if already seeded (prevent duplicate runs)
    const { User } = require('../../models');
    const existingAdmin = await User.findOne({
      where: { email: 'admin@tekypro.com' }
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Database already seeded! Admin user exists.',
        hint: 'Delete the admin user first if you want to reseed.',
      });
    }

    // Run the seed script
    console.log('🌱 Starting database seeding...');

    // Import and run seeder
    const { exec } = require('child_process');
    const path = require('path');

    const seedScript = path.join(__dirname, '../../scripts/seedDatabase.js');

    exec(`node ${seedScript}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Seed error:', error);
        return res.status(500).json({
          success: false,
          message: 'Seeding failed',
          error: error.message,
        });
      }

      console.log('Seed output:', stdout);

      res.json({
        success: true,
        message: 'Database seeded successfully! 🎉',
        details: {
          adminEmail: 'admin@tekypro.com',
          adminPassword: 'password123',
          note: 'Check the server logs for full details',
        },
      });
    });

  } catch (error) {
    console.error('Seed route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed database',
      error: error.message,
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
