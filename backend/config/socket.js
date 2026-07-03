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
// Track online user IDs (for presence + email fallback)
const onlineUsers = new Set();

function isUserOnline(userId) {
  return onlineUsers.has(Number(userId));
}

function initializeSocketIO(server) {
  // Same allowlist as the HTTP CORS middleware. This list used to be a
  // separate, shorter one without the production URLs — REST worked in
  // prod while every socket handshake was CORS-rejected, which killed
  // all real-time chat.
  const { allowedOrigins } = require('./allowedOrigins');

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
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
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'full_name', 'email', 'role', 'is_active'],
      });

      if (!user) {
        logger.warn(`Socket connection rejected: User not found - ${decoded.id}`);
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

    // Track presence — only notify admins to avoid leaking user presence to all
    onlineUsers.add(socket.userId);
    io.to('role:admin').to('role:super_admin').emit('presence:online', { userId: socket.userId });

    // Send welcome message — only admins receive the full online user list
    const isAdmin = ['admin', 'super_admin'].includes(socket.user.role);
    socket.emit('connected', {
      message: 'Connected to Page Innovation LMS',
      user: socket.user,
      onlineUsers: isAdmin ? [...onlineUsers] : [],
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

    // -------------------------------------------------------------------------
    // CHAT ROOM events
    // -------------------------------------------------------------------------

    socket.on('join:room', (roomId) => {
      socket.join(`room:${roomId}`);
      logger.info(`User ${socket.userId} joined chat room: ${roomId}`);
      socket.emit('joined:room', { roomId });
    });

    socket.on('leave:room', (roomId) => {
      socket.leave(`room:${roomId}`);
      logger.info(`User ${socket.userId} left chat room: ${roomId}`);
    });

    // -------------------------------------------------------------------------
    // DIRECT MESSAGE events
    // -------------------------------------------------------------------------

    socket.on('join:conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      logger.info(`User ${socket.userId} joined conversation: ${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      logger.info(`User ${socket.userId} left conversation: ${conversationId}`);
    });

    // -------------------------------------------------------------------------
    // TYPING indicators (shared for rooms and DMs)
    // -------------------------------------------------------------------------

    socket.on('chat:typing', ({ roomId, conversationId }) => {
      const target = roomId ? `room:${roomId}` : `conversation:${conversationId}`;
      socket.to(target).emit('user:typing', {
        userId: socket.userId,
        userName: socket.user.full_name,
      });
    });

    socket.on('chat:stop_typing', ({ roomId, conversationId }) => {
      const target = roomId ? `room:${roomId}` : `conversation:${conversationId}`;
      socket.to(target).emit('user:stopped_typing', { userId: socket.userId });
    });

    // Read receipt: client tells us they read a conversation
    socket.on('chat:read', ({ conversationId }) => {
      if (!conversationId) return;
      // Notify the other participant that messages were read
      socket.to(`conversation:${conversationId}`).emit('chat:read', {
        conversationId,
        readBy: socket.userId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      onlineUsers.delete(socket.userId);
      io.to('role:admin').to('role:super_admin').emit('presence:offline', { userId: socket.userId });
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

/**
 * Emit a new chat room message to all members in the room
 * @param {Server} io
 * @param {Number} roomId
 * @param {Object} message
 */
function emitRoomMessage(io, roomId, message) {
  io.to(`room:${roomId}`).emit('chat:message', { message, roomId });

  // Light ping to every member's personal channel so the sidebar/topbar
  // unread badge updates even when they're elsewhere in the app — the
  // room channel above only reaches people with the chat open. No
  // message body: just "something happened in your room, refetch".
  (async () => {
    try {
      const { ChatRoomMember } = require('../models');
      const members = await ChatRoomMember.findAll({
        where: { room_id: roomId, status: 'approved' },
        attributes: ['user_id'],
        raw: true,
      });
      const senderId = message?.sender?.id || message?.sender_id;
      for (const m of members) {
        if (m.user_id === senderId) continue;
        io.to(`user:${m.user_id}`).emit('chat:room_activity', { roomId });
      }
    } catch (err) {
      logger.warn(`room_activity ping failed for room ${roomId}: ${err.message}`);
    }
  })();

  // Also ping each @mentioned user on their personal channel so the
  // sidebar badge / toast can update without them needing to be in the
  // room channel. The `user:${id}` channel is joined on connect so this
  // hits them regardless of which page they're on.
  const mentionIds = Array.isArray(message?.mention_ids)
    ? message.mention_ids
    : (message?.mentions || []).map((m) => m.id || m.user_id).filter(Boolean);
  for (const uid of mentionIds) {
    io.to(`user:${uid}`).emit('chat:mention', {
      roomId,
      messageId: message?.id,
      preview: (message?.body || '').slice(0, 120),
      sender: message?.sender ? { id: message.sender.id, full_name: message.sender.full_name } : null,
    });
  }

  logger.info(`Chat message broadcast to room ${roomId}`);
}

/**
 * Notify room when a member is approved or removed
 * @param {Server} io
 * @param {Number} roomId
 * @param {String} event - 'chat:member_approved' | 'chat:member_removed'
 * @param {Number} userId
 */
function emitRoomMemberUpdate(io, roomId, event, userId) {
  io.to(`room:${roomId}`).emit(event, { roomId, userId });
  logger.info(`${event} emitted to room ${roomId} for user ${userId}`);
}

/**
 * Notify all members of a room that it has been disabled
 * @param {Server} io
 * @param {Number} roomId
 */
function emitRoomDisabled(io, roomId) {
  io.to(`room:${roomId}`).emit('chat:room_disabled', { roomId });
  logger.info(`Room ${roomId} disabled — participants notified`);
}

/**
 * Emit a direct message to both participants in a conversation
 * @param {Server} io
 * @param {Number} conversationId
 * @param {Object} message
 */
function emitDirectMessage(io, conversationId, message, recipientId) {
  io.to(`conversation:${conversationId}`).emit('chat:message', { message, conversationId });

  // Ping the recipient on their personal channel for sidebar badge +
  // toast. We don't ping the sender — they obviously know.
  if (recipientId) {
    io.to(`user:${recipientId}`).emit('chat:new_dm', {
      conversationId,
      messageId: message?.id,
      preview: (message?.body || '').slice(0, 120),
      sender: message?.sender ? { id: message.sender.id, full_name: message.sender.full_name } : null,
    });
  }

  logger.info(`DM broadcast to conversation ${conversationId}`);
}

/**
 * Emit reaction update (add/remove) to room or conversation
 * @param {Server} io
 * @param {Object} message - Message record (has room_id or conversation_id)
 * @param {Object} payload - { messageId, reactions }
 */
function emitReactionUpdate(io, message, payload) {
  const target = message.room_id
    ? `room:${message.room_id}`
    : `conversation:${message.conversation_id}`;
  io.to(target).emit('chat:reaction', payload);
  logger.info(`Reaction update emitted to ${target}`);
}

module.exports = {
  initializeSocketIO,
  isUserOnline,
  emitNotification,
  emitCourseAnnouncement,
  emitLessonQuestion,
  emitQuestionReply,
  emitTestAssignment,
  emitCertificateIssued,
  emitProgressUpdate,
  emitToRole,
  emitRoomMessage,
  emitRoomMemberUpdate,
  emitRoomDisabled,
  emitDirectMessage,
  emitReactionUpdate,
};
