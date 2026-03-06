require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const passport = require('./config/passport');

const { Sequelize } = require('sequelize');
const { sequelize, testConnection } = require('./config/database');
const { initRedis, closeRedis } = require('./config/redis');
const { initializeSocketIO } = require('./config/socket');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');
const { getApiVersionInfo } = require('./middleware/apiVersion');
const { performHealthCheck, performReadinessCheck, performLivenessCheck } = require('./utils/healthCheck');
const { securityHeaders, contentSecurityPolicy, detectAttackPatterns } = require('./middleware/security');
const { preventRateLimitBypass } = require('./middleware/requestValidator');
const { smartSanitizer } = require('./middleware/smartSanitizer');

logger.info('🚀 Starting TekyPro LMS server...');

// Initialize Express app
const app = express();

// Trust proxy (required for Render/Heroku to get correct IP)
app.set('trust proxy', 1);

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

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
  // Production URLs - Render
  'https://tekyprolms.onrender.com',
  'https://admin-tekyprolms.onrender.com',
  // Production URLs - Railway
  'https://tekypro-student-production.up.railway.app',
  'https://tekypro-admin-production.up.railway.app',
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
app.use(contentSecurityPolicy); // Enable CSP headers
app.use(smartSanitizer); // Context-aware sanitization
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

// API Documentation - Only available in development or with admin auth
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TekyPro LMS API Documentation',
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
} else {
  // In production, return 404 for API docs
  app.use('/api-docs', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });
}

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
app.use('/api/seed', require('./routes/api/seed')); // One-time database seeding
app.use('/api/categories', require('./routes/api/admin/categories')); // Public categories access
app.use('/api/courses', require('./routes/api/courses'));
app.use('/api/knowledge', require('./routes/api/knowledge'));
app.use('/api/questions', require('./routes/api/questions'));
app.use('/api/practice-tests', require('./routes/api/practiceTests'));
app.use('/api/assigned-tests', require('./routes/api/assignedTests'));
app.use('/api/certificates', require('./routes/api/certificates'));
app.use('/api/upload', require('./routes/api/upload'));
app.use('/api/notifications', require('./routes/api/notifications'));
app.use('/api/chat', require('./routes/api/chat'));
app.use('/api', require('./routes/api/reviews'));
app.use('/api/bookmarks', require('./routes/api/bookmarks'));
app.use('/api', require('./routes/api/lesson-questions'));
app.use('/api', require('./routes/api/announcements'));
app.use('/api/activity', require('./routes/api/activity'));
app.use('/api/profile', require('./routes/api/profile'));
app.use('/api/export', require('./routes/api/export'));
// app.use('/api/users', require('./routes/api/users'));

