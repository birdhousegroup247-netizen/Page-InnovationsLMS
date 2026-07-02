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
  Enrollment,
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

// ─── Course connection helper ─────────────────────────────────────────────────
// Returns true if userA and userB share at least one course (as student↔instructor or classmates)
async function _sharesRoom(userAId, userBId) {
  // Find all rooms where userA is an approved member
  const aMemberships = await ChatRoomMember.findAll({
    where: { user_id: userAId, status: 'approved' },
    attributes: ['room_id'],
  });
  const roomIds = aMemberships.map((m) => m.room_id);
  if (roomIds.length === 0) return false;

  // Check if userB is also an approved member in any of those rooms
  const shared = await ChatRoomMember.count({
    where: { user_id: userBId, room_id: { [Op.in]: roomIds }, status: 'approved' },
  });
  return shared > 0;
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

  // Get all chat rooms the current user belongs to (enrolled courses / taught courses)
  static async getMyRooms(req, res, next) {
    try {
      const userId = req.user.id;
      const role = req.user.role;

      let rooms;

      if (role === 'instructor') {
        rooms = await ChatRoom.findAll({
          where: { is_active: true },
          include: [
            {
              model: Course,
              as: 'course',
              where: { instructor_id: userId },
              attributes: ['id', 'title', 'instructor_id'],
            },
            {
              model: ChatRoomMember,
              as: 'members',
              where: { status: 'approved' },
              required: false,
              include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'profile_picture', 'role'] }],
            },
          ],
        });
      } else {
        const memberships = await ChatRoomMember.findAll({
          where: { user_id: userId, status: 'approved' },
          attributes: ['room_id'],
        });
        const roomIds = memberships.map((m) => m.room_id);
        rooms = roomIds.length > 0
          ? await ChatRoom.findAll({
              where: { id: { [Op.in]: roomIds }, is_active: true },
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
            })
          : [];
      }

      // Per-room unread_count for the WhatsApp-style badge in the room
      // list: messages from others newer than my last visit. Rooms where
      // I have no membership row (instructor overview of own courses)
      // have no watermark and report 0.
      const roomIds2 = rooms.map((r) => r.id);
      const myRows = roomIds2.length
        ? await ChatRoomMember.findAll({
            where: { user_id: userId, room_id: { [Op.in]: roomIds2 } },
            attributes: ['room_id', 'last_seen_at', 'joined_at', 'created_at'],
            raw: true,
          })
        : [];
      const watermark = new Map(myRows.map((m) => [m.room_id, m.last_seen_at || m.joined_at || m.created_at]));
      const roomsOut = await Promise.all(rooms.map(async (room) => {
        const json = room.toJSON();
        if (watermark.has(room.id)) {
          const since = watermark.get(room.id);
          json.unread_count = await Message.count({
            where: {
              room_id: room.id,
              sender_id: { [Op.ne]: userId },
              deleted_at: null,
              ...(since ? { created_at: { [Op.gt]: since } } : {}),
            },
          });
        } else {
          json.unread_count = 0;
        }
        return json;
      }));

      return ApiResponse.success(res, { rooms: roomsOut }, 'Rooms retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Search users for DMs — scoped by role:
  //   admin      → any active student or instructor
  //   instructor → their coursemates (enrolled students + other instructors in
  //                shared rooms) + every admin (so tutors can reach support)
  //   student    → instructors of enrolled courses + classmates from same courses
  static async searchCoursemates(req, res, next) {
    try {
      const userId = req.user.id;
      const role = req.user.role;
      const { q = '' } = req.query;

      const nameFilter = q ? { [Op.or]: [{ full_name: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }] } : {};

      // Admins can message any student or instructor
      if (['admin', 'super_admin'].includes(role)) {
        const users = await User.findAll({
          where: { id: { [Op.ne]: userId }, is_active: true, role: { [Op.in]: ['student', 'instructor'] }, ...nameFilter },
          attributes: ['id', 'full_name', 'email', 'profile_picture', 'role'],
          order: [['full_name', 'ASC']],
          limit: 30,
        });
        return ApiResponse.success(res, { users });
      }

      // Find all rooms where this user is an approved member
      const myMemberships = await ChatRoomMember.findAll({
        where: { user_id: userId, status: 'approved' },
        attributes: ['room_id'],
      });
      const roomIds = myMemberships.map((m) => m.room_id);

      // Find all other approved members in those same rooms
      const roommates = roomIds.length > 0
        ? await ChatRoomMember.findAll({
            where: { room_id: { [Op.in]: roomIds }, user_id: { [Op.ne]: userId }, status: 'approved' },
            attributes: ['user_id'],
          })
        : [];
      const reachableIds = new Set(roommates.map((m) => m.user_id));

      // Instructors can also DM admins/super_admins for support, even though
      // admins don't sit in course chat rooms. Pull their ids in and merge.
      if (role === 'instructor') {
        const admins = await User.findAll({
          where: { is_active: true, role: { [Op.in]: ['admin', 'super_admin'] } },
          attributes: ['id'],
        });
        admins.forEach((a) => reachableIds.add(a.id));
      }

      if (reachableIds.size === 0) return ApiResponse.success(res, { users: [] });

      const users = await User.findAll({
        where: { id: { [Op.in]: [...reachableIds] }, is_active: true, ...nameFilter },
        attributes: ['id', 'full_name', 'email', 'profile_picture', 'role'],
        order: [['full_name', 'ASC']],
        limit: 30,
      });

      return ApiResponse.success(res, { users });
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

      // Surface room membership state per row (room_role, muted_at)
      // alongside the user payload — the instructor menu needs both.
      const payload = members.map((m) => ({
        ...(m.user ? m.user.toJSON() : {}),
        room_role: m.role,
        muted_at: m.muted_at,
        joined_at: m.joined_at,
      }));

      return ApiResponse.success(res, {
        members: payload,
        room: { id: room.id, is_read_only: !!room.is_read_only },
      }, 'Members retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Get messages in a course chat room (paginated, newest first)
  static async getRoomMessages(req, res, next) {
    try {
      const { roomId } = req.params;
      const { page = 1, limit = 50, before } = req.query;

      const room = await ChatRoom.findByPk(roomId, {
        include: [{ model: Course, as: 'course', attributes: ['instructor_id'] }],
      });
      if (!room) throw new NotFoundError('Chat room not found');
      if (!room.is_active) throw new ForbiddenError('This chat room has been disabled');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const isInstructor = room.course && room.course.instructor_id === req.user.id;
      if (!isAdmin) {
        const membership = await ChatRoomMember.findOne({
          where: { room_id: roomId, user_id: req.user.id, status: 'approved' },
        });
        if (!membership) throw new ForbiddenError('You are not an approved member of this chat room');
      }

      const where = { room_id: roomId, deleted_at: null };
      if (before) where.id = { [Op.lt]: parseInt(before) };

      // Hide messages from currently-muted members for non-staff viewers.
      // Instructor/admin still see them so they can review what was sent.
      if (!isAdmin && !isInstructor) {
        const mutedRows = await ChatRoomMember.findAll({
          where: { room_id: roomId, muted_at: { [Op.ne]: null } },
          attributes: ['user_id'],
        });
        const mutedIds = mutedRows.map((m) => m.user_id);
        if (mutedIds.length) where.sender_id = { [Op.notIn]: mutedIds };
      }

      const messages = await Message.findAll({
        where,
        include: MESSAGE_INCLUDE,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      return ApiResponse.success(res, {
        messages: messages.reverse(),
        room: { id: room.id, is_read_only: !!room.is_read_only },
      }, 'Messages retrieved');
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

      const room = await ChatRoom.findByPk(roomId, {
        include: [{ model: Course, as: 'course', attributes: ['instructor_id'] }],
      });
      if (!room) throw new NotFoundError('Chat room not found');
      if (!room.is_active) throw new ForbiddenError('This chat room has been disabled');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const isInstructor = room.course && room.course.instructor_id === req.user.id;

      // Platform-wide chat ban (admin-set, see /api/chat/admin/users/.../
      // suspend-chat). Even admins shouldn't be sending if their own
      // account is suspended; the check is simple and uniform.
      if (req.user.chat_suspended_at) {
        throw new ForbiddenError('Your chat access has been suspended by an admin.');
      }

      // Read-only lock: only instructor + admin can send while it's on.
      if (room.is_read_only && !isAdmin && !isInstructor) {
        throw new ForbiddenError('This room is read-only. Only the instructor can post.');
      }

      if (!isAdmin) {
        const membership = await ChatRoomMember.findOne({
          where: { room_id: roomId, user_id: req.user.id, status: 'approved' },
        });
        if (!membership) throw new ForbiddenError('You are not an approved member of this chat room');
        // Muted users can't post. Their existing messages are also hidden
        // from the room feed for non-staff viewers (see getRoomMessages).
        if (membership.muted_at) {
          throw new ForbiddenError('Your messages in this room are paused pending admin review.');
        }
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

      // Admin can remove anyone including the instructor (super-power).
      // Instructor themselves still can't remove an instructor row.
      if (member.role === 'instructor' && !isAdmin) {
        throw new ForbiddenError('Only an admin can remove the course instructor from the room');
      }

      // Actually delete the row (not status='banned') so the student can
      // rejoin from the course while their enrollment is still valid.
      // Per product spec — "removed but can rejoin if still enrolled".
      await member.destroy();

      const io = req.app.get('io');
      if (io) emitRoomMemberUpdate(io, parseInt(roomId), 'chat:member_removed', parseInt(userId));

      logger.info(`User ${userId} removed from room ${roomId} by ${req.user.id}`);
      return ApiResponse.success(res, {}, 'Member removed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/chat/rooms/:roomId/lock — toggle the read-only lock.
   * Only the course instructor or an admin may toggle it. When locked,
   * non-staff members can read but not send (enforced in sendRoomMessage).
   */
  static async toggleLockRoom(req, res, next) {
    try {
      const { roomId } = req.params;

      const room = await ChatRoom.findByPk(roomId, {
        include: [{ model: Course, as: 'course', attributes: ['instructor_id'] }],
      });
      if (!room) throw new NotFoundError('Chat room not found');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const isInstructor = room.course && room.course.instructor_id === req.user.id;
      if (!isAdmin && !isInstructor) {
        throw new ForbiddenError('Only the course instructor or admin can lock this room');
      }

      await room.update({ is_read_only: !room.is_read_only });
      logger.info(`Chat room ${roomId} ${room.is_read_only ? 'locked (read-only)' : 'unlocked'} by ${req.user.id}`);

      return ApiResponse.success(
        res,
        { room: { id: room.id, is_read_only: room.is_read_only } },
        room.is_read_only ? 'Room locked (read-only)' : 'Room unlocked'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/rooms/:roomId/members/:userId/mute
   * Instructor "reports" the user. Sets muted_at on the member row
   * (their messages disappear from the feed + they can't send) and
   * fires a notification to every admin so they can review.
   * Pass { unmute: true } in the body to clear.
   */
  static async muteMember(req, res, next) {
    try {
      const { roomId, userId } = req.params;
      const { unmute, reason } = req.body || {};

      const room = await ChatRoom.findByPk(roomId, {
        include: [
          { model: Course, as: 'course', attributes: ['id', 'instructor_id', 'title'] },
        ],
      });
      if (!room) throw new NotFoundError('Chat room not found');

      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const isInstructor = room.course && room.course.instructor_id === req.user.id;
      if (!isAdmin && !isInstructor) {
        throw new ForbiddenError('Only the course instructor or admin can report members');
      }

      const member = await ChatRoomMember.findOne({
        where: { room_id: roomId, user_id: userId },
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
      });
      if (!member) throw new NotFoundError('Member not found');
      if (member.role === 'instructor') {
        throw new ForbiddenError('Cannot report the course instructor');
      }

      if (unmute) {
        await member.update({ muted_at: null, muted_by: null });
        logger.info(`User ${userId} unmuted in room ${roomId} by ${req.user.id}`);
        return ApiResponse.success(res, {}, 'Member unmuted');
      }

      await member.update({ muted_at: new Date(), muted_by: req.user.id });

      // Notify every admin so they can review.
      try {
        const NotificationsController = require('../notifications/notificationsController');
        const admins = await User.findAll({
          where: { role: { [Op.in]: ['admin', 'super_admin'] } },
          attributes: ['id'],
        });
        const reporterName = req.user.full_name || `User #${req.user.id}`;
        const targetName = member.user?.full_name || `User #${userId}`;
        const courseTitle = room.course?.title || 'a course';
        await NotificationsController.createBulkNotifications(
          admins.map((a) => ({
            user_id: a.id,
            type: 'chat_report',
            title: 'Chat member reported',
            message: `${reporterName} reported ${targetName} in ${courseTitle}${reason ? `: ${reason}` : ''}`,
            link: `/chat`,
            priority: 'high',
          }))
        );
      } catch (notifyErr) {
        logger.warn('Failed to notify admins of chat report:', notifyErr.message);
      }

      const io = req.app.get('io');
      if (io) emitRoomMemberUpdate(io, parseInt(roomId), 'chat:member_muted', parseInt(userId));

      logger.info(`User ${userId} muted in room ${roomId} by ${req.user.id}`);
      return ApiResponse.success(res, {}, 'Member reported and muted pending admin review');
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
      const senderRole = req.user.role;

      if (!recipientId) throw new BadRequestError('recipientId is required');
      if (parseInt(recipientId) === userId) throw new BadRequestError('Cannot message yourself');

      const recipient = await User.findByPk(recipientId, { attributes: ['id', 'full_name', 'role'] });
      if (!recipient) throw new NotFoundError('Recipient not found');

      // Admins can message anyone; anyone can reply to admin
      const senderIsAdmin = ['admin', 'super_admin'].includes(senderRole);
      const recipientIsAdmin = ['admin', 'super_admin'].includes(recipient.role);

      if (!senderIsAdmin && !recipientIsAdmin) {
        const connected = await _sharesRoom(userId, parseInt(recipientId));
        if (!connected) throw new ForbiddenError('You can only message people you share a course with');
      }

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

      // Platform-wide chat ban check (admin-set).
      if (req.user.chat_suspended_at) {
        throw new ForbiddenError('Your chat access has been suspended by an admin.');
      }

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

      const recipientId = conversation.user_a === userId ? conversation.user_b : conversation.user_a;

      const io = req.app.get('io');
      if (io) emitDirectMessage(io, parseInt(conversationId), fullMessage, recipientId);

      // Notify recipient if not muted and offline
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

  /**
   * GET /api/chat/unread-summary
   * Number-badge data for the sidebar Messages icon.
   *   dm_unread       — sum of every conversation's unread_count for me
   *   mention_unread  — count of room messages where mention_ids
   *                     contains me AND created_at > mentions_seen_at
   *   total           — dm_unread + mention_unread (what the badge shows)
   * Pure read — safe to poll.
   */
  static async getUnreadSummary(req, res, next) {
    try {
      const userId = req.user.id;

      // 1) DM unread — every message in a conversation I'm in, where
      // I'm not the sender and is_read is false. Matches the existing
      // per-conversation unread_count used by getConversations.
      const myConvs = await Conversation.findAll({
        where: { [Op.or]: [{ user_a: userId }, { user_b: userId }] },
        attributes: ['id'],
      });
      const convIds = myConvs.map((c) => c.id);
      const dmUnread = convIds.length
        ? await Message.count({
            where: {
              conversation_id: { [Op.in]: convIds },
              sender_id: { [Op.ne]: userId },
              is_read: false,
              deleted_at: null,
            },
          })
        : 0;

      // 2) Mentions unread — count unread `chat_mention` notification
      // rows for this user. notifyMentions() already creates these
      // whenever a room message @-mentions someone, so this stays in
      // sync without any extra schema.
      const Notification = require('../../models').Notification;
      const mentionUnread = await Notification.count({
        where: { user_id: userId, type: 'chat_mention', is_read: false },
      });

      // 3) Room unread — messages in course rooms I'm an active member
      // of, from someone else, newer than my last visit (last_seen_at;
      // joined_at for rooms I've never opened). Without this, ordinary
      // room messages (no @mention) never badged anyone anywhere.
      const memberships = await ChatRoomMember.findAll({
        where: { user_id: userId, status: 'approved' },
        attributes: ['room_id', 'last_seen_at', 'joined_at', 'created_at'],
        raw: true,
      });
      let roomUnread = 0;
      if (memberships.length) {
        const counts = await Promise.all(memberships.map((m) => {
          const since = m.last_seen_at || m.joined_at || m.created_at;
          return Message.count({
            where: {
              room_id: m.room_id,
              sender_id: { [Op.ne]: userId },
              deleted_at: null,
              ...(since ? { created_at: { [Op.gt]: since } } : {}),
            },
          });
        }));
        roomUnread = counts.reduce((s, n) => s + n, 0);
      }

      return ApiResponse.success(res, {
        dm_unread: dmUnread,
        mention_unread: mentionUnread,
        room_unread: roomUnread,
        total: dmUnread + mentionUnread + roomUnread,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/rooms/:roomId/mark-mentions-seen
   * Bump the user's mentions_seen_at on this room so the badge
   * count drops. Called when they open the room in the chat UI.
   */
  static async markMentionsSeen(req, res, next) {
    try {
      const { roomId } = req.params;
      const member = await ChatRoomMember.findOne({
        where: { room_id: roomId, user_id: req.user.id },
      });
      // last_seen_at doubles as the room-unread watermark for the
      // sidebar/topbar badge — opening the room marks everything read.
      if (member) await member.update({ mentions_seen_at: new Date(), last_seen_at: new Date() });

      // Also flip the linked chat_mention notifications to is_read so
      // the sidebar badge updates immediately. The metadata column on
      // Notification stores roomId — match on that to scope to this
      // room only.
      const Notification = require('../../models').Notification;
      const all = await Notification.findAll({
        where: { user_id: req.user.id, type: 'chat_mention', is_read: false },
      });
      const toMark = all.filter((n) => {
        try {
          const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata;
          return !meta?.roomId || String(meta.roomId) === String(roomId);
        } catch { return true; }
      });
      await Promise.all(toMark.map((n) => n.update({ is_read: true, read_at: new Date() })));

      return ApiResponse.success(res, { cleared: toMark.length }, 'Mentions marked seen');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/admin/users/:userId/suspend-chat
   * Platform-wide chat ban — user can't send any DM or room message.
   * Pass { unsuspend: true } in the body to clear.
   */
  static async adminToggleChatSuspension(req, res, next) {
    try {
      if (!['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Admin access required');
      }
      const { userId } = req.params;
      const { unsuspend, reason } = req.body || {};

      const user = await User.findByPk(userId);
      if (!user) throw new NotFoundError('User not found');

      if (unsuspend) {
        await user.update({ chat_suspended_at: null, chat_suspended_by: null });
        logger.info(`Chat suspension lifted for user ${userId} by admin ${req.user.id}`);
        return ApiResponse.success(res, {}, 'Chat suspension lifted');
      }

      await user.update({ chat_suspended_at: new Date(), chat_suspended_by: req.user.id });
      logger.warn(`User ${userId} chat-suspended platform-wide by admin ${req.user.id}${reason ? `: ${reason}` : ''}`);

      // Notify the suspended user.
      try {
        const NotificationsController = require('../notifications/notificationsController');
        await NotificationsController.createBulkNotifications([{
          user_id: user.id,
          type: 'chat_suspended',
          title: 'Chat access suspended',
          message: 'Your chat access has been suspended by an admin. Contact support if you believe this is in error.',
          link: '/messages',
          priority: 'high',
        }]);
      } catch (notifyErr) {
        logger.warn(`Suspension notification failed: ${notifyErr.message}`);
      }

      return ApiResponse.success(res, {}, 'User chat-suspended platform-wide');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/admin/suspended-users
   * Lists every user with an active chat suspension.
   */
  static async adminGetSuspendedUsers(req, res, next) {
    try {
      if (!['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Admin access required');
      }
      const users = await User.findAll({
        where: { chat_suspended_at: { [Op.ne]: null } },
        attributes: ['id', 'full_name', 'email', 'role', 'profile_picture', 'chat_suspended_at', 'chat_suspended_by'],
        order: [['chat_suspended_at', 'DESC']],
      });
      return ApiResponse.success(res, { users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/admin/reports
   * Pending chat-moderation queue. Every ChatRoomMember row with
   * muted_at set, hydrated with the muted user, course, and the
   * instructor who reported them.
   */
  static async adminGetReports(req, res, next) {
    try {
      if (!['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Admin access required');
      }

      const rows = await ChatRoomMember.findAll({
        where: { muted_at: { [Op.ne]: null } },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'profile_picture'],
          },
          {
            model: ChatRoom,
            as: 'room',
            attributes: ['id', 'course_id'],
            include: [
              { model: Course, as: 'course', attributes: ['id', 'title', 'instructor_id'] },
            ],
          },
        ],
        order: [['muted_at', 'DESC']],
      });

      const reporterIds = [...new Set(rows.map((r) => r.muted_by).filter(Boolean))];
      const reporters = reporterIds.length
        ? await User.findAll({
            where: { id: { [Op.in]: reporterIds } },
            attributes: ['id', 'full_name', 'role'],
          })
        : [];
      const reporterById = Object.fromEntries(reporters.map((u) => [u.id, u]));

      const reports = rows.map((m) => ({
        id: m.id,
        room_id: m.room_id,
        user_id: m.user_id,
        muted_at: m.muted_at,
        muted_by: m.muted_by,
        reporter: m.muted_by ? reporterById[m.muted_by] || null : null,
        user: m.user,
        course: m.room?.course || null,
      }));

      return ApiResponse.success(res, { reports }, 'Reports retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ChatController;
