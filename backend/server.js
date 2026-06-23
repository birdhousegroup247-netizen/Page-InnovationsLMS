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
const CSRF = require('./utils/csrf');

logger.info('🚀 Starting TekyPro LMS server...');

// Initialize Express app
const app = express();

// Trust proxy (required for Render/Heroku to get correct IP)
app.set('trust proxy', 1);

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Railway's internal healthchecks hit these paths over HTTP and don't follow
    // 301s, so redirecting would fail the deploy. Let probes through as-is.
    if (['/health', '/ready', '/live'].includes(req.path)) return next();
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
        // Reject by omitting CORS headers (callback(null, false)) rather than
        // throwing — a thrown Error propagates to the error handler and returns
        // a noisy 500. With false, the browser still blocks the cross-origin
        // response, and same-origin/CSRF/auth layers return the proper 401/403.
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// ── PAYMENT WEBHOOKS (must be before JSON body parser AND rate limiter) ──────
// Stripe / Paystack / PayPal all require the raw, unparsed body for signature
// verification, so express.raw() captures it for these paths before json runs.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/paystack', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/paypal', express.raw({ type: 'application/json' }));
// Webhook route registered here so it is exempt from the global rate limiter below.
app.use('/api/webhooks', require('./routes/api/webhooks'));
// ─────────────────────────────────────────────────────────────────────────────

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

// CSRF protection — double-submit cookie pattern.
// Skipped for: safe methods, Bearer-token requests (CSRF doesn't apply),
// signed webhooks, and the unauthenticated auth bootstrap endpoints
// (chicken-and-egg: the CSRF cookie is only issued *after* a successful
// login/register/refresh, so these endpoints can't require it themselves).
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/instructor-apply',
  '/api/auth/verify-email-code',
  '/api/auth/resend-verification',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/2fa/authenticate',
]);
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.headers.authorization) return next(); // Bearer token = CSRF not applicable
  if (req.path.startsWith('/api/webhooks')) return next(); // signed webhooks, no session
  if (CSRF_EXEMPT_PATHS.has(req.path)) return next(); // pre-session auth bootstrap
  if (!CSRF.validateToken(req, req.headers['x-csrf-token'])) {
    logger.warn(`CSRF validation failed: ${req.method} ${req.path} from ${req.ip}`);
    return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
  }
  next();
});

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

// Lightweight health endpoint — returns 200 the moment the process is
// listening. Heavy DB / Redis / disk checks moved to /health/full so a
// long-running boot migration can't drag the healthcheck past Railway's
// 5-minute timeout and bin the whole deployment.
//
// Registered at EVERY common path because Railway / Render / Fly /
// Heroku each default to a different one and the service config might
// be set to any of them.
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};
app.get('/health', healthHandler);
app.get('/healthz', healthHandler);
app.get('/api/health', healthHandler);
app.get('/_health', healthHandler);
app.get('/ping', healthHandler);

