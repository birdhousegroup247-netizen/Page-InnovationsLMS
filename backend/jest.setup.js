/**
 * Jest Setup File
 * Loads environment variables before running tests
 */

require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);
