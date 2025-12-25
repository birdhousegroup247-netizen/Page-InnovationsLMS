const express = require('express');
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
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

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
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TekyPro LMS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', require('./routes/api/auth'));
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

// Admin routes (requires admin/super_admin role)
app.use('/api/admin/users', require('./routes/api/admin/users'));
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

    // Sync database (only in development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('✓ Database synchronized');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 TekyPro LMS API Server                              ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV?.padEnd(42) || 'development'.padEnd(42)}║
║   Port: ${PORT.toString().padEnd(50)}║
║   Database: ${process.env.DB_NAME?.padEnd(46) || 'Not Connected'.padEnd(46)}║
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
