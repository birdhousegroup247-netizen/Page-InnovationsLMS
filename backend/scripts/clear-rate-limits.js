#!/usr/bin/env node

/**
 * Clear Rate Limit Script
 * Clears rate limiting keys from Redis
 */

const { initRedis, getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

async function clearRateLimits(pattern = 'rate_limit:auth:*') {
  try {
    // Initialize Redis connection
    initRedis();

    // Wait a moment for connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    const client = getRedisClient();

    if (!client) {
      console.error('Redis client not available');
      process.exit(1);
    }

    console.log(`Searching for keys matching: ${pattern}`);

    // Get all keys matching the pattern
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
      console.log('No rate limit keys found');
      return;
    }

    console.log(`Found ${keys.length} rate limit key(s):`);
    keys.forEach(key => console.log(`  - ${key}`));

    // Delete all matching keys
    const result = await client.del(...keys);
    console.log(`\n✓ Cleared ${result} rate limit key(s)`);

    process.exit(0);
  } catch (error) {
    console.error('Error clearing rate limits:', error);
    process.exit(1);
  }
}

// Get pattern from command line args or use default
const pattern = process.argv[2] || 'rate_limit:auth:*';

clearRateLimits(pattern);
