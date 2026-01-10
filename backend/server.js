const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const passport = require('./config/passport');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const { initRedis, closeRedis } = require('./config/redis');
const { initializeSocketIO } = require('./config/socket');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');
const { getApiVersionInfo } = require('./middleware/apiVersion');
const { performHealthCheck, performReadinessCheck, performLivenessCheck } = require('./utils/healthCheck');
const { securityHeaders, detectAttackPatterns } = require('./middleware/security');
const { sanitizeInput, preventRateLimitBypass } = require('./middleware/requestValidator');

// Initialize Express app
const app = express();

// Trust proxy (required for Render/Heroku to get correct IP)
app.set('trust proxy', 1);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(server);

// Make io accessible to routes
app.set('io', io);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());

// Response compression
if (process.env.ENABLE_COMPRESSION === 'true') {
  app.use(
    compression({
      level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    })
  );
  logger.info('✓ Response compression enabled');
}

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173',  // Main app dev
  'http://localhost:5174',  // Admin app dev
  process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',
  // Production URLs (Render.com deployment)
  'https://tekypro-student.onrender.com',
  'https://tekypro-admin.onrender.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like direct browser access, Postman, curl, health checks)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// Body parsers with reasonable limits
// Most API endpoints don't need more than 1MB
// File uploads should use multipart/form-data through upload middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cookie parser
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Rate limiting - Per-user with Redis backend
const { globalApiLimiter } = require('./middleware/rateLimiter');

app.use('/api/', globalApiLimiter);

// Security middleware
app.use(securityHeaders);
app.use(sanitizeInput);
app.use(preventRateLimitBypass);
app.use(detectAttackPatterns);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Metrics collection middleware
app.use(metricsMiddleware);

// ============================================================================
// ROUTES
// ============================================================================

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TekyPro LMS API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'warning' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      error: error.message,
    });
  }
});

// Readiness probe (for Kubernetes)
app.get('/ready', async (req, res) => {
  try {
    const readiness = await performReadinessCheck();
    res.status(readiness.ready ? 200 : 503).json(readiness);
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      ready: false,
      message: 'Readiness check failed',
      error: error.message,
    });
  }
});

// Liveness probe (for Kubernetes)
app.get('/live', async (req, res) => {
  try {
    const liveness = await performLivenessCheck();
    res.status(liveness.alive ? 200 : 503).json(liveness);
  } catch (error) {
    logger.error('Liveness check failed:', error);
    res.status(503).json({
      alive: false,
      message: 'Liveness check failed',
      error: error.message,
    });
  }
});

// Metrics endpoint for Prometheus
app.get('/metrics', metricsEndpoint);

// API version info endpoint
app.get('/api/version', getApiVersionInfo);

// API Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/categories', require('./routes/api/admin/categories')); // Public categories access
app.use('/api/courses', require('./routes/api/courses'));
app.use('/api/knowledge', require('./routes/api/knowledge'));
app.use('/api/questions', require('./routes/api/questions'));
app.use('/api/practice-tests', require('./routes/api/practiceTests'));
app.use('/api/assigned-tests', require('./routes/api/assignedTests'));
app.use('/api/certificates', require('./routes/api/certificates'));
app.use('/api/upload', require('./routes/api/upload'));
app.use('/api/notifications', require('./routes/api/notifications'));
app.use('/api', require('./routes/api/reviews'));
app.use('/api/bookmarks', require('./routes/api/bookmarks'));
app.use('/api', require('./routes/api/lesson-questions'));
app.use('/api', require('./routes/api/announcements'));
app.use('/api/activity', require('./routes/api/activity'));
app.use('/api/profile', require('./routes/api/profile'));
app.use('/api/export', require('./routes/api/export'));
// app.use('/api/users', require('./routes/api/users'));

// Instructor routes (requires instructor/admin/super_admin role)
app.use('/api/instructor', require('./routes/api/instructor'));

// Admin routes (requires admin/super_admin role)
app.use('/api/admin/users', require('./routes/api/admin/users'));
app.use('/api/admin/categories', require('./routes/api/admin/categories'));
app.use('/api/admin/stats', require('./routes/api/admin/stats'));
app.use('/api/admin/analytics', require('./routes/api/admin/analytics'));
app.use('/api/admin/instructor-applications', require('./routes/admin/instructorApplicationRoutes'));
app.use('/api/admin/courses', require('./routes/api/admin/courses'));

// API root
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to TekyPro LMS API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      courses: '/api/courses',
      knowledge: '/api/knowledge',
      questions: '/api/questions',
      practiceTests: '/api/practice-tests',
      assignedTests: '/api/assigned-tests',
      certificates: '/api/certificates',
      upload: '/api/upload',
      notifications: '/api/notifications',
      reviews: '/api/courses/:courseId/reviews',
      bookmarks: '/api/bookmarks',
      lessonQuestions: '/api/lessons/:contentId/questions',
      announcements: '/api/courses/:courseId/announcements',
      activity: '/api/activity',
      profile: '/api/profile',
      admin: {
        users: '/api/admin/users',
        stats: '/api/admin/stats',
        analytics: '/api/admin/analytics',
      },
    },
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();

    if (!isConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize Redis
    initRedis();

    // Sync database tables if enabled
    // Set DB_SYNC_ENABLED=true in environment to create tables on first deploy
    // IMPORTANT: Disable after tables are created to prevent accidental schema changes
    if (process.env.DB_SYNC_ENABLED === 'true') {
      await sequelize.sync({ alter: false, force: false });
      logger.info('✓ Database tables synchronized (DB_SYNC_ENABLED=true)');
      logger.warn('⚠ Remember to disable DB_SYNC_ENABLED after initial setup!');
    } else if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('✓ Database synchronized (development mode)');
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 TekyPro LMS API Server                              ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV?.padEnd(42) || 'development'.padEnd(42)}║
║   Port: ${PORT.toString().padEnd(50)}║
║   Database: ${process.env.DB_NAME?.padEnd(46) || 'Not Connected'.padEnd(46)}║
║   WebSocket: Enabled${' '.padEnd(43)}║
║                                                           ║
║   Server URL: http://localhost:${PORT.toString().padEnd(29)}║
║   Health Check: http://localhost:${PORT}/health${' '.padEnd(15)}║
║                                                           ║
║   TekyPro - The Leading Remote DBA Service Provider      ║
║   https://www.tekypro.com                                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await closeRedis();
  await sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
