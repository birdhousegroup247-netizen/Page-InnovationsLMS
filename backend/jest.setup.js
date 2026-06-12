/**
 * Jest Setup File
 * Loads environment variables before running tests
 */

require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(60000);

// Sync all models once before the test suite runs so newly-added tables
// (e.g. email_verifications) exist locally without needing a server restart.
beforeAll(async () => {
  try {
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
  } catch (e) {
    console.warn('[jest.setup] sequelize.sync skipped:', e.message);
  }
});

// Mock otplib (uses ESM @scure/base which Jest cannot parse)
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(() => '123456'),
    verify: jest.fn(() => true),
    generateSecret: jest.fn(() => 'MOCKSECRET'),
  },
}));

// Mock qrcode (may depend on ESM sub-deps)
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,MOCK')),
}));
