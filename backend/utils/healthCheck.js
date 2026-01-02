/**
 * Comprehensive Health Check Utility
 * Checks all system dependencies and services
 */

const { sequelize } = require('../config/database');
const { getRedisClient, isRedisAvailable } = require('../config/redis');
const logger = require('./logger');
const os = require('os');
const fs = require('fs').promises;

/**
 * Check database health
 */
async function checkDatabase() {
  try {
    await sequelize.authenticate();
    const result = await sequelize.query('SELECT 1+1 AS result');

    return {
      status: 'healthy',
      responseTime: result[1].duration || 0,
      message: 'Database connection is healthy',
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      message: error.message,
      error: error.name,
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis() {
  try {
    const client = getRedisClient();

    if (!client) {
      return {
        status: 'disabled',
        message: 'Redis is not enabled',
      };
    }

    if (!isRedisAvailable()) {
      return {
        status: 'unhealthy',
        message: 'Redis client is not ready',
      };
    }

    const start = Date.now();
    await client.ping();
    const responseTime = Date.now() - start;

    return {
      status: 'healthy',
      responseTime,
      message: 'Redis connection is healthy',
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'unhealthy',
      message: error.message,
      error: error.name,
    };
  }
}

/**
 * Check disk space
 */
async function checkDiskSpace() {
  try {
    const stats = await fs.statfs('/');
    const totalSpace = stats.blocks * stats.bsize;
    const freeSpace = stats.bfree * stats.bsize;
    const usedSpace = totalSpace - freeSpace;
    const usedPercentage = ((usedSpace / totalSpace) * 100).toFixed(2);

    const status = usedPercentage > 90 ? 'critical' : usedPercentage > 80 ? 'warning' : 'healthy';

    return {
      status,
      totalSpace: formatBytes(totalSpace),
      freeSpace: formatBytes(freeSpace),
      usedSpace: formatBytes(usedSpace),
      usedPercentage: `${usedPercentage}%`,
      message: status === 'healthy' ? 'Disk space is healthy' : `Disk space is ${usedPercentage}% full`,
    };
  } catch (error) {
    logger.error('Disk space check failed:', error);
    return {
      status: 'unknown',
      message: 'Could not check disk space',
      error: error.message,
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usedPercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

  const processMemory = process.memoryUsage();

  const status = usedPercentage > 90 ? 'critical' : usedPercentage > 80 ? 'warning' : 'healthy';

  return {
    status,
    system: {
      total: formatBytes(totalMemory),
      free: formatBytes(freeMemory),
      used: formatBytes(usedMemory),
      usedPercentage: `${usedPercentage}%`,
    },
    process: {
      rss: formatBytes(processMemory.rss),
      heapTotal: formatBytes(processMemory.heapTotal),
      heapUsed: formatBytes(processMemory.heapUsed),
      external: formatBytes(processMemory.external),
    },
    message: status === 'healthy' ? 'Memory usage is healthy' : `Memory usage is ${usedPercentage}%`,
  };
}

/**
 * Check CPU usage
 */
function checkCPU() {
  const cpus = os.cpus();
  const cpuCount = cpus.length;

  // Calculate average CPU usage
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpuCount;
  const total = totalTick / cpuCount;
  const usedPercentage = (100 - ~~(100 * idle / total)).toFixed(2);

  const loadAverage = os.loadavg();
  const status = usedPercentage > 90 ? 'critical' : usedPercentage > 80 ? 'warning' : 'healthy';

  return {
    status,
    cores: cpuCount,
    model: cpus[0].model,
    usedPercentage: `${usedPercentage}%`,
    loadAverage: {
      '1min': loadAverage[0].toFixed(2),
      '5min': loadAverage[1].toFixed(2),
      '15min': loadAverage[2].toFixed(2),
    },
    message: status === 'healthy' ? 'CPU usage is healthy' : `CPU usage is ${usedPercentage}%`,
  };
}

/**
 * Check application uptime
 */
function checkUptime() {
  const uptimeSeconds = process.uptime();
  const systemUptimeSeconds = os.uptime();

  return {
    status: 'healthy',
    process: formatUptime(uptimeSeconds),
    system: formatUptime(systemUptimeSeconds),
    processSeconds: uptimeSeconds,
    systemSeconds: systemUptimeSeconds,
  };
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  const requiredVersion = '18.0.0';
  const currentVersion = process.version.substring(1); // Remove 'v' prefix

  const isCompatible = compareVersions(currentVersion, requiredVersion) >= 0;

  return {
    status: isCompatible ? 'healthy' : 'warning',
    version: process.version,
    requiredVersion: `>=${requiredVersion}`,
    message: isCompatible ? 'Node.js version is compatible' : 'Node.js version may be outdated',
  };
}

/**
 * Comprehensive health check
 */
async function performHealthCheck() {
  const startTime = Date.now();

  const [database, redis, diskSpace, memory, cpu, uptime, nodeVersion] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkDiskSpace(),
    Promise.resolve(checkMemory()),
    Promise.resolve(checkCPU()),
    Promise.resolve(checkUptime()),
    Promise.resolve(checkNodeVersion()),
  ]);

  const responseTime = Date.now() - startTime;

  // Determine overall status
  const statuses = [database.status, redis.status, diskSpace.status, memory.status, cpu.status];
  let overallStatus = 'healthy';

  if (statuses.includes('unhealthy')) {
    overallStatus = 'unhealthy';
  } else if (statuses.includes('critical')) {
    overallStatus = 'critical';
  } else if (statuses.includes('warning')) {
    overallStatus = 'warning';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    dependencies: {
      database,
      redis,
    },
    resources: {
      diskSpace,
      memory,
      cpu,
    },
    runtime: {
      uptime,
      nodeVersion,
      platform: process.platform,
      arch: process.arch,
    },
  };
}

/**
 * Readiness check (for K8s/Docker)
 * Checks if app is ready to receive traffic
 */
async function performReadinessCheck() {
  try {
    const database = await checkDatabase();

    if (database.status !== 'healthy') {
      return {
        ready: false,
        message: 'Database is not ready',
        checks: { database },
      };
    }

    return {
      ready: true,
      message: 'Application is ready',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ready: false,
      message: 'Readiness check failed',
      error: error.message,
    };
  }
}

/**
 * Liveness check (for K8s/Docker)
 * Checks if app is alive
 */
async function performLivenessCheck() {
  try {
    // Simple check - if we can respond, we're alive
    return {
      alive: true,
      message: 'Application is alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  } catch (error) {
    return {
      alive: false,
      message: 'Liveness check failed',
      error: error.message,
    };
  }
}

/**
 * Helper: Format bytes to human-readable format
 */
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Helper: Format uptime to human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Helper: Compare version strings
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

module.exports = {
  performHealthCheck,
  performReadinessCheck,
  performLivenessCheck,
  checkDatabase,
  checkRedis,
  checkDiskSpace,
  checkMemory,
  checkCPU,
  checkUptime,
};
