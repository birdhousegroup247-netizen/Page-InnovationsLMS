/**
 * Service Testing Script
 * Tests Email and Cloudinary services
 */

require('dotenv').config();
const emailService = require('./services/email/emailService');
const CloudinaryService = require('./services/storage/cloudinaryService');
const logger = require('./utils/logger');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

async function testServices() {
  console.log('\n' + '='.repeat(60));
  console.log('  🧪 Page Innovations LMS - Service Testing');
  console.log('='.repeat(60) + '\n');

  let emailOk = false;
  let cloudinaryOk = false;

  // =========================================================================
  // TEST 1: Email Service
  // =========================================================================
  console.log('📧 Testing Email Service...\n');

  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      log.warn('Email credentials not configured in .env');
      log.info('Set EMAIL_USER and EMAIL_PASSWORD to test email service');
    } else {
      log.info(`Email Host: ${process.env.EMAIL_HOST}`);
      log.info(`Email User: ${process.env.EMAIL_USER}`);

      // Verify connection
      const isConnected = await emailService.verifyConnection();
      if (isConnected) {
        log.success('Email service connection verified!');
        emailOk = true;

        // Test sending email (optional - uncomment to actually send)
        // log.info('Sending test email...');
        // const result = await emailService.sendWelcomeEmail(
        //   process.env.EMAIL_USER,
        //   'Test User'
        // );
        // if (result.success) {
        //   log.success(`Test email sent! Message ID: ${result.messageId}`);
        // }
      } else {
        log.error('Email service connection failed');
        log.info('Check your EMAIL_USER and EMAIL_PASSWORD in .env');
      }
    }
  } catch (error) {
    log.error(`Email service test failed: ${error.message}`);
  }

  console.log('');

  // =========================================================================
  // TEST 2: Cloudinary Service
  // =========================================================================
  console.log('☁️  Testing Cloudinary Service...\n');

  try {
    // Check if Cloudinary credentials are configured
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      log.warn('Cloudinary credentials not configured in .env');
      log.info('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    } else {
      log.info(`Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
      log.info(`API Key: ${process.env.CLOUDINARY_API_KEY}`);

      // Test connection with ping
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const pingResult = await cloudinary.api.ping();
      log.success('Cloudinary connection verified!');
      log.info(`Status: ${pingResult.status}`);
      cloudinaryOk = true;

      // Optional: Test upload with a small base64 image
      // Uncomment to test actual upload
      // const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      // const uploadResult = await CloudinaryService.uploadImage(testImage, 'test', 'test-image');
      // log.success(`Test image uploaded: ${uploadResult.url}`);
      // await CloudinaryService.deleteFile(uploadResult.public_id, 'image');
      // log.success('Test image deleted');
    }
  } catch (error) {
    log.error(`Cloudinary service test failed: ${error.message}`);
  }

  console.log('');

  // =========================================================================
  // TEST SUMMARY
  // =========================================================================
  console.log('='.repeat(60));
  console.log('  📊 Test Summary');
  console.log('='.repeat(60) + '\n');

  const emailStatus = emailOk ? '✓ PASS' : '✗ FAIL';
  const cloudinaryStatus = cloudinaryOk ? '✓ PASS' : '✗ FAIL';

  console.log(`Email Service:      ${emailOk ? colors.green : colors.red}${emailStatus}${colors.reset}`);
  console.log(`Cloudinary Service: ${cloudinaryOk ? colors.green : colors.red}${cloudinaryStatus}${colors.reset}`);

  console.log('');

  if (emailOk && cloudinaryOk) {
    console.log(`${colors.green}🎉 All services are working correctly!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  Some services need configuration.${colors.reset}`);
    console.log('Check the .env file and refer to docs/EMAIL_AND_UPLOAD_SETUP.md\n');
  }

  process.exit(emailOk && cloudinaryOk ? 0 : 1);
}

// Run tests
testServices().catch((error) => {
  console.error('Test script error:', error);
  process.exit(1);
});
