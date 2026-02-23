/**
 * Chat Controller
 * Handles course chat rooms and direct messages (DMs)
 * Supports: reply-to, @mention notifications, member management, admin moderation
 */

const { Op, fn, col, literal } = require('sequelize');
const {
  ChatRoom,
  ChatRoomMember,
  Conversation,
  Message,
  MessageReaction,
  MutedChat,
  Notification,
  User,
  Course,
} = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const CloudinaryService = require('../../services/storage/cloudinaryService');
const emailService = require('../../services/email/emailService');
const {
  emitRoomMessage,
  emitRoomMemberUpdate,
  emitRoomDisabled,
  emitDirectMessage,
  emitNotification,
  emitReactionUpdate,
  isUserOnline,
} = require('../../config/socket');

// ─── Shared message include (sender + reply_to + reactions) ──────────────────
const MESSAGE_INCLUDE = [
  {
    model: User,
    as: 'sender',
    attributes: ['id', 'full_name', 'profile_picture', 'role'],
  },
  {
    model: Message,
    as: 'reply_to',
    required: false,
    paranoid: false,
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'full_name', 'profile_picture', 'role'],
        required: false,
      },
    ],
  },
  {
    model: MessageReaction,
    as: 'reactions',
    required: false,
    include: [
      { model: User, as: 'user', attributes: ['id', 'full_name'], required: false },
    ],
  },
];

// ─── Helper: create @mention notifications ────────────────────────────────────
async function notifyMentions({ io, senderId, senderName, mentionIds, context, link, roomId }) {
  if (!mentionIds || mentionIds.length === 0) return;

  const targets = [...new Set(mentionIds.map(Number))].filter((id) => id !== senderId);
  if (targets.length === 0) return;

  // Filter out users who have muted this room
  const muted = roomId
    ? await MutedChat.findAll({ where: { room_id: roomId, user_id: { [Op.in]: targets } }, attributes: ['user_id'] })
    : [];
  const mutedIds = new Set(muted.map((m) => m.user_id));
  const unmuted = targets.filter((id) => !mutedIds.has(id));
  if (unmuted.length === 0) return;

  const notifications = unmuted.map((userId) => ({
    user_id: userId,
    type: 'chat_mention',
    title: `${senderName} mentioned you`,
    message: context,
    link,
    is_read: false,
  }));

  const created = await Notification.bulkCreate(notifications);

  if (io) {
    created.forEach((notif) => emitNotification(io, notif.user_id, notif.toJSON()));
  }

  // Email offline users
  const offlineIds = unmuted.filter((id) => !isUserOnline(id));
  if (offlineIds.length > 0) {
    const users = await User.findAll({ where: { id: { [Op.in]: offlineIds } }, attributes: ['id', 'full_name', 'email'] });
    for (const u of users) {
      emailService.sendChatNotificationEmail(u.email, u.full_name, 'mention', senderName, context).catch(() => {});
    }
  }
}

// ─── Helper: validate reply_to belongs to this context ───────────────────────
async function validateReplyTo(replyToId, contextWhere) {
  if (!replyToId) return null;
  const replied = await Message.findOne({
    where: { id: replyToId, ...contextWhere },
    paranoid: false, // allow reply to deleted messages (renders as placeholder)
  });
  if (!replied) {
    throw new BadRequestError('The message you are replying to was not found in this chat');
  }
  return replied;
}

// ============================================================================
// COURSE CHAT ROOMS
// ============================================================================

