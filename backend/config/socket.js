/**
 * Socket.IO Configuration
 * Handles realtime communication with authentication
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { User } = require('../models');

/**
 * Initialize Socket.IO server
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
function initializeSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',
        'http://localhost:5173',
        'http://localhost:5174',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get token from handshake auth or query
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        logger.warn('Socket connection rejected: No token provided');
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'full_name', 'email', 'role', 'is_active'],
      });

      if (!user) {
        logger.warn(`Socket connection rejected: User not found - ${decoded.userId}`);
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.is_active) {
        logger.warn(`Socket connection rejected: User inactive - ${user.email}`);
        return next(new Error('Authentication error: User is inactive'));
      }

      // Attach user to socket
      socket.userId = user.id;
      socket.user = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      };

      logger.info(`Socket authenticated: ${user.email} (ID: ${user.id})`);
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.user.email} (Socket ID: ${socket.id})`);

    // Join user-specific room for targeted messages
    socket.join(`user:${socket.userId}`);

    // Join role-based room
    socket.join(`role:${socket.user.role}`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to TekyPro LMS',
      user: socket.user,
    });

    // Handle course room joining
    socket.on('join:course', (courseId) => {
      socket.join(`course:${courseId}`);
      logger.info(`User ${socket.userId} joined course room: ${courseId}`);
      socket.emit('joined:course', { courseId });
    });

    // Handle course room leaving
    socket.on('leave:course', (courseId) => {
      socket.leave(`course:${courseId}`);
      logger.info(`User ${socket.userId} left course room: ${courseId}`);
    });

    // Handle test room joining
    socket.on('join:test', (testId) => {
      socket.join(`test:${testId}`);
      logger.info(`User ${socket.userId} joined test room: ${testId}`);
    });

    // Handle test room leaving
    socket.on('leave:test', (testId) => {
      socket.leave(`test:${testId}`);
      logger.info(`User ${socket.userId} left test room: ${testId}`);
    });

    // Handle lesson question rooms (for Q&A)
    socket.on('join:lesson', (lessonId) => {
      socket.join(`lesson:${lessonId}`);
      logger.info(`User ${socket.userId} joined lesson room: ${lessonId}`);
    });

    socket.on('leave:lesson', (lessonId) => {
      socket.leave(`lesson:${lessonId}`);
      logger.info(`User ${socket.userId} left lesson room: ${lessonId}`);
    });

    // Handle typing indicator for Q&A
    socket.on('typing:start', (data) => {
      socket.to(`lesson:${data.lessonId}`).emit('user:typing', {
        userId: socket.userId,
        userName: socket.user.full_name,
        lessonId: data.lessonId,
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`lesson:${data.lessonId}`).emit('user:stopped_typing', {
        userId: socket.userId,
        lessonId: data.lessonId,
      });
    });

    // Handle notification read status
    socket.on('notification:read', (notificationId) => {
      logger.info(`Notification ${notificationId} marked as read by user ${socket.userId}`);
    });

    // Handle notification read all
    socket.on('notifications:read_all', () => {
      logger.info(`All notifications marked as read by user ${socket.userId}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.user.email} (Reason: ${reason})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  logger.info('✓ Socket.IO server initialized');

  return io;
}

/**
 * Emit notification to specific user
 * @param {Server} io - Socket.IO server instance
 * @param {Number} userId - User ID
 * @param {Object} notification - Notification data
 */
function emitNotification(io, userId, notification) {
  io.to(`user:${userId}`).emit('notification', notification);
  logger.info(`Notification sent to user ${userId}: ${notification.title}`);
}

/**
 * Emit announcement to course participants
 * @param {Server} io - Socket.IO server instance
 * @param {Number} courseId - Course ID
 * @param {Object} announcement - Announcement data
 */
function emitCourseAnnouncement(io, courseId, announcement) {
  io.to(`course:${courseId}`).emit('announcement', announcement);
  logger.info(`Announcement sent to course ${courseId}: ${announcement.title}`);
}

/**
 * Emit new question in lesson
 * @param {Server} io - Socket.IO server instance
 * @param {Number} lessonId - Lesson ID
 * @param {Object} question - Question data
 */
function emitLessonQuestion(io, lessonId, question) {
  io.to(`lesson:${lessonId}`).emit('question:new', question);
  logger.info(`New question in lesson ${lessonId} by user ${question.user_id}`);
}

/**
 * Emit question reply
 * @param {Server} io - Socket.IO server instance
 * @param {Number} lessonId - Lesson ID
 * @param {Object} reply - Reply data
 */
function emitQuestionReply(io, lessonId, reply) {
  io.to(`lesson:${lessonId}`).emit('question:reply', reply);
  logger.info(`Reply to question in lesson ${lessonId} by user ${reply.user_id}`);
}

/**
 * Emit test assignment to user
 * @param {Server} io - Socket.IO server instance
 * @param {Number} userId - User ID
 * @param {Object} testAssignment - Test assignment data
 */
function emitTestAssignment(io, userId, testAssignment) {
  io.to(`user:${userId}`).emit('test:assigned', testAssignment);
  logger.info(`Test assigned to user ${userId}: ${testAssignment.test_name}`);
}

/**
 * Emit certificate issued notification
 * @param {Server} io - Socket.IO server instance
 * @param {Number} userId - User ID
 * @param {Object} certificate - Certificate data
 */
function emitCertificateIssued(io, userId, certificate) {
  io.to(`user:${userId}`).emit('certificate:issued', certificate);
  logger.info(`Certificate issued to user ${userId}: ${certificate.certificate_id}`);
}

/**
 * Emit progress update
 * @param {Server} io - Socket.IO server instance
 * @param {Number} userId - User ID
 * @param {Object} progress - Progress data
 */
function emitProgressUpdate(io, userId, progress) {
  io.to(`user:${userId}`).emit('progress:updated', progress);
  logger.info(`Progress updated for user ${userId} in course ${progress.course_id}`);
}

/**
 * Emit to all users with specific role
 * @param {Server} io - Socket.IO server instance
 * @param {String} role - User role (student, instructor, admin)
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
function emitToRole(io, role, event, data) {
  io.to(`role:${role}`).emit(event, data);
  logger.info(`Event '${event}' sent to role: ${role}`);
}

module.exports = {
  initializeSocketIO,
  emitNotification,
  emitCourseAnnouncement,
  emitLessonQuestion,
  emitQuestionReply,
  emitTestAssignment,
  emitCertificateIssued,
  emitProgressUpdate,
  emitToRole,
};
