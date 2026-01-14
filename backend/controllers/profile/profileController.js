/**
 * Profile Controller
 * Handles user profile management and statistics
 */

const { User, Enrollment, Certificate, AssignedTestAttempt, ContentProgress, ActivityLog } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

class ProfileController {
  /**
   * Get authenticated user's profile
   * GET /api/profile
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return ApiResponse.success(res, { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PUT /api/profile
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { full_name, bio, phone, linkedin_url, github_url, website, location, timezone } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Update allowed fields
      if (full_name) user.full_name = full_name;
      if (bio !== undefined) user.bio = bio;
      if (phone !== undefined) user.phone = phone;
      if (linkedin_url !== undefined) user.linkedin_url = linkedin_url;
      if (github_url !== undefined) user.github_url = github_url;
      if (website !== undefined) user.website = website;
      if (location !== undefined) user.location = location;
      if (timezone !== undefined) user.timezone = timezone;

      await user.save();

      // Remove password from response
      user.password = undefined;

      logger.info(`User ${userId} updated their profile`);

      return ApiResponse.success(res, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update profile picture
   * PUT /api/profile/avatar
   */
  static async updateAvatar(req, res, next) {
    try {
      const userId = req.user.id;
      const { profile_picture } = req.body;

      if (!profile_picture) {
        throw new BadRequestError('Profile picture URL is required');
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.profile_picture = profile_picture;
      await user.save();

      logger.info(`User ${userId} updated their profile picture`);

      return ApiResponse.success(res, { profile_picture }, 'Profile picture updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * PUT /api/profile/password
   */
  static async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        throw new BadRequestError('Current password and new password are required');
      }

      if (new_password.length < 6) {
        throw new BadRequestError('New password must be at least 6 characters');
      }

      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        throw new BadRequestError('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 12);
      user.password = hashedPassword;
      await user.save();

      logger.info(`User ${userId} changed their password`);

      return ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user learning statistics
   * GET /api/profile/stats
   */
  static async getStats(req, res, next) {
    try {
      const userId = req.user.id;
      logger.info(`Fetching stats for user ${userId}`);

      // Enrolled courses count
      let enrolledCoursesCount = 0;
      try {
        enrolledCoursesCount = await Enrollment.count({
          where: { student_id: userId },
        });
        logger.info(`User ${userId} - Enrollments: ${enrolledCoursesCount}`);
      } catch (error) {
        logger.error(`Error fetching enrollments for user ${userId}:`, error.message);
        throw new Error(`Failed to fetch enrollments: ${error.message}`);
      }

      // Completed courses count
      let completedCoursesCount = 0;
      try {
        completedCoursesCount = await Enrollment.count({
          where: {
            student_id: userId,
            completed_at: { [Op.ne]: null },
          },
        });
        logger.info(`User ${userId} - Completed courses: ${completedCoursesCount}`);
      } catch (error) {
        logger.error(`Error fetching completed courses for user ${userId}:`, error.message);
        throw new Error(`Failed to fetch completed courses: ${error.message}`);
      }

      // Certificates earned
      let certificatesCount = 0;
      try {
        certificatesCount = await Certificate.count({
          where: { student_id: userId },
        });
        logger.info(`User ${userId} - Certificates: ${certificatesCount}`);
      } catch (error) {
        logger.error(`Error fetching certificates for user ${userId}:`, error.message);
        throw new Error(`Failed to fetch certificates: ${error.message}`);
      }

      // Tests taken
      let testsTaken = 0;
      try {
        testsTaken = await AssignedTestAttempt.count({
          where: {
            student_id: userId,
            completed_at: { [Op.ne]: null },
          },
        });
        logger.info(`User ${userId} - Tests taken: ${testsTaken}`);
      } catch (error) {
        logger.error(`Error fetching tests for user ${userId}:`, error.message);
        throw new Error(`Failed to fetch tests: ${error.message}`);
      }

      // Average test score
      let averageScore = 0;
      try {
        const testAttempts = await AssignedTestAttempt.findAll({
          where: {
            student_id: userId,
            completed_at: { [Op.ne]: null },
          },
          attributes: ['score'],
        });

        if (testAttempts.length > 0) {
          const totalScore = testAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
          averageScore = (totalScore / testAttempts.length).toFixed(2);
        }
        logger.info(`User ${userId} - Average score: ${averageScore}`);
      } catch (error) {
        logger.error(`Error calculating average score for user ${userId}:`, error.message);
        // Don't throw, just set to 0
      }

      // Content progress count
      let contentProgressCount = 0;
      try {
        contentProgressCount = await ContentProgress.count({
          where: {
            student_id: userId,
            completed: true,
          },
        });
        logger.info(`User ${userId} - Content completed: ${contentProgressCount}`);
      } catch (error) {
        logger.error(`Error fetching content progress for user ${userId}:`, error.message);
        // Don't throw, just set to 0
      }

      // Get enrollments this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      let enrollmentsThisMonth = 0;
      try {
        enrollmentsThisMonth = await Enrollment.count({
          where: {
            student_id: userId,
            enrollment_date: { [Op.gte]: startOfMonth }
          }
        });
      } catch (error) {
        logger.error(`Error fetching monthly enrollments for user ${userId}:`, error.message);
      }

      // Get completed courses this month
      let coursesCompletedThisMonth = 0;
      try {
        coursesCompletedThisMonth = await Enrollment.count({
          where: {
            student_id: userId,
            completed_at: {
              [Op.gte]: startOfMonth,
              [Op.ne]: null
            }
          }
        });
      } catch (error) {
        logger.error(`Error fetching monthly completed courses for user ${userId}:`, error.message);
      }

      // Get certificates this month
      let certificatesThisMonth = 0;
      try {
        certificatesThisMonth = await Certificate.count({
          where: {
            student_id: userId,
            issue_date: { [Op.gte]: startOfMonth }
          }
        });
      } catch (error) {
        logger.error(`Error fetching monthly certificates for user ${userId}:`, error.message);
      }

      // Calculate average progress across all enrollments
      let averageProgress = 0;
      try {
        const enrollments = await Enrollment.findAll({
          where: { student_id: userId },
          attributes: ['progress_percentage']
        });

        if (enrollments.length > 0) {
          const totalProgress = enrollments.reduce((sum, e) => sum + (parseFloat(e.progress_percentage) || 0), 0);
          averageProgress = totalProgress / enrollments.length;
        }
      } catch (error) {
        logger.error(`Error calculating average progress for user ${userId}:`, error.message);
      }

      // Recent activity (last 7 days)
      let recentActivityCount = 0;
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        recentActivityCount = await ActivityLog.count({
          where: {
            user_id: userId,
            created_at: { [Op.gte]: sevenDaysAgo },
          },
        });
      } catch (error) {
        logger.error(`Error fetching activity log for user ${userId}:`, error.message);
        // Don't throw, just set to 0
      }

      // Calculate learning streak (simplified - consecutive days with activity)
      let learningStreak = 0;
      try {
        learningStreak = await ProfileController.calculateLearningStreak(userId);
      } catch (error) {
        logger.error(`Error calculating learning streak for user ${userId}:`, error.message);
        // Don't throw, just set to 0
      }

      logger.info(`Successfully fetched all stats for user ${userId}`);

      return ApiResponse.success(res, {
        // Dashboard fields (frontend expects these)
        total_enrollments: enrolledCoursesCount,
        enrollments_this_month: enrollmentsThisMonth,
        completed_courses: completedCoursesCount,
        courses_completed_this_month: coursesCompletedThisMonth,
        total_certificates: certificatesCount,
        certificates_this_month: certificatesThisMonth,
        average_progress: Math.round(averageProgress),

        // Legacy fields (keep for backwards compatibility)
        courses_enrolled: enrolledCoursesCount,
        courses_completed: completedCoursesCount,
        certificates_earned: certificatesCount,
        tests_taken: testsTaken,
        average_test_score: parseFloat(averageScore),
        content_completed: contentProgressCount,
        recent_activity_count: recentActivityCount,
        learning_streak: learningStreak,
      });
    } catch (error) {
      logger.error(`Error in getStats for user ${req.user?.id}:`, {
        message: error.message,
        stack: error.stack
      });
      next(error);
    }
  }

  /**
   * Get user activity timeline
   * GET /api/profile/activity
   */
  static async getActivity(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await ActivityLog.findAndCountAll({
        where: { user_id: userId },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        activities: rows,
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
   * Get public profile of a user (for instructors, etc.)
   * GET /api/users/:userId/public
   */
  static async getPublicProfile(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: ['id', 'full_name', 'profile_picture', 'bio', 'role', 'linkedin_url', 'github_url', 'website'],
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get instructor stats if user is instructor
      let instructorStats = null;
      if (['instructor', 'admin', 'super_admin'].includes(user.role)) {
        const coursesCount = await require('../../models').Course.count({
          where: { instructor_id: userId, status: 'published' },
        });

        const enrollmentsCount = await require('../../models').Enrollment.count({
          include: [
            {
              model: require('../../models').Course,
              as: 'course',
              where: { instructor_id: userId },
            },
          ],
        });

        instructorStats = {
          courses_published: coursesCount,
          total_students: enrollmentsCount,
        };
      }

      return ApiResponse.success(res, {
        user,
        instructor_stats: instructorStats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Calculate learning streak (consecutive days with activity)
   */
  static async calculateLearningStreak(userId) {
    try {
      // Get all activity dates for the user
      const activities = await ActivityLog.findAll({
        where: {
          user_id: userId,
          action: {
            [Op.in]: ['content_view', 'lesson_complete', 'test_complete', 'course_enroll'],
          },
        },
        attributes: ['created_at'],
        order: [['created_at', 'DESC']],
        raw: true,
      });

      if (activities.length === 0) return 0;

      // Get unique dates
      const uniqueDates = [...new Set(activities.map((a) => new Date(a.created_at).toDateString()))];

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if there's activity today or yesterday
      const lastActivityDate = new Date(uniqueDates[0]);
      lastActivityDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today - lastActivityDate) / (1000 * 60 * 60 * 24));

      if (daysDiff > 1) {
        return 0; // Streak broken
      }

      // Count consecutive days
      let currentDate = new Date(uniqueDates[0]);
      currentDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < uniqueDates.length; i++) {
        const activityDate = new Date(uniqueDates[i]);
        activityDate.setHours(0, 0, 0, 0);

        if (i === 0) {
          streak = 1;
          currentDate = activityDate;
          continue;
        }

        const expectedDate = new Date(currentDate);
        expectedDate.setDate(expectedDate.getDate() - 1);

        if (activityDate.getTime() === expectedDate.getTime()) {
          streak++;
          currentDate = activityDate;
        } else {
          break; // Streak broken
        }
      }

      return streak;
    } catch (error) {
      logger.error(`Error calculating learning streak: ${error.message}`);
      return 0;
    }
  }
}

module.exports = ProfileController;
