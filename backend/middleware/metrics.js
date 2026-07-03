/**
 * Performance Metrics Middleware
 * Tracks application performance using Prometheus
 */

const promClient = require('prom-client');
const logger = require('../utils/logger');

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'pageinnovation_lms_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection duration buckets
});

// ============================================================================
// CUSTOM METRICS
// ============================================================================

// HTTP Request Duration
const httpRequestDuration = new promClient.Histogram({
  name: 'pageinnovation_lms_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10], // Response time buckets in seconds
  registers: [register],
});

// HTTP Request Counter
const httpRequestCounter = new promClient.Counter({
  name: 'pageinnovation_lms_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active Connections
const activeConnections = new promClient.Gauge({
  name: 'pageinnovation_lms_active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Database Query Duration
const dbQueryDuration = new promClient.Histogram({
  name: 'pageinnovation_lms_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Cache Hit/Miss Counter
const cacheCounter = new promClient.Counter({
  name: 'pageinnovation_lms_cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'], // operation: get/set, result: hit/miss/error
  registers: [register],
});

// File Upload Size
const fileUploadSize = new promClient.Histogram({
  name: 'pageinnovation_lms_file_upload_bytes',
  help: 'Size of uploaded files in bytes',
  labelNames: ['file_type'],
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
  registers: [register],
});

// Active Users Gauge
const activeUsers = new promClient.Gauge({
  name: 'pageinnovation_lms_active_users',
  help: 'Number of currently active users',
  labelNames: ['role'],
  registers: [register],
});

// Course Enrollments Counter
const courseEnrollments = new promClient.Counter({
  name: 'pageinnovation_lms_course_enrollments_total',
  help: 'Total number of course enrollments',
  registers: [register],
});

// Test Submissions Counter
const testSubmissions = new promClient.Counter({
  name: 'pageinnovation_lms_test_submissions_total',
  help: 'Total number of test submissions',
  labelNames: ['test_type'], // practice, assigned
  registers: [register],
});

// Certificate Generations Counter
const certificateGenerations = new promClient.Counter({
  name: 'pageinnovation_lms_certificates_generated_total',
  help: 'Total number of certificates generated',
  registers: [register],
});

// Email Sent Counter
const emailsSent = new promClient.Counter({
  name: 'pageinnovation_lms_emails_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['email_type', 'status'], // status: success/failure
  registers: [register],
});

// Socket.IO Connections
const socketConnections = new promClient.Gauge({
  name: 'pageinnovation_lms_socket_connections',
  help: 'Number of active Socket.IO connections',
  registers: [register],
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Metrics collection middleware
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // Track active connections
  activeConnections.inc();

  // Capture response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds

    // Normalize route for better grouping
    const route = normalizeRoute(req.route?.path || req.path);

    // Record metrics
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestCounter.labels(req.method, route, res.statusCode).inc();

    // Decrement active connections
    activeConnections.dec();
  });

  next();
}

/**
 * Normalize route path for metrics
 * Replaces dynamic segments with placeholders
 */
function normalizeRoute(path) {
  if (!path) return 'unknown';

  // Replace IDs and UUIDs with placeholders
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/gi, '/:uuid')
    .replace(/\/[a-f0-9]{24}/gi, '/:objectid');
}

/**
 * Expose metrics endpoint
 */
async function metricsEndpoint(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end(error.message);
  }
}

/**
 * Health check with metrics
 */
function healthCheck(req, res) {
  const metrics = register.getSingleMetric('pageinnovation_lms_http_requests_total');

  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metricsAvailable: true,
    totalRequests: metrics ? metrics.hashMap : null,
  });
}

// ============================================================================
// HELPER FUNCTIONS FOR TRACKING
// ============================================================================

/**
 * Track database query
 */
function trackDbQuery(queryType, table, duration) {
  dbQueryDuration.labels(queryType, table).observe(duration);
}

/**
 * Track cache operation
 */
function trackCache(operation, result) {
  cacheCounter.labels(operation, result).inc();
}

/**
 * Track file upload
 */
function trackFileUpload(fileType, sizeBytes) {
  fileUploadSize.labels(fileType).observe(sizeBytes);
}

/**
 * Track active user
 */
function trackActiveUser(role, increment = true) {
  if (increment) {
    activeUsers.labels(role).inc();
  } else {
    activeUsers.labels(role).dec();
  }
}

/**
 * Track course enrollment
 */
function trackCourseEnrollment() {
  courseEnrollments.inc();
}

/**
 * Track test submission
 */
function trackTestSubmission(testType) {
  testSubmissions.labels(testType).inc();
}

/**
 * Track certificate generation
 */
function trackCertificateGeneration() {
  certificateGenerations.inc();
}

/**
 * Track email sent
 */
function trackEmailSent(emailType, status) {
  emailsSent.labels(emailType, status).inc();
}

/**
 * Track socket connection
 */
function trackSocketConnection(increment = true) {
  if (increment) {
    socketConnections.inc();
  } else {
    socketConnections.dec();
  }
}

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  healthCheck,
  register,
  // Tracking functions
  trackDbQuery,
  trackCache,
  trackFileUpload,
  trackActiveUser,
  trackCourseEnrollment,
  trackTestSubmission,
  trackCertificateGeneration,
  trackEmailSent,
  trackSocketConnection,
};
