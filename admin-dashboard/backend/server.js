const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
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

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TekyPro LMS Admin API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/admin/users', require('./routes/users'));
app.use('/api/admin/stats', require('./routes/stats'));
app.use('/api/admin/analytics', require('./routes/analytics'));

// API root
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to TekyPro LMS Admin API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/admin/users',
      stats: '/api/admin/stats',
      analytics: '/api/admin/analytics',
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

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();

    if (!isConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔧 TekyPro LMS Admin Dashboard API                     ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV?.padEnd(42) || 'development'.padEnd(42)}║
║   Port: ${PORT.toString().padEnd(50)}║
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
  await sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
