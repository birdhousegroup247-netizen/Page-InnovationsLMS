/**
 * Activity Controller
 * Handles activity logging and retrieval
 */

const { ActivityLog, User } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');

class ActivityController {
  /**
   * Get all activity logs (Admin only)
   * GET /api/admin/activity-logs
   */
  static async getAllActivityLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, action, entity_type, user_id, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      const where = {};

      // Filter by action
      if (action) {
        where.action = action;
      }

      // Filter by entity type
      if (entity_type) {
        where.entity_type = entity_type;
      }

      // Filter by user
      if (user_id) {
        where.user_id = user_id;
      }

      // Filter by date range
      if (start_date || end_date) {
        where.created_at = {};
        if (start_date) {
          where.created_at[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          where.created_at[Op.lte] = new Date(end_date);
        }
      }

      const { count, rows } = await ActivityLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'role'],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        logs: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activity logs for a specific user (Admin only)
   * GET /api/admin/activity-logs/user/:userId
   */
  static async getUserActivityLogs(req, res, next) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 50, action, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      const where = { user_id: userId };

      // Filter by action
      if (action) {
        where.action = action;
      }

      // Filter by date range
      if (start_date || end_date) {
        where.created_at = {};
        if (start_date) {
          where.created_at[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          where.created_at[Op.lte] = new Date(end_date);
        }
      }

      const { count, rows } = await ActivityLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        logs: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get authenticated user's own activity
   * GET /api/activity/my
   */
  static async getMyActivity(req, res, next) {
    try {
      const { page = 1, limit = 20, action } = req.query;
      const offset = (page - 1) * limit;
      const userId = req.user.id;

      const where = { user_id: userId };

      // Filter by action
      if (action) {
        where.action = action;
      }

      const { count, rows } = await ActivityLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        logs: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activity statistics (Admin only)
   * GET /api/admin/activity-logs/stats
   */
  static async getActivityStats(req, res, next) {
    try {
      const { start_date, end_date } = req.query;

      const where = {};

      // Filter by date range
      if (start_date || end_date) {
        where.created_at = {};
        if (start_date) {
          where.created_at[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          where.created_at[Op.lte] = new Date(end_date);
        }
      }

      // Total activities
      const totalActivities = await ActivityLog.count({ where });

      // Activities by action
      const actionStats = await ActivityLog.findAll({
        where,
        attributes: ['action', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['action'],
        raw: true,
      });

      // Activities by entity type
      const entityStats = await ActivityLog.findAll({
        where,
        attributes: ['entity_type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['entity_type'],
        raw: true,
      });

      // Most active users
      const topUsers = await ActivityLog.findAll({
        where,
        attributes: ['user_id', [sequelize.fn('COUNT', sequelize.col('id')), 'activity_count']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'role'],
          },
        ],
        group: ['user_id', 'user.id'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        subQuery: false,
      });

      return ApiResponse.success(res, {
        total_activities: totalActivities,
        by_action: actionStats,
        by_entity_type: entityStats,
        top_users: topUsers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log an activity (Helper method for internal use)
   * Used by other controllers to log activities
   */
  static async logActivity(data) {
    try {
      const activity = await ActivityLog.create(data);
      logger.info(`Activity logged: ${data.action} by user ${data.user_id || 'system'}`);
      return activity;
    } catch (error) {
      logger.error(`Error logging activity: ${error.message}`);
      // Don't throw error - activity logging should not break main operations
    }
  }

  /**
   * Log activity from request (captures IP and user agent)
   */
  /**
   * GET /api/activity/streak
   * Returns full streak data for the authenticated user:
   * current_streak, longest_streak, weekly_activity (7 booleans Mon-Sun),
   * active_today, streak_at_risk, total_xp, coins
   */
  static async getStreak(req, res, next) {
    try {
      const userId = req.user.id;
      const QUALIFYING = ['content_view', 'lesson_complete', 'test_complete', 'course_enroll', 'login'];

      // Pull all activity dates (UTC) for this user
      const rows = await ActivityLog.findAll({
        where: { user_id: userId, action: { [Op.in]: QUALIFYING } },
        attributes: ['created_at'],
        order: [['created_at', 'DESC']],
        raw: true,
      });

      // ── Unique calendar days (local date string "YYYY-MM-DD") ───────────────
      const toDay = (d) => new Date(d).toISOString().slice(0, 10);
      const uniqueDays = [...new Set(rows.map((r) => toDay(r.created_at)))].sort().reverse();
      // uniqueDays[0] is the most recent active day

      // ── Today / yesterday ──────────────────────────────────────────────────
      const todayStr = toDay(new Date());
      const yesterdayStr = toDay(new Date(Date.now() - 86400000));

      const activeToday = uniqueDays[0] === todayStr;

      // ── Current streak ─────────────────────────────────────────────────────
      let currentStreak = 0;
      if (uniqueDays.length > 0) {
        // Streak is alive if last activity was today or yesterday
        if (uniqueDays[0] === todayStr || uniqueDays[0] === yesterdayStr) {
          currentStreak = 1;
          let prev = uniqueDays[0];
          for (let i = 1; i < uniqueDays.length; i++) {
            const expected = toDay(new Date(new Date(prev).getTime() - 86400000));
            if (uniqueDays[i] === expected) {
              currentStreak++;
              prev = uniqueDays[i];
            } else {
              break;
            }
          }
        }
      }

      // ── Longest streak (scan all days) ─────────────────────────────────────
      let longestStreak = 0;
      let run = 0;
      const asc = [...uniqueDays].reverse(); // oldest first
      for (let i = 0; i < asc.length; i++) {
        if (i === 0) { run = 1; continue; }
        const expected = toDay(new Date(new Date(asc[i - 1]).getTime() + 86400000));
        if (asc[i] === expected) { run++; } else { run = 1; }
        if (run > longestStreak) longestStreak = run;
      }
      if (asc.length > 0 && longestStreak === 0) longestStreak = 1; // single day

      // ── Weekly activity (Mon=0 … Sun=6 for the CURRENT calendar week) ──────
      const now = new Date();
      // Start of the current week (Monday)
      const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0, Sun=6
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);

      const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return uniqueDays.includes(toDay(d));
      });

      // ── XP & coins ─────────────────────────────────────────────────────────
      // 10 XP per streak day, bonus multiplier every 7 days
      const baseXp = uniqueDays.length * 10;
      const streakBonus = Math.floor(currentStreak / 7) * 50;
      const totalXp = baseXp + streakBonus;
      const coins = currentStreak * 10 + Math.floor(currentStreak / 7) * 25;

      // ── Streak at risk: user has not been active today ──────────────────────
      const streakAtRisk = currentStreak > 0 && !activeToday;

      return ApiResponse.success(res, {
        current_streak: currentStreak,
        longest_streak: Math.max(longestStreak, currentStreak),
        active_today: activeToday,
        streak_at_risk: streakAtRisk,
        weekly_activity: weeklyActivity,   // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
        total_active_days: uniqueDays.length,
        total_xp: totalXp,
        coins,
      }, 'Streak data retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async logFromRequest(req, action, entity_type = null, entity_id = null, metadata = null) {
    try {
      const data = {
        user_id: req.user ? req.user.id : null,
        action,
        entity_type,
        entity_id,
        metadata,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
      };

      return await this.logActivity(data);
    } catch (error) {
      logger.error(`Error logging activity from request: ${error.message}`);
    }
  }
}

module.exports = ActivityController;