// New feature routes
app.use('/api/notes',       require('./routes/api/notes'));
app.use('/api/badges',      require('./routes/api/badges'));
app.use('/api/leaderboard', require('./routes/api/leaderboard'));
app.use('/api',             require('./routes/api/assignments'));
app.use('/api/search',      require('./routes/api/search'));
app.use('/api/instructors', require('./routes/api/instructor-reviews'));
app.use('/api/sessions',   require('./routes/api/sessions'));
app.use('/api/forum',      require('./routes/api/forum-posts'));

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
    logger.info('🔄 Initializing Redis...');
    try {
      initRedis();
      logger.info('✓ Redis initialization complete');
    } catch (redisError) {
      logger.error('✗ Redis initialization failed:', redisError.message);
      logger.warn('⚠ Continuing without Redis...');
    }

    // Load all models
    logger.info('🔄 Loading database models...');
    try {
      require('./models');
      logger.info('✓ All models loaded successfully');
    } catch (modelError) {
      logger.error('✗ Model loading failed:', modelError.message);
      logger.error('Full error:', modelError);
      throw modelError;
    }

    // Auto-migration: ensure critical columns exist (dialect-agnostic, runs every startup)
    try {
      logger.info('🔄 Running auto-migrations...');
      const qi = sequelize.getQueryInterface();

      for (const table of ['users', 'courses']) {
        const desc = await qi.describeTable(table);
        if (!desc.deleted_at) {
          await qi.addColumn(table, 'deleted_at', {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
          });
          logger.info(`  ✓ Added deleted_at column to ${table}`);
        }
      }

      // Add prerequisite_course_id to courses if missing
      const coursesDesc = await qi.describeTable('courses');
      if (!coursesDesc.prerequisite_course_id) {
        await qi.addColumn('courses', 'prerequisite_course_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
        });
        logger.info('  ✓ Added prerequisite_course_id column to courses');
      }

      // Add unlock_after_days to module_contents if missing
      const moduleContentsDesc = await qi.describeTable('module_contents');
      if (!moduleContentsDesc.unlock_after_days) {
        await qi.addColumn('module_contents', 'unlock_after_days', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
        });
        logger.info('  ✓ Added unlock_after_days column to module_contents');
      }

      // Add missing columns to content_progress if needed
      try {
        const cpDesc = await qi.describeTable('content_progress');
        const cpMissing = {
          watch_time_seconds: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          last_position_seconds: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          completed_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
          last_accessed: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
          completed: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
        };
        for (const [colName, colDef] of Object.entries(cpMissing)) {
          if (!cpDesc[colName]) {
            await qi.addColumn('content_progress', colName, colDef);
            logger.info(`  ✓ Added ${colName} column to content_progress`);
          }
        }
      } catch (cpErr) {
        logger.warn(`  ⚠ content_progress column check failed: ${cpErr.message}`);
      }

      // Create any missing tables for newer models (safe: no-op if table already exists)
      const {
        ChatRoom, ChatRoomMember, Conversation, Message, MessageReaction, MutedChat,
        LessonNote, LessonQuestion, QuestionReply, CourseAnnouncement,
        InstructorReview, LiveSession, ForumPost, ForumReply,
        Assignment, AssignmentSubmission,
      } = require('./models');

      const newModels = [
        [ChatRoom, 'chat_rooms'],
        [ChatRoomMember, 'chat_room_members'],
        [Conversation, 'conversations'],
        [Message, 'messages'],
        [MessageReaction, 'message_reactions'],
        [MutedChat, 'muted_chats'],
        [LessonNote, 'lesson_notes'],
        [LessonQuestion, 'lesson_questions'],
        [QuestionReply, 'question_replies'],
        [CourseAnnouncement, 'course_announcements'],
        [InstructorReview, 'instructor_reviews'],
        [LiveSession, 'live_sessions'],
        [ForumPost, 'forum_posts'],
        [ForumReply, 'forum_replies'],
        [Assignment, 'assignments'],
        [AssignmentSubmission, 'assignment_submissions'],
      ];

      for (const [Model, tableName] of newModels) {
        try {
          await Model.sync({ force: false });
          logger.info(`  ✓ Ensured table exists: ${tableName}`);
        } catch (tableErr) {
          logger.warn(`  ⚠ Could not ensure ${tableName}: ${tableErr.message}`);
        }
      }

      logger.info('✓ Auto-migrations complete');
    } catch (migrationErr) {
      logger.error('⚠ Auto-migration failed (continuing):', migrationErr.message);
    }

    // Sync database tables if enabled
    // Set DB_SYNC_ENABLED=true in environment to create tables on first deploy
    // IMPORTANT: Disable after tables are created to prevent accidental schema changes
    try {
      if (process.env.DB_SYNC_ENABLED === 'true') {
        logger.info('🔄 Starting database table synchronization...');

        // Check if force reset is requested (WARNING: This will delete all data!)
        const forceReset = process.env.DB_FORCE_RESET === 'true';
        if (forceReset) {
          logger.warn('⚠️  DB_FORCE_RESET is enabled - This will DROP ALL TABLES and recreate them!');
        }

        try {
          if (forceReset) {
            // force: true drops and recreates all tables (data loss!)
            await sequelize.sync({ force: true });
          } else {
            // alter: true safely adds missing columns without dropping data
            await sequelize.sync({ force: false, alter: true });
          }
          logger.info('✓ Database tables synchronized (DB_SYNC_ENABLED=true)');
        } catch (syncError) {
          logger.error('✗ Database sync failed:', syncError.message);
          logger.error('Error name:', syncError.name);

          // Sequelize wraps database errors in parent/original
          if (syncError.parent) {
            logger.error('Database error (parent):', syncError.parent.message);
            logger.error('SQL:', syncError.parent.sql);
          }
          if (syncError.original) {
            logger.error('Database error (original):', syncError.original.message);
          }

          logger.error('Full error stack:', syncError.stack);
          // throw syncError; // Dont crash on sync error
        }
      } else if (process.env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        logger.info('✓ Database synchronized (development mode)');
      }
    } catch (syncErr) {
      logger.error('⚠ Database sync encountered an error but server will continue:', syncErr.message);
    }

    // Session reminder cron: notify students 15 min before scheduled live sessions
    setInterval(async () => {
      try {
        const { LiveSession, Enrollment } = require('./models');
        const { Op: SessOp } = require('sequelize');
        const NotificationsController = require('./controllers/notifications/notificationsController');
        const now = new Date();
        const soon = new Date(now.getTime() + 15 * 60 * 1000);
        const sessions = await LiveSession.findAll({
          where: {
            status: 'scheduled',
            scheduled_at: { [SessOp.between]: [now, soon] },
          },
        });
        for (const session of sessions) {
          const enrollments = await Enrollment.findAll({
            where: { course_id: session.course_id },
            attributes: ['student_id'],
          });
          if (enrollments.length > 0) {
            const notifications = enrollments.map((e) => ({
              user_id: e.student_id,
              type: 'live_session',
              title: 'Live Session Starting Soon',
              message: `"${session.title}" starts in 15 minutes. Get ready!`,
              link: `/courses/${session.course_id}/learn`,
              priority: 'high',
            }));
            await NotificationsController.createBulkNotifications(notifications);
          }
        }
      } catch (cronErr) {
        logger.error('Session reminder cron error:', cronErr.message);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

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
