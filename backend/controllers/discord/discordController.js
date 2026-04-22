/**
 * Discord Controller
 * Handles OAuth linking, role management, and enrollment hooks.
 */

const discord = require('../../services/discord/discordService');
const { User, Course, Enrollment, Payment } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const emailService = require('../../services/email/emailService');
const NotificationsController = require('../notifications/notificationsController');

// ─── OAuth Flow ──────────────────────────────────────────────────────────────

/**
 * GET /api/discord/auth
 * Redirect user to Discord OAuth page.
 */
const connectAccount = (req, res) => {
  const { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } = process.env;

  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
    return res.status(503).json({
      success: false,
      message: 'Discord integration is not configured.',
    });
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds.join',
    state: req.user.id.toString(), // pass user ID through OAuth state
  });

  return res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
};

/**
 * GET /api/discord/callback
 * Handle Discord OAuth callback, save Discord ID, add user to server.
 */
const handleCallback = async (req, res) => {
  const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
  const { code, state } = req.query;

  if (!code) {
    return res.redirect(`${FE}/profile?discord=error&reason=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenData = await discord.exchangeCode(code);
    const discordUser = await discord.getDiscordUser(tokenData.access_token);

    // state = user ID passed through OAuth
    const userId = parseInt(state);
    const user = await User.findByPk(userId);
    if (!user) {
      return res.redirect(`${FE}/profile?discord=error&reason=user_not_found`);
    }

    // Save Discord user ID and access token
    await user.update({
      discord_user_id: discordUser.id,
      discord_access_token: tokenData.access_token,
    });

    // Add user to the guild
    try {
      await discord.addMemberToGuild(discordUser.id, tokenData.access_token);
    } catch (joinErr) {
      // 204 = already a member, that's fine
      if (joinErr.response?.status !== 204) {
        logger.warn(`Discord guild join failed for user ${userId}: ${joinErr.message}`);
      }
    }

    // Sync all existing enrollment roles
    await syncUserRolesInternal(userId, discordUser.id);

    logger.info(`User ${user.email} connected Discord account: ${discordUser.username}`);
    return res.redirect(`${FE}/profile?discord=connected`);
  } catch (err) {
    logger.error('Discord callback error:', err.message);
    return res.redirect(`${FE}/profile?discord=error&reason=callback_failed`);
  }
};

/**
 * GET /api/discord/status
 * Return current user's Discord connection status.
 */
const getStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'discord_user_id'],
    });

    let inServer = false;
    if (user.discord_user_id && discord.isConfigured()) {
      const member = await discord.getMember(user.discord_user_id);
      inServer = !!member;
    }

    return ApiResponse.success(res, {
      connected: !!user.discord_user_id,
      discord_user_id: user.discord_user_id || null,
      in_server: inServer,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/discord/disconnect
 * Remove Discord link from user's account.
 */
const disconnect = async (req, res, next) => {
  try {
    await User.update(
      { discord_user_id: null, discord_access_token: null },
      { where: { id: req.user.id } }
    );
    return ApiResponse.success(res, null, 'Discord account disconnected');
  } catch (err) {
    next(err);
  }
};

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Sync all enrollment roles for a user who just connected Discord.
 */
const syncUserRolesInternal = async (userId, discordUserId) => {
  if (!discord.isConfigured()) return;

  try {
    const enrollments = await Enrollment.findAll({
      where: { student_id: userId },
      include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'discord_role_id', 'discord_channel_id'] }],
    });

    for (const enrollment of enrollments) {
      const course = enrollment.course;
      if (!course) continue;

      let roleId = course.discord_role_id;
      let channelId = course.discord_channel_id;

      if (!roleId) {
        roleId = await discord.getOrCreateRole(course.title);
        channelId = await discord.getOrCreateChannel(course.title, roleId);
        await course.update({ discord_role_id: roleId, discord_channel_id: channelId });
      }

      try {
        await discord.assignRole(discordUserId, roleId);
      } catch (e) {
        logger.warn(`Discord role sync failed for user ${userId} course ${course.id}: ${e.message}`);
      }
    }

    // Check interview prep eligibility
    await checkAndAssignInterviewPrep(userId, discordUserId);
  } catch (err) {
    logger.error(`Discord syncUserRoles failed for user ${userId}: ${err.message}`);
  }
};

/**
 * Assign interview prep role if DISCORD_INTERVIEW_PREP_ROLE_ID is set
 * and user has at least one fully-paid enrollment.
 */
const checkAndAssignInterviewPrep = async (userId, discordUserId) => {
  const prepRoleId = process.env.DISCORD_INTERVIEW_PREP_ROLE_ID;
  if (!prepRoleId) return;

  const fullyPaid = await Payment.findOne({
    where: {
      student_id: userId,
      payment_status: 'completed',
      payment_plan: 'full',
    },
  });

  if (fullyPaid) {
    try {
      await discord.assignRole(discordUserId, prepRoleId);
      logger.info(`Discord: assigned interview prep role to user ${userId}`);
    } catch (e) {
      logger.warn(`Discord: interview prep role assign failed for user ${userId}: ${e.message}`);
    }
  }
};

// ─── Enrollment Hook ─────────────────────────────────────────────────────────

/**
 * Called after a student enrolls in a course.
 * Creates role/channel if needed, assigns role, sends invite via email + notification.
 */
const onEnroll = async (userId, courseId, isFullyPaid = false) => {
  if (!discord.isConfigured()) return;

  try {
    const [user, course] = await Promise.all([
      User.findByPk(userId, { attributes: ['id', 'full_name', 'email', 'discord_user_id'] }),
      Course.findByPk(courseId, { attributes: ['id', 'title', 'discord_role_id', 'discord_channel_id'] }),
    ]);

    if (!user || !course) return;

    // Get or create course role and channel
    let roleId = course.discord_role_id;
    let channelId = course.discord_channel_id;

    if (!roleId) {
      roleId = await discord.getOrCreateRole(course.title);
      channelId = await discord.getOrCreateChannel(course.title, roleId);
      await course.update({ discord_role_id: roleId, discord_channel_id: channelId });
    }

    // Generate invite link for the course channel
    let inviteLink = process.env.DISCORD_INVITE_URL || null;
    try {
      inviteLink = await discord.createChannelInvite(channelId);
    } catch (inviteErr) {
      logger.warn(`Discord: invite creation failed for channel ${channelId}: ${inviteErr.message}`);
    }

    // If user has linked their Discord, assign the role
    if (user.discord_user_id) {
      try {
        await discord.assignRole(user.discord_user_id, roleId);
      } catch (roleErr) {
        logger.warn(`Discord: role assign failed for user ${userId}: ${roleErr.message}`);
      }

      // Check interview prep
      if (isFullyPaid) {
        await checkAndAssignInterviewPrep(userId, user.discord_user_id);
      }
    }

    // Send email with Discord invite link
    if (inviteLink) {
      try {
        await emailService.sendDiscordInviteEmail(user.email, user.full_name, {
          courseTitle: course.title,
          inviteLink,
        });
      } catch (emailErr) {
        logger.warn(`Discord: invite email failed for user ${userId}: ${emailErr.message}`);
      }

      // Send in-app notification
      try {
        await NotificationsController.createNotification({
          user_id: userId,
          type: 'discord_invite',
          title: 'Join Your Course Discord Channel',
          message: `Your Discord channel for "${course.title}" is ready. Click to join!`,
          link: inviteLink,
          priority: 'normal',
        });
      } catch (notifErr) {
        logger.warn(`Discord: notification failed for user ${userId}: ${notifErr.message}`);
      }
    }

    logger.info(`Discord: onEnroll processed for user ${userId} course ${courseId}`);
  } catch (err) {
    // Non-blocking — Discord errors should never break enrollment
    logger.error(`Discord onEnroll failed (non-critical): ${err.message}`);
  }
};

// ─── Unenroll / Refund Hook ───────────────────────────────────────────────────

/**
 * Called after a student is unenrolled or refunded from a course.
 * Removes course role. If no other enrollments remain, kicks from server.
 */
const onUnenroll = async (userId, courseId) => {
  if (!discord.isConfigured()) return;

  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'discord_user_id'],
    });

    if (!user?.discord_user_id) return;

    const course = await Course.findByPk(courseId, {
      attributes: ['id', 'discord_role_id'],
    });

    // Remove course role
    if (course?.discord_role_id) {
      try {
        await discord.removeRole(user.discord_user_id, course.discord_role_id);
      } catch (e) {
        logger.warn(`Discord: remove role failed for user ${userId}: ${e.message}`);
      }
    }

    // Check if user has any other active enrollments
    const remainingEnrollments = await Enrollment.count({
      where: { student_id: userId },
    });

    // If no more enrollments, remove from server entirely
    if (remainingEnrollments === 0) {
      try {
        await discord.kickMember(user.discord_user_id);
        logger.info(`Discord: kicked user ${userId} from server (no remaining enrollments)`);
      } catch (e) {
        logger.warn(`Discord: kick failed for user ${userId}: ${e.message}`);
      }
    }

    logger.info(`Discord: onUnenroll processed for user ${userId} course ${courseId}`);
  } catch (err) {
    logger.error(`Discord onUnenroll failed (non-critical): ${err.message}`);
  }
};

// ─── Get course Discord invite ────────────────────────────────────────────────

/**
 * GET /api/discord/course/:courseId/invite
 * Returns the Discord invite link for a course channel (enrolled students only).
 */
const getCourseInvite = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Verify student is enrolled
    const enrollment = await Enrollment.findOne({
      where: { student_id: req.user.id, course_id: courseId },
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    const course = await Course.findByPk(courseId, {
      attributes: ['id', 'title', 'discord_channel_id', 'discord_role_id'],
    });
    if (!course) return ApiResponse.notFound(res, 'Course not found');

    if (!discord.isConfigured()) {
      return res.status(503).json({ success: false, message: 'Discord integration not configured' });
    }

    let channelId = course.discord_channel_id;
    if (!channelId) {
      // Create role+channel on demand
      const roleId = await discord.getOrCreateRole(course.title);
      channelId = await discord.getOrCreateChannel(course.title, roleId);
      await course.update({ discord_role_id: roleId, discord_channel_id: channelId });
    }

    const inviteLink = await discord.createChannelInvite(channelId);
    return ApiResponse.success(res, { invite_url: inviteLink });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Sync a specific user ─────────────────────────────────────────────

/**
 * POST /api/discord/admin/sync/:userId
 * Admin: manually re-sync all Discord roles for a user.
 */
const adminSyncUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, { attributes: ['id', 'discord_user_id'] });

    if (!user) return ApiResponse.notFound(res, 'User not found');
    if (!user.discord_user_id) {
      return res.status(400).json({ success: false, message: 'User has not connected Discord' });
    }

    await syncUserRolesInternal(parseInt(userId), user.discord_user_id);
    return ApiResponse.success(res, null, 'Discord roles synced');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  connectAccount,
  handleCallback,
  getStatus,
  disconnect,
  getCourseInvite,
  adminSyncUser,
  onEnroll,
  onUnenroll,
};
