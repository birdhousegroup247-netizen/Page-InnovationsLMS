/**
 * API Versioning Middleware
 * Handles API version routing and validation
 */

const logger = require('../utils/logger');

/**
 * API Version Configuration
 */
const API_VERSIONS = {
  CURRENT: 'v1',
  SUPPORTED: ['v1'],
  DEPRECATED: [],
};

/**
 * Validate API version from request
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
function validateApiVersion(req, res, next) {
  // Extract version from URL (e.g., /api/v1/courses)
  const versionMatch = req.path.match(/^\/api\/(v\d+)\//);

  if (!versionMatch) {
    // No version specified - redirect to current version
    req.apiVersion = API_VERSIONS.CURRENT;
    return next();
  }

  const requestedVersion = versionMatch[1];

  // Check if version is supported
  if (!API_VERSIONS.SUPPORTED.includes(requestedVersion)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported API version',
      message: `API version ${requestedVersion} is not supported. Supported versions: ${API_VERSIONS.SUPPORTED.join(', ')}`,
      currentVersion: API_VERSIONS.CURRENT,
    });
  }

  // Check if version is deprecated
  if (API_VERSIONS.DEPRECATED.includes(requestedVersion)) {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Sunset-Date', '2026-12-31'); // Example sunset date
    res.setHeader('X-API-Current-Version', API_VERSIONS.CURRENT);

    logger.warn(`Deprecated API version used: ${requestedVersion} from ${req.ip}`);
  }

  req.apiVersion = requestedVersion;
  next();
}

/**
 * Get API version info
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getApiVersionInfo(req, res) {
  res.json({
    success: true,
    current: API_VERSIONS.CURRENT,
    supported: API_VERSIONS.SUPPORTED,
    deprecated: API_VERSIONS.DEPRECATED,
    endpoints: {
      v1: '/api/v1',
    },
  });
}

module.exports = {
  validateApiVersion,
  getApiVersionInfo,
  API_VERSIONS,
};