// Detailed health (DB + Redis + disk + memory + CPU) — kept for
// monitoring dashboards, no longer the Railway healthcheck target.
app.get('/health/full', async (req, res) => {
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

// Metrics endpoint — accepts either a Prometheus static scrape token or an admin JWT
const { authenticate: _auth, authorize: _authorize } = require('./middleware/auth/authMiddleware');
const _metricsGuard = (req, res, next) => {
  const scrapeToken = process.env.PROMETHEUS_TOKEN;
  const bearer = (req.headers.authorization || '').replace('Bearer ', '');
  if (scrapeToken && bearer === scrapeToken) return next(); // Prometheus scraper
  return _auth(req, res, () => _authorize('admin', 'super_admin')(req, res, next));
};
app.get('/metrics', _metricsGuard, metricsEndpoint);

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
app.use('/api/wishlist',   require('./routes/api/wishlist'));
app.use('/api/bundles',    require('./routes/api/bundles'));
app.use('/api/referrals', require('./routes/api/referrals'));

// Payment routes
app.use('/api/payments', require('./routes/api/payments'));
app.use('/api/coupons',  require('./routes/api/coupons'));

// Discord integration
app.use('/api/discord', require('./routes/api/discord'));

// Instructor routes (requires instructor/admin/super_admin role)
app.use('/api/instructor', require('./routes/api/instructor'));

// Admin routes (requires admin/super_admin role)
app.use('/api/admin/users', require('./routes/api/admin/users'));
app.use('/api/admin/categories', require('./routes/api/admin/categories'));
app.use('/api/admin/stats', require('./routes/api/admin/stats'));
app.use('/api/admin/analytics', require('./routes/api/admin/analytics'));
app.use('/api/admin/instructor-applications', require('./routes/admin/instructorApplicationRoutes'));
app.use('/api/admin/courses', require('./routes/api/admin/courses'));
app.use('/api/admin/coupons', require('./routes/api/admin/coupons'));
app.use('/api/admin/leads', require('./routes/api/admin/leads'));
app.use('/api/admin/bundles', require('./routes/api/admin/bundles'));
app.use('/api/admin/referrals', require('./routes/api/admin/referrals'));
app.use('/api/admin/enrollments', require('./routes/api/admin/enrollments'));
app.use('/api/admin/payments', require('./routes/api/admin/payments'));
app.use('/api/admin/announcements', require('./routes/api/admin/announcements'));

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

    // ── Bind the port NOW so Railway's healthcheck passes immediately.
    // The heavy migrations below (describeTable + ALTER TABLE for
    // ~40 models) used to take 2-5 minutes on cold boot, blowing past
    // Railway's healthcheck timeout and causing every deploy to be
    // rolled back to the previous "Active" build. With the port up
    // first, /health returns 200 in <1s and the deployment promotes
    // immediately; migrations finish in the background.
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server listening on 0.0.0.0:${PORT} — running migrations in background…`);
    });

    // Create missing tables on startup only outside production.
    // In production, schema changes must go through explicit SQL migrations.
    if (process.env.NODE_ENV !== 'production') {
      try {
        logger.info('🔄 Ensuring all tables exist (non-production)...');
        await sequelize.sync({ force: false });
        logger.info('✓ All tables ensured');
      } catch (initSyncErr) {
        logger.warn('⚠ Initial table sync failed (continuing):', initSyncErr.message);
      }
    }

    // Auto-migration: ensure critical columns exist (dialect-agnostic, runs every startup)
    try {
      logger.info('🔄 Running auto-migrations...');
      const qi = sequelize.getQueryInterface();

      for (const table of ['users', 'courses']) {
        const desc = await qi.describeTable(table).catch(() => null);
        if (!desc) continue; // table doesn't exist yet, skip
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
      const coursesDesc = await qi.describeTable('courses').catch(() => null);
      if (coursesDesc && !coursesDesc.prerequisite_course_id) {
        await qi.addColumn('courses', 'prerequisite_course_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
        });
        logger.info('  ✓ Added prerequisite_course_id column to courses');
      }

      // courses: columns introduced by the MySQL-only migration
      // 20251225_update_courses_table.sql (rename difficulty->level, add price)
      // plus the Discord columns. These never applied on Postgres, so their
      // absence 500s the entire public catalog (Course model SELECTs `level`/`price`).
      if (coursesDesc) {
        if (!coursesDesc.level) {
          await qi.addColumn('courses', 'level', {
            type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
            allowNull: true,
            defaultValue: 'beginner',
          });
          // Backfill from the legacy `difficulty` column if it is still present.
          if (coursesDesc.difficulty) {
            await sequelize
              .query('UPDATE courses SET level = difficulty::text::"enum_courses_level" WHERE level IS NULL')
              .catch(() => sequelize
                .query('UPDATE courses SET level = difficulty WHERE level IS NULL')
                .catch(() => {}));
          }
          logger.info('  ✓ Added level column to courses');
        }
        if (!coursesDesc.price) {
          await qi.addColumn('courses', 'price', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
          });
          logger.info('  ✓ Added price column to courses');
        }
        if (!coursesDesc.discord_role_id) {
          await qi.addColumn('courses', 'discord_role_id', { type: Sequelize.STRING(100), allowNull: true, defaultValue: null });
          logger.info('  ✓ Added discord_role_id column to courses');
        }
        if (!coursesDesc.discord_channel_id) {
          await qi.addColumn('courses', 'discord_channel_id', { type: Sequelize.STRING(100), allowNull: true, defaultValue: null });
          logger.info('  ✓ Added discord_channel_id column to courses');
        }
        // Admin can set a course to 'pending'; ensure the enum carries that value.
        // (ALTER TYPE ... ADD VALUE must run outside a transaction; non-fatal.)
        await sequelize
          .query('ALTER TYPE "enum_courses_status" ADD VALUE IF NOT EXISTS \'pending\'')
          .catch(() => {});
      }

      // users: columns introduced by MySQL-only migrations (instructor status,
      // 2FA already in base, referral program, Discord linking, leads). Their
      // absence 500s login — User.findByEmail() SELECTs every model attribute.
      const usersDesc = await qi.describeTable('users').catch(() => null);
      if (usersDesc) {
        const userCols = {
          instructor_status: { type: Sequelize.ENUM('none', 'pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'none' },
          registration_status: { type: Sequelize.ENUM('preview', 'active', 'suspended'), allowNull: false, defaultValue: 'preview' },
          lead_id: { type: Sequelize.INTEGER, allowNull: true, defaultValue: null },
          referral_code: { type: Sequelize.STRING(12), allowNull: true, defaultValue: null },
          referral_credits: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          discord_user_id: { type: Sequelize.STRING(255), allowNull: true, defaultValue: null },
          discord_access_token: { type: Sequelize.STRING(1000), allowNull: true, defaultValue: null },
          email_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          email_verified_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
          login_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        };

        // Grandfather existing users: anyone who has successfully logged in before
        // the email-verification gate shipped is treated as verified. Idempotent —
        // already-verified users are skipped. Without this, the new login gate
        // would lock every existing account (including the seeded admin) on deploy.
        await sequelize.query(
          'UPDATE users SET email_verified = true, email_verified_at = COALESCE(email_verified_at, last_login) WHERE email_verified = false AND last_login IS NOT NULL'
        ).catch((e) => logger.warn(`Verified-user backfill skipped: ${e.message}`));
        for (const [colName, colDef] of Object.entries(userCols)) {
          if (!usersDesc[colName]) {
            await qi.addColumn('users', colName, colDef);
            logger.info(`  ✓ Added ${colName} column to users`);
          }
        }
      }

      // instructor_applications: cv_url + credential_urls were added when the
      // instructor signup was split out into its own multi-step wizard with
      // document uploads. The /api/auth/instructor-apply endpoint writes them.
      const iaDesc = await qi.describeTable('instructor_applications').catch(() => null);
      if (iaDesc) {
        if (!iaDesc.cv_url) {
          await qi.addColumn('instructor_applications', 'cv_url', { type: Sequelize.STRING(500), allowNull: true, defaultValue: null });
          logger.info('  ✓ Added cv_url column to instructor_applications');
        }
        if (!iaDesc.credential_urls) {
          await qi.addColumn('instructor_applications', 'credential_urls', { type: Sequelize.JSON, allowNull: true, defaultValue: [] });
          logger.info('  ✓ Added credential_urls column to instructor_applications');
        }
      }

      // payments: PayPal support from 20260519_add_paypal_to_payments.postgres.sql.
      // If that SQL was never run against Railway, PayPal checkout 500s with
      // `invalid input value for enum ... "paypal"` / missing paypal_* columns.
      const paymentsDesc = await qi.describeTable('payments').catch(() => null);
      if (paymentsDesc) {
        // Snapshot what's there at boot so a recurring /billing 500 is
        // diagnosable from Railway logs alone — compare this list to
        // the Payment model attributes and you'll see the missing one.
        logger.info(`[payments columns at startup] ${Object.keys(paymentsDesc).sort().join(', ')}`);
        // Add 'paypal' to the gateway enum (ALTER TYPE ADD VALUE must be outside
        // a transaction; IF NOT EXISTS makes it idempotent; non-fatal on failure).
        await sequelize
          .query('ALTER TYPE "enum_payments_payment_gateway" ADD VALUE IF NOT EXISTS \'paypal\'')
          .catch(() => {});
        if (!paymentsDesc.paypal_order_id) {
          await qi.addColumn('payments', 'paypal_order_id', { type: Sequelize.STRING, allowNull: true, unique: true });
          logger.info('  ✓ Added paypal_order_id column to payments');
        }
        if (!paymentsDesc.paypal_capture_id) {
          await qi.addColumn('payments', 'paypal_capture_id', { type: Sequelize.STRING, allowNull: true, unique: true });
          logger.info('  ✓ Added paypal_capture_id column to payments');
        }

        // /admin/payments list 500s because the Sequelize model declares many
        // columns added after the table was first created on prod. SELECT *
        // implicit, so one missing column 500s the whole list. Use raw SQL
        // ALTER TABLE ADD COLUMN IF NOT EXISTS — safer than addColumn() for
        // ENUM/JSON types because it avoids Sequelize's type-creation paths
        // that can fail when the enum_type already exists from a partial run.
        const paymentsExtras = [
          ['coupon_code_id',                 'INTEGER'],
          ['original_amount',                'DECIMAL(10,2)'],
          ['discount_amount',                'DECIMAL(10,2) NOT NULL DEFAULT 0'],
          ['stripe_checkout_session_id',     'VARCHAR(255)'],
          ['paystack_reference',             'VARCHAR(255)'],
          ['installment_percentage',         'DECIMAL(5,2)'],
          ['installment_remaining_amount',   'DECIMAL(10,2)'],
          ['installment_due_date',           'TIMESTAMP'],
          ['installment_paid_at',            'TIMESTAMP'],
          ['metadata',                       'JSON'],
        ];
        for (const [colName, colType] of paymentsExtras) {
          if (!paymentsDesc[colName]) {
            try {
              await sequelize.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS ${colName} ${colType}`);
              logger.info(`  ✓ Added ${colName} column to payments`);
            } catch (e) {
              logger.warn(`  ⚠ Could not add ${colName} to payments: ${e.message}`);
            }
          }
        }
        // ENUM columns. Previous DO $$ ... END $$ blocks were getting
        // swallowed silently by the pg driver — column never landed.
        // Switched to plain CREATE TYPE statements (catch only the
        // "already exists" error) followed by an unconditional ALTER
        // TABLE ADD COLUMN IF NOT EXISTS. Idempotent and verbose on
        // failure so we can see what's wrong in Railway logs.
        try {
          await sequelize.query(`CREATE TYPE "enum_payments_payment_plan" AS ENUM ('full', 'installment')`);
          logger.info('  ✓ Created enum_payments_payment_plan type');
        } catch (e) {
          if (!/already exists/i.test(e.message)) {
            logger.warn(`  ⚠ enum_payments_payment_plan create failed: ${e.message}`);
          }
        }
        try {
          await sequelize.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_plan "enum_payments_payment_plan" NOT NULL DEFAULT 'full'`);
          logger.info('  ✓ Added payment_plan column to payments');
        } catch (e) {
          logger.error(`  ⚠ payment_plan ALTER failed: ${e.message}`);
        }

        try {
          await sequelize.query(`CREATE TYPE "enum_payments_installment_status" AS ENUM ('not_applicable', 'pending', 'completed', 'overdue')`);
          logger.info('  ✓ Created enum_payments_installment_status type');
        } catch (e) {
          if (!/already exists/i.test(e.message)) {
            logger.warn(`  ⚠ enum_payments_installment_status create failed: ${e.message}`);
          }
        }
        try {
          await sequelize.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_status "enum_payments_installment_status" NOT NULL DEFAULT 'not_applicable'`);
          logger.info('  ✓ Added installment_status column to payments');
        } catch (e) {
          logger.error(`  ⚠ installment_status ALTER failed: ${e.message}`);
        }

        // Snapshot AFTER all the explicit fixes so we can confirm every
        // column actually landed. If the model declares one this list
        // doesn't have, that's the next thing to add.
        const after = await qi.describeTable('payments').catch(() => null);
        if (after) {
          logger.info(`[payments columns after migration] ${Object.keys(after).sort().join(', ')}`);
        }
      }

      // Add missing columns to module_contents if needed.
      // Sequelize SELECTs every model attribute by default, so any column the
      // model declares that's missing from the DB will 500 every read of this
      // table — including GET /api/courses/:id/modules.
      const moduleContentsDesc = await qi.describeTable('module_contents').catch(() => null);
      if (moduleContentsDesc) {
        const mcMissing = {
          description: { type: Sequelize.TEXT, allowNull: true, defaultValue: null },
          unlock_after_days: { type: Sequelize.INTEGER, allowNull: true, defaultValue: null },
          unlock_date: { type: Sequelize.DATEONLY, allowNull: true, defaultValue: null },
          youtube_url: { type: Sequelize.STRING(500), allowNull: true, defaultValue: null },
          youtube_video_id: { type: Sequelize.STRING(20), allowNull: true, defaultValue: null },
          document_url: { type: Sequelize.STRING(500), allowNull: true, defaultValue: null },
          document_type: { type: Sequelize.STRING(20), allowNull: true, defaultValue: null },
          file_size_mb: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: null },
          article_content: { type: Sequelize.TEXT, allowNull: true, defaultValue: null },
          is_preview: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
        };
        for (const [colName, colDef] of Object.entries(mcMissing)) {
          if (!moduleContentsDesc[colName]) {
            await qi.addColumn('module_contents', colName, colDef);
            logger.info(`  ✓ Added ${colName} column to module_contents`);
          }
        }
      } // end if(moduleContentsDesc)

      // Add updated_at to course_modules if missing
      const courseModulesDesc = await qi.describeTable('course_modules').catch(() => null);
      if (courseModulesDesc && !courseModulesDesc.updated_at) {
        await qi.addColumn('course_modules', 'updated_at', {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
        });
        logger.info('  ✓ Added updated_at column to course_modules');
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

      // Create any missing tables for newer models (safe: no-op if table already exists).
      // The pattern in this project is: lots of tables were added via MySQL-only
      // migrations that never ran on Postgres — anything not in this list will
      // silently 500 the moment a user touches the feature that needs it.
      const {
        ChatRoom, ChatRoomMember, Conversation, Message, MessageReaction, MutedChat,
        LessonNote, LessonQuestion, QuestionReply, CourseAnnouncement,
        InstructorReview, LiveSession, ForumPost, ForumReply,
        Assignment, AssignmentSubmission, AdminAnnouncement,
        CouponCode, CouponCodeCourse, CouponRedemption, Lead,
        EmailVerification, InstructorApplication, CourseInstructor,
        // Tables that were probably created in the original seed but are
        // included here defensively in case any are missing on Railway
        // Postgres — Model.sync({ force:false }) is a no-op if they exist.
        Wishlist, Bundle, BundleCourse, Badge, UserBadge, Referral,
        Notification, ActivityLog, LessonBookmark, ArticleBookmark, Certificate,
        CourseReview, KnowledgeArticle,
        PracticeTestAttempt, PracticeTestQuestion, PracticeTestAnswer,
        AssignedTest, AssignedTestQuestion, TestAssignment,
        AssignedTestAttempt, AssignedTestAnswer,
      } = require('./models');

      const newModels = [
        [EmailVerification, 'email_verifications'],
        // instructor_applications was a MySQL-only migration originally — without
        // this it never gets created on Railway Postgres, and applications
        // disappear silently.
        [InstructorApplication, 'instructor_applications'],
        // course_instructors holds the multi-instructor roster (lead + co + TA).
        [CourseInstructor, 'course_instructors'],
        // Feature tables — each of these has caused or could cause "missing
        // table" 500s if Railway Postgres never had the MySQL migration run.
        [Wishlist, 'wishlist'],
        [Bundle, 'bundles'],
        [BundleCourse, 'bundle_courses'],
        [Badge, 'badges'],
        [UserBadge, 'user_badges'],
        [Referral, 'referrals'],
        [Notification, 'notifications'],
        [ActivityLog, 'activity_logs'],
        [LessonBookmark, 'lesson_bookmarks'],
        [ArticleBookmark, 'article_bookmarks'],
        [Certificate, 'certificates'],
        [CourseReview, 'course_reviews'],
        [KnowledgeArticle, 'knowledge_articles'],
        [PracticeTestAttempt, 'practice_test_attempts'],
        [PracticeTestQuestion, 'practice_test_questions'],
        [PracticeTestAnswer, 'practice_test_answers'],
        [AssignedTest, 'assigned_tests'],
        [AssignedTestQuestion, 'assigned_test_questions'],
        [TestAssignment, 'test_assignments'],
        [AssignedTestAttempt, 'assigned_test_attempts'],
        [AssignedTestAnswer, 'assigned_test_answers'],
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
        [AdminAnnouncement, 'admin_announcements'],
        // Week 4 — payment & leads models
        [CouponCode, 'coupon_codes'],
        [CouponCodeCourse, 'coupon_code_courses'],
        [CouponRedemption, 'coupon_redemptions'],
        [Lead, 'leads'],
      ];

      for (const [Model, tableName] of newModels) {
        try {
          await Model.sync({ force: false });
          logger.info(`  ✓ Ensured table exists: ${tableName}`);
        } catch (tableErr) {
          logger.warn(`  ⚠ Could not ensure ${tableName}: ${tableErr.message}`);
        }
      }

      // Generic safety net — for a curated set of high-traffic tables, look at
      // every column the Sequelize model declares and add any that are missing
      // from the production DB. Sequelize SELECTs every attribute by default,
      // so a single missing column makes the whole table unreadable. Skipped
      // for tables with custom auto-migration above to avoid double work.
      const safetyNetModels = [
        require('./models/Enrollment'),
        require('./models/Notification'),
        require('./models/ActivityLog'),
        require('./models/Certificate'),
        require('./models/CourseReview'),
        require('./models/Wishlist'),
        require('./models/Referral'),
        require('./models/AdminAnnouncement'), // adds attachment_url/_type/_name on prod
        require('./models/Bundle'),            // /bundles save was returning "Database error"
        require('./models/BundleCourse'),
        require('./models/Assignment'),
        require('./models/AssignmentSubmission'),
        require('./models/CourseAnnouncement'),
        // Tests family — recurring 500 source on /api/assigned-tests/my-tests
        // when production drifts behind the model (Sequelize SELECTs every
        // declared column, so one missing column breaks the whole list).
        require('./models/AssignedTest'),
        require('./models/AssignedTestQuestion'),
        require('./models/TestAssignment'),
        require('./models/AssignedTestAttempt'),
        require('./models/AssignedTestAnswer'),
        // /admin/instructor-applications was 500ing with "Failed to load
        // applications" — table created via newModels sync but later-added
        // columns (cv_url, credential_urls, applied_at, reviewed_by, etc.)
        // never materialized on prod.
        require('./models/InstructorApplication'),
        // /admin/payments — model has installment_*, coupon_code_id,
        // original_amount, discount_amount, payment_gateway, paystack_reference,
        // stripe_checkout_session_id, metadata etc. that may be missing on
        // older prod tables. Sequelize SELECTs every declared column.
        require('./models/Payment'),
        // ── Broader sweep — every model with a list endpoint somewhere in the
        // app. If columns drift behind any one of these, that page 500s with
        // "column X does not exist". Cheap on startup (one describeTable each)
        // and idempotent — skips columns that already exist.
        require('./models/User'),
        require('./models/Course'),
        require('./models/Category'),
        require('./models/CourseModule'),
        require('./models/ModuleContent'),
        require('./models/ContentProgress'),
        require('./models/CourseInstructor'),
        require('./models/Lead'),
        require('./models/CouponCode'),
        require('./models/CouponCodeCourse'),
        require('./models/CouponRedemption'),
        require('./models/ChatRoom'),
        require('./models/ChatRoomMember'),
        require('./models/Conversation'),
        require('./models/Message'),
        require('./models/MessageReaction'),
        require('./models/MutedChat'),
        require('./models/LiveSession'),
        require('./models/ForumPost'),
        require('./models/ForumReply'),
        require('./models/InstructorReview'),
        require('./models/KnowledgeArticle'),
        require('./models/LessonNote'),
        require('./models/LessonQuestion'),
        require('./models/QuestionReply'),
        require('./models/LessonBookmark'),
        require('./models/ArticleBookmark'),
        require('./models/QuestionBank'),
        require('./models/PracticeTestAttempt'),
        require('./models/PracticeTestQuestion'),
        require('./models/PracticeTestAnswer'),
        require('./models/Badge'),
        require('./models/UserBadge'),
        require('./models/EmailVerification'),
        require('./models/PasswordReset'),
      ];
      for (const Model of safetyNetModels) {
        try {
          const tableName = Model.tableName || Model.getTableName?.();
          if (!tableName) continue;
          const desc = await qi.describeTable(tableName).catch(() => null);
          if (!desc) continue;
          const attrs = Model.rawAttributes || {};
          for (const [attrName, attrDef] of Object.entries(attrs)) {
            // Skip virtuals and any column that doesn't have an actual type.
            const fieldName = attrDef.field || attrName;
            if (attrDef.type?.constructor?.name === 'VIRTUAL') continue;
            if (desc[fieldName]) continue;
            // Build the column spec from the model's declared attribute,
            // dropping `references` so we don't error out on FK ordering issues.
            const { references, ...colDef } = attrDef;
            try {
              await qi.addColumn(tableName, fieldName, colDef);
              logger.info(`  ✓ Safety-net added column ${fieldName} to ${tableName}`);
            } catch (colErr) {
              logger.warn(`  ⚠ Safety-net could not add ${fieldName} to ${tableName}: ${colErr.message}`);
            }
          }
        } catch (modelErr) {
          logger.warn(`  ⚠ Safety-net error for model: ${modelErr.message}`);
        }
      }

      // Backfill: seed course_instructors from every course's lead instructor.
      // Idempotent — only inserts pairs that aren't already present. This lets
      // existing courses immediately show up under "their instructor's teaching
      // courses" without an admin having to re-assign every row.
      try {
        await sequelize.query(`
          INSERT INTO course_instructors (course_id, user_id, role, assigned_at)
          SELECT c.id, c.instructor_id, 'lead', NOW()
          FROM courses c
          WHERE c.instructor_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM course_instructors ci
              WHERE ci.course_id = c.id AND ci.user_id = c.instructor_id
            )
        `);
      } catch (backfillErr) {
        logger.warn(`course_instructors backfill skipped: ${backfillErr.message}`);
      }

      logger.info('✓ Auto-migrations complete');
    } catch (migrationErr) {
      logger.error('⚠ Auto-migration failed (continuing):', migrationErr.message);
    }

    // Optional schema sync — only in non-production when DB_SYNC_ENABLED=true
    // DB_FORCE_RESET removed: dropping all tables must be done via an explicit
    // migration script run manually, never via an env flag on a running server.
    try {
      if (process.env.NODE_ENV !== 'production' && process.env.DB_SYNC_ENABLED === 'true') {
        logger.info('🔄 Starting database table synchronization (alter only)...');
        await sequelize.sync({ force: false, alter: true });
        logger.info('✓ Database tables synchronized');
      } else if (process.env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        logger.info('✓ Database synchronized (development mode)');
      }
    } catch (syncErr) {
      logger.error('⚠ Database sync encountered an error but server will continue:', syncErr.message);
    }

    // Start drip email scheduler (lead sequence, onboarding, installment reminders)
    try {
      const { startDripScheduler } = require('./services/drip/dripScheduler');
      startDripScheduler();
    } catch (dripErr) {
      logger.error('Failed to start drip scheduler:', dripErr.message);
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
        logger.error(`Session reminder cron error: ${cronErr.message || cronErr.name || 'unknown'}\n${cronErr.stack || ''}`);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

    // server.listen() now fires earlier in startServer (right after model
    // load) so Railway's healthcheck can pass while migrations run in the
    // background. Removed the duplicate listen() that used to live here —
    // calling listen() twice on the same server throws EADDRINUSE on the
    // second call, which is what was crashing every deploy.
    logger.info(`
╔═══════════════════════════════════════════════════════════╗
║   🚀 TekyPro LMS API — all startup tasks complete         ║
║   Port: ${PORT.toString().padEnd(50)}║
║   Environment: ${process.env.NODE_ENV?.padEnd(42) || 'development'.padEnd(42)}║
╚═══════════════════════════════════════════════════════════╝`);
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

// Graceful shutdown helper
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received: starting graceful shutdown`);
  // Stop accepting new connections, wait for in-flight requests to finish
  server.close(async () => {
    try {
      await closeRedis();
      await sequelize.close();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
  // Force-kill if still alive after 15 s (avoid hanging forever)
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 15000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Start the server only when run directly (not when imported by tests)
if (require.main === module) {
  startServer();
}

module.exports = app;