class ChatController {
  // Get a course chat room info + approved member list
  static async getRoomByCourse(req, res, next) {
    try {
      const { courseId } = req.params;

      const room = await ChatRoom.findOne({
        where: { course_id: courseId },
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title', 'instructor_id'] },
          {
            model: ChatRoomMember,
            as: 'members',
            where: { status: 'approved' },
            required: false,
            include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'profile_picture', 'role'] }],
          },
        ],
      });

      if (!room) throw new NotFoundError('Chat room not found for this course');
      if (!room.is_active) throw new ForbiddenError('This chat room has been disabled');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      if (!isAdmin) {
        const membership = await ChatRoomMember.findOne({
          where: { room_id: room.id, user_id: req.user.id, status: 'approved' },
        });
        if (!membership) throw new ForbiddenError('You are not an approved member of this chat room');
      }

      return ApiResponse.success(res, { room }, 'Chat room retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Get approved members list (for @mention autocomplete dropdown)
  static async getRoomMembers(req, res, next) {
    try {
      const { roomId } = req.params;

      const room = await ChatRoom.findByPk(roomId);
      if (!room) throw new NotFoundError('Chat room not found');
      if (!room.is_active) throw new ForbiddenError('This chat room has been disabled');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      if (!isAdmin) {
        const membership = await ChatRoomMember.findOne({
          where: { room_id: roomId, user_id: req.user.id, status: 'approved' },
        });
        if (!membership) throw new ForbiddenError('Not a member of this room');
      }

      const members = await ChatRoomMember.findAll({
        where: { room_id: roomId, status: 'approved' },
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'profile_picture', 'role'] }],
        order: [['joined_at', 'ASC']],
      });

      return ApiResponse.success(res, { members: members.map((m) => m.user) }, 'Members retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Get messages in a course chat room (paginated, newest first)
  static async getRoomMessages(req, res, next) {
    try {
      const { roomId } = req.params;
      const { page = 1, limit = 50, before } = req.query;

      const room = await ChatRoom.findByPk(roomId);
      if (!room) throw new NotFoundError('Chat room not found');
      if (!room.is_active) throw new ForbiddenError('This chat room has been disabled');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      if (!isAdmin) {
        const membership = await ChatRoomMember.findOne({
          where: { room_id: roomId, user_id: req.user.id, status: 'approved' },
        });
        if (!membership) throw new ForbiddenError('You are not an approved member of this chat room');
      }

      const where = { room_id: roomId, deleted_at: null };
      if (before) where.id = { [Op.lt]: parseInt(before) };

      const messages = await Message.findAll({
        where,
        include: MESSAGE_INCLUDE,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      return ApiResponse.success(res, { messages: messages.reverse() }, 'Messages retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Send a message to a course chat room
  // Body: { body?, reply_to_id?, mention_ids? } + optional file upload (field: 'attachment')
  static async sendRoomMessage(req, res, next) {
    try {
      const { roomId } = req.params;
      const { body = '', reply_to_id, mention_ids = [] } = req.body;
      const parsedMentionIds = Array.isArray(mention_ids)
        ? mention_ids
        : JSON.parse(mention_ids || '[]');

      if (!body.trim() && !req.file) throw new BadRequestError('Message cannot be empty');

      const room = await ChatRoom.findByPk(roomId);
      if (!room) throw new NotFoundError('Chat room not found');
      if (!room.is_active) throw new ForbiddenError('This chat room has been disabled');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      if (!isAdmin) {
        const membership = await ChatRoomMember.findOne({
          where: { room_id: roomId, user_id: req.user.id, status: 'approved' },
        });
        if (!membership) throw new ForbiddenError('You are not an approved member of this chat room');
      }

      if (reply_to_id) {
        await validateReplyTo(reply_to_id, { room_id: parseInt(roomId) });
      }

      let validMentionIds = [];
      if (parsedMentionIds.length > 0) {
        const approvedMembers = await ChatRoomMember.findAll({
          where: {
            room_id: roomId,
            user_id: { [Op.in]: parsedMentionIds.map(Number) },
            status: 'approved',
          },
          attributes: ['user_id'],
        });
        validMentionIds = approvedMembers.map((m) => m.user_id);
      }

      // Handle attachment upload
      let attachment_url = null;
      let attachment_type = null;
      if (req.file) {
        const isImage = req.file.mimetype.startsWith('image/');
        const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploaded = isImage
          ? await CloudinaryService.uploadImage(b64, 'chat-attachments')
          : await CloudinaryService.uploadDocument(b64, 'chat-attachments');
        attachment_url = uploaded.url;
        attachment_type = isImage ? 'image' : 'document';
      }

      const message = await Message.create({
        sender_id: req.user.id,
        room_id: parseInt(roomId),
        body: body.trim(),
        reply_to_id: reply_to_id || null,
        attachment_url,
        attachment_type,
      });

      const fullMessage = await Message.findByPk(message.id, { include: MESSAGE_INCLUDE });

      const io = req.app.get('io');
      if (io) emitRoomMessage(io, parseInt(roomId), fullMessage);

      await notifyMentions({
        io,
        senderId: req.user.id,
        senderName: req.user.full_name,
        mentionIds: validMentionIds,
        context: body.trim().slice(0, 100),
        link: '/messages',
        roomId: parseInt(roomId),
      });

      logger.info(`Message sent to room ${roomId} by user ${req.user.id}`);
      return ApiResponse.created(res, { message: fullMessage }, 'Message sent');
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // ROOM MEMBERSHIP & APPROVALS
  // ============================================================================

  static async getPendingRequests(req, res, next) {
    try {
      const { roomId } = req.params;

      const room = await ChatRoom.findByPk(roomId, {
        include: [{ model: Course, as: 'course', attributes: ['instructor_id'] }],
      });
      if (!room) throw new NotFoundError('Chat room not found');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const isInstructor = room.course.instructor_id === req.user.id;
      if (!isAdmin && !isInstructor) {
        throw new ForbiddenError('Only the course instructor can manage join requests');
      }

      const requests = await ChatRoomMember.findAll({
        where: { room_id: roomId, status: 'pending' },
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'profile_picture'] }],
        order: [['created_at', 'ASC']],
      });

      return ApiResponse.success(res, { requests }, 'Pending requests retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async handleJoinRequest(req, res, next) {
    try {
      const { roomId, userId } = req.params;
      const { action } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        throw new BadRequestError('Action must be approve or reject');
      }

      const room = await ChatRoom.findByPk(roomId, {
        include: [{ model: Course, as: 'course', attributes: ['instructor_id'] }],
      });
      if (!room) throw new NotFoundError('Chat room not found');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const isInstructor = room.course.instructor_id === req.user.id;
      if (!isAdmin && !isInstructor) {
        throw new ForbiddenError('Only the course instructor can manage join requests');
      }

      const member = await ChatRoomMember.findOne({ where: { room_id: roomId, user_id: userId } });
      if (!member) throw new NotFoundError('Join request not found');

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await member.update({
        status: newStatus,
        approved_by: req.user.id,
        joined_at: action === 'approve' ? new Date() : null,
      });

      const io = req.app.get('io');
      if (io && action === 'approve') {
        emitRoomMemberUpdate(io, parseInt(roomId), 'chat:member_approved', parseInt(userId));
      }

      logger.info(`User ${userId} ${newStatus} for room ${roomId} by ${req.user.id}`);
      return ApiResponse.success(res, { member }, `Request ${newStatus}`);
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req, res, next) {
    try {
      const { roomId, userId } = req.params;

      const room = await ChatRoom.findByPk(roomId, {
        include: [{ model: Course, as: 'course', attributes: ['instructor_id'] }],
      });
      if (!room) throw new NotFoundError('Chat room not found');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const isInstructor = room.course.instructor_id === req.user.id;
      if (!isAdmin && !isInstructor) {
        throw new ForbiddenError('Only the course instructor or admin can remove members');
      }

      const member = await ChatRoomMember.findOne({ where: { room_id: roomId, user_id: userId } });
      if (!member) throw new NotFoundError('Member not found');

      if (member.role === 'instructor') {
        throw new ForbiddenError('Cannot remove the course instructor from the room');
      }

      await member.update({ status: 'banned' });

      const io = req.app.get('io');
      if (io) emitRoomMemberUpdate(io, parseInt(roomId), 'chat:member_removed', parseInt(userId));

      logger.info(`User ${userId} removed from room ${roomId} by ${req.user.id}`);
      return ApiResponse.success(res, {}, 'Member removed');
    } catch (error) {
      next(error);
    }
  }

  static async toggleRoom(req, res, next) {
    try {
      const { roomId } = req.params;

      if (!['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Admin access required');
      }

      const room = await ChatRoom.findByPk(roomId);
      if (!room) throw new NotFoundError('Chat room not found');

      await room.update({ is_active: !room.is_active });

      const state = room.is_active ? 'enabled' : 'disabled';

      const io = req.app.get('io');
      if (io && !room.is_active) emitRoomDisabled(io, parseInt(roomId));

      logger.info(`Chat room ${roomId} ${state} by admin ${req.user.id}`);
      return ApiResponse.success(res, { room }, `Chat room ${state}`);
    } catch (error) {
      next(error);
    }
  }

  static async deleteMessage(req, res, next) {
    try {
      const { messageId } = req.params;

      if (!['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Admin access required');
      }

      const message = await Message.findByPk(messageId);
      if (!message) throw new NotFoundError('Message not found');

      await message.update({ deleted_at: new Date() });

      logger.info(`Message ${messageId} deleted by admin ${req.user.id}`);
      return ApiResponse.success(res, {}, 'Message deleted');
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // DIRECT MESSAGES
  // ============================================================================

  static async getConversations(req, res, next) {
    try {
      const userId = req.user.id;

      const conversations = await Conversation.findAll({
        where: { [Op.or]: [{ user_a: userId }, { user_b: userId }] },
        include: [
          { model: User, as: 'participant_a', attributes: ['id', 'full_name', 'profile_picture', 'role'] },
          { model: User, as: 'participant_b', attributes: ['id', 'full_name', 'profile_picture', 'role'] },
        ],
        order: [['last_message_at', 'DESC']],
      });

      const withUnread = await Promise.all(
        conversations.map(async (conv) => {
          const unread = await Message.count({
            where: {
              conversation_id: conv.id,
              sender_id: { [Op.ne]: userId },
              is_read: false,
              deleted_at: null,
            },
          });
          return { ...conv.toJSON(), unread_count: unread };
        })
      );

      return ApiResponse.success(res, { conversations: withUnread }, 'Conversations retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getOrCreateConversation(req, res, next) {
    try {
      const { recipientId } = req.body;
      const userId = req.user.id;

      if (!recipientId) throw new BadRequestError('recipientId is required');
      if (parseInt(recipientId) === userId) throw new BadRequestError('Cannot message yourself');

      const recipient = await User.findByPk(recipientId, { attributes: ['id', 'full_name'] });
      if (!recipient) throw new NotFoundError('Recipient not found');

      const user_a = Math.min(userId, parseInt(recipientId));
      const user_b = Math.max(userId, parseInt(recipientId));

      const [conversation] = await Conversation.findOrCreate({
        where: { user_a, user_b },
        defaults: { user_a, user_b },
      });

      return ApiResponse.success(res, { conversation }, 'Conversation ready');
    } catch (error) {
      next(error);
    }
  }

  static async getConversationMessages(req, res, next) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50, before } = req.query;
      const userId = req.user.id;

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) throw new NotFoundError('Conversation not found');

      if (conversation.user_a !== userId && conversation.user_b !== userId) {
        throw new ForbiddenError('You are not a participant in this conversation');
      }

      const where = { conversation_id: conversationId, deleted_at: null };
      if (before) where.id = { [Op.lt]: parseInt(before) };

      const messages = await Message.findAll({
        where,
        include: MESSAGE_INCLUDE,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      return ApiResponse.success(res, { messages: messages.reverse() }, 'Messages retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Send a DM
  // Body: { body?, reply_to_id? } + optional file (field: 'attachment')
  static async sendDirectMessage(req, res, next) {
    try {
      const { conversationId } = req.params;
      const { body = '', reply_to_id } = req.body;
      const userId = req.user.id;

      if (!body.trim() && !req.file) throw new BadRequestError('Message cannot be empty');

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) throw new NotFoundError('Conversation not found');

      if (conversation.user_a !== userId && conversation.user_b !== userId) {
        throw new ForbiddenError('You are not a participant in this conversation');
      }

      if (reply_to_id) {
        await validateReplyTo(reply_to_id, { conversation_id: parseInt(conversationId) });
      }

      let attachment_url = null;
      let attachment_type = null;
      if (req.file) {
        const isImage = req.file.mimetype.startsWith('image/');
        const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploaded = isImage
          ? await CloudinaryService.uploadImage(b64, 'chat-attachments')
          : await CloudinaryService.uploadDocument(b64, 'chat-attachments');
        attachment_url = uploaded.url;
        attachment_type = isImage ? 'image' : 'document';
      }

      const message = await Message.create({
        sender_id: userId,
        conversation_id: parseInt(conversationId),
        body: body.trim(),
        reply_to_id: reply_to_id || null,
        attachment_url,
        attachment_type,
      });

      await conversation.update({ last_message_at: new Date() });

      const fullMessage = await Message.findByPk(message.id, { include: MESSAGE_INCLUDE });

      const io = req.app.get('io');
      if (io) emitDirectMessage(io, parseInt(conversationId), fullMessage);

      // Notify recipient if not muted and offline
      const recipientId = conversation.user_a === userId ? conversation.user_b : conversation.user_a;
      const isMuted = await MutedChat.findOne({ where: { user_id: recipientId, conversation_id: parseInt(conversationId) } });
      if (!isMuted && !isUserOnline(recipientId)) {
        const recipient = await User.findByPk(recipientId, { attributes: ['email', 'full_name'] });
        if (recipient) {
          emailService.sendChatNotificationEmail(
            recipient.email, recipient.full_name, 'dm',
            req.user.full_name, body.trim().slice(0, 100)
          ).catch(() => {});
        }
      }

      logger.info(`DM sent in conversation ${conversationId} by user ${userId}`);
      return ApiResponse.created(res, { message: fullMessage }, 'Message sent');
    } catch (error) {
      next(error);
    }
  }

  static async markConversationRead(req, res, next) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) throw new NotFoundError('Conversation not found');

      if (conversation.user_a !== userId && conversation.user_b !== userId) {
        throw new ForbiddenError('You are not a participant in this conversation');
      }

      await Message.update(
        { is_read: true },
        {
          where: {
            conversation_id: conversationId,
            sender_id: { [Op.ne]: userId },
            is_read: false,
          },
        }
      );

      // Notify sender via socket that their messages were read
      const io = req.app.get('io');
      if (io) {
        io.to(`conversation:${conversationId}`).emit('chat:read', {
          conversationId: parseInt(conversationId),
          readBy: userId,
        });
      }

      return ApiResponse.success(res, {}, 'Conversation marked as read');
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // PIN MESSAGES
  // ============================================================================

  static async pinMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      const message = await Message.findByPk(messageId);
      if (!message || message.deleted_at) throw new NotFoundError('Message not found');

      // Only room messages can be pinned; instructor or admin only
      if (!message.room_id) throw new BadRequestError('Only room messages can be pinned');

      const room = await ChatRoom.findByPk(message.room_id, {
        include: [{ model: Course, as: 'course', attributes: ['instructor_id'] }],
      });
      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const isInstructor = room?.course?.instructor_id === req.user.id;
      if (!isAdmin && !isInstructor) throw new ForbiddenError('Only the instructor or admin can pin messages');

      await message.update({ is_pinned: !message.is_pinned });

      const io = req.app.get('io');
      if (io) {
        io.to(`room:${message.room_id}`).emit('chat:pin_update', {
          roomId: message.room_id,
          messageId: parseInt(messageId),
          is_pinned: message.is_pinned,
        });
      }

      return ApiResponse.success(res, { message }, message.is_pinned ? 'Message pinned' : 'Message unpinned');
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // MUTE
  // ============================================================================

  static async toggleMute(req, res, next) {
    try {
      const userId = req.user.id;
      const { roomId, conversationId } = req.body;

      if (!roomId && !conversationId) throw new BadRequestError('roomId or conversationId required');

      const where = roomId
        ? { user_id: userId, room_id: parseInt(roomId) }
        : { user_id: userId, conversation_id: parseInt(conversationId) };

      const existing = await MutedChat.findOne({ where });
      if (existing) {
        await existing.destroy();
        return ApiResponse.success(res, { muted: false }, 'Unmuted');
      }

      await MutedChat.create({ ...where });
      return ApiResponse.success(res, { muted: true }, 'Muted');
    } catch (error) {
      next(error);
    }
  }

  static async getMuteStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const { roomId, conversationId } = req.query;

      const where = roomId
        ? { user_id: userId, room_id: parseInt(roomId) }
        : { user_id: userId, conversation_id: parseInt(conversationId) };

      const muted = await MutedChat.findOne({ where });
      return ApiResponse.success(res, { muted: !!muted }, 'Mute status');
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // ADMIN — all rooms overview
  // ============================================================================

  static async adminGetAllRooms(req, res, next) {
    try {
      if (!['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Admin access required');
      }

      const { page = 1, limit = 20 } = req.query;

      const rooms = await ChatRoom.findAndCountAll({
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title', 'instructor_id'],
            include: [{ model: User, as: 'instructor', attributes: ['id', 'full_name'] }] },
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      // Add member + message counts
      const enriched = await Promise.all(
        rooms.rows.map(async (room) => {
          const [memberCount, messageCount] = await Promise.all([
            ChatRoomMember.count({ where: { room_id: room.id, status: 'approved' } }),
            Message.count({ where: { room_id: room.id, deleted_at: null } }),
          ]);
          return { ...room.toJSON(), member_count: memberCount, message_count: messageCount };
        })
      );

      return ApiResponse.success(res, { rooms: enriched, total: rooms.count }, 'Rooms retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async adminGetRoomMessages(req, res, next) {
    try {
      if (!['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Admin access required');
      }

      const { roomId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const messages = await Message.findAll({
        where: { room_id: roomId },
        include: MESSAGE_INCLUDE,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        paranoid: false,
      });

      return ApiResponse.success(res, { messages: messages.reverse() }, 'Messages retrieved');
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // REACTIONS
  // ============================================================================

  // Toggle a reaction: add if not present, remove if already reacted with same emoji
  static async toggleReaction(req, res, next) {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user.id;

      if (!emoji) throw new BadRequestError('emoji is required');

      const message = await Message.findByPk(messageId);
      if (!message || message.deleted_at) throw new NotFoundError('Message not found');

      // Verify user has access (member of room or participant in conversation)
      if (message.room_id) {
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        if (!isAdmin) {
          const membership = await ChatRoomMember.findOne({
            where: { room_id: message.room_id, user_id: userId, status: 'approved' },
          });
          if (!membership) throw new ForbiddenError('Not a member of this room');
        }
      } else if (message.conversation_id) {
        const conv = await Conversation.findByPk(message.conversation_id);
        if (conv.user_a !== userId && conv.user_b !== userId) {
          throw new ForbiddenError('Not a participant in this conversation');
        }
      }

      const existing = await MessageReaction.findOne({
        where: { message_id: messageId, user_id: userId, emoji },
      });

      let action;
      if (existing) {
        await existing.destroy();
        action = 'removed';
      } else {
        await MessageReaction.create({ message_id: parseInt(messageId), user_id: userId, emoji });
        action = 'added';
      }

      // Return updated reaction list for this message
      const reactions = await MessageReaction.findAll({
        where: { message_id: messageId },
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      });

      const io = req.app.get('io');
      if (io) {
        emitReactionUpdate(io, message, { messageId: parseInt(messageId), reactions });
      }

      return ApiResponse.success(res, { reactions, action }, `Reaction ${action}`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ChatController;
