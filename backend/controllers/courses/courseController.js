const { Course, Category, User, CourseModule, ModuleContent, Enrollment, ContentProgress, ChatRoom, ChatRoomMember } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');
const ActivityController = require('../activity/activityController');
const cache = require('../../utils/cache');

class CourseController {
  // Get all courses (public) with advanced filtering
  static async getAllCourses(req, res, next) {
    try {
      const {
        category,
        difficulty,
        search,
        min_rating,
        max_rating,
        min_duration,
        max_duration,
        instructor_id,
        sort_by = 'created_at',
        sort_order = 'DESC',
        page = 1,
        limit = 12,
      } = req.query;

      // Generate cache key based on query params
      const cacheKey = `courses:${JSON.stringify(req.query)}`;

      // Try to get from cache (5 minute TTL)
      const cachedData = await cache.get('public_courses', cacheKey);
      if (cachedData) {
        logger.debug('Serving courses from cache');
        return ApiResponse.success(res, cachedData);
      }

      const where = { status: 'published' };

      // Category filter
      if (category) where.category_id = category;

      // Difficulty filter
      if (difficulty) where.difficulty = difficulty;

      // Rating filter
      if (min_rating || max_rating) {
        where.average_rating = {};
        if (min_rating) where.average_rating[Op.gte] = parseFloat(min_rating);
        if (max_rating) where.average_rating[Op.lte] = parseFloat(max_rating);
      }

      // Duration filter (in hours)
      if (min_duration || max_duration) {
        where.duration_hours = {};
        if (min_duration) where.duration_hours[Op.gte] = parseInt(min_duration);
        if (max_duration) where.duration_hours[Op.lte] = parseInt(max_duration);
      }

      // Instructor filter
      if (instructor_id) where.instructor_id = instructor_id;

      // Search filter
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      const offset = (page - 1) * limit;

      // Determine sort order
      const validSortFields = ['created_at', 'average_rating', 'enrollment_count', 'title', 'duration_hours'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const { count, rows } = await Course.findAndCountAll({
        where,
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name', 'icon'] },
          { model: User, as: 'instructor', attributes: ['id', 'full_name', 'profile_picture'] },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortField, sortDirection]],
      });

      const responseData = {
        courses: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
        filters: {
          category,
          difficulty,
          min_rating,
          max_rating,
          min_duration,
          max_duration,
          instructor_id,
          search,
          sort_by: sortField,
          sort_order: sortDirection,
        },
      };

      // Store in cache for 5 minutes
      await cache.set('public_courses', cacheKey, responseData, 300);

      return ApiResponse.success(res, responseData);
    } catch (error) {
      next(error);
    }
  }

  // Get course by ID
  static async getCourseById(req, res, next) {
    try {
      const { id } = req.params;

      // Try cache first (shorter TTL for course details)
      const cacheKey = `course:${id}:${req.user?.id || 'guest'}`;
      const cachedCourse = await cache.get('course_details', cacheKey);
      if (cachedCourse) {
        logger.debug(`Serving course ${id} from cache`);
        return ApiResponse.success(res, cachedCourse);
      }

      // Fetch course with full content data (CoursePlayer needs all lessons with URLs)
      const course = await Course.findByPk(id, {
        include: [
          { model: Category, as: 'category' },
          { model: User, as: 'instructor', attributes: ['id', 'full_name', 'profile_picture', 'bio'] },
          {
            model: CourseModule,
            as: 'modules',
            include: [
              {
                model: ModuleContent,
                as: 'contents',
                attributes: ['id', 'title', 'content_type', 'order_index', 'duration_minutes', 'is_preview', 'youtube_url', 'youtube_video_id', 'document_url', 'document_type', 'article_content'],
                separate: true, // Separate query to avoid cartesian product
                order: [['order_index', 'ASC']],
              }
            ],
            order: [['order_index', 'ASC']],
          },
        ],
      });

      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Check if user is enrolled (if authenticated)
      let isEnrolled = false;
      let progress = null;

      if (req.user) {
        const enrollment = await Enrollment.findOne({
          where: { student_id: req.user.id, course_id: id },
        });

        if (enrollment) {
          isEnrolled = true;
          progress = enrollment.progress_percentage;
        }
      }

      const responseData = { course, isEnrolled, progress };

      // Cache for 2 minutes (shorter for logged-in users)
      await cache.set('course_details', cacheKey, responseData, 120);

      return ApiResponse.success(res, responseData);
    } catch (error) {
      next(error);
    }
  }

  // Create course (instructor/admin)
  static async createCourse(req, res, next) {
    try {
      const { title, description, category_id, duration_hours, difficulty, thumbnail, status, price } = req.body;

      // Determine course status - instructors cannot directly publish
      let courseStatus = 'draft';
      if (status === 'pending') {
        courseStatus = 'pending';
      } else if (status === 'published' && ['admin', 'super_admin'].includes(req.user.role)) {
        courseStatus = 'published';
      }

      const course = await Course.create({
        title,
        description,
        category_id,
        instructor_id: req.user.id,
        duration_hours,
        difficulty,
        thumbnail,
        status: courseStatus,
        price: price || 0,
      });

      logger.info(`Course created: ${title} by ${req.user.email}`);

      return ApiResponse.created(res, { course }, 'Course created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Update course
  static async updateCourse(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const course = await Course.findByPk(id);

      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Check if user owns the course or is admin
      if (course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only update your own courses');
      }

      // Instructors cannot set status to 'published' — must go through admin approval
      if (!['admin', 'super_admin'].includes(req.user.role) && updates.status === 'published') {
        throw new ForbiddenError('Only admins can publish courses. Submit for review instead.');
      }

      const wasPublished = course.status !== 'published' && updates.status === 'published';
      await course.update(updates);

      // Auto-create chat room when course is first published
      if (wasPublished) {
        const [room, created] = await ChatRoom.findOrCreate({
          where: { course_id: course.id },
          defaults: { course_id: course.id, is_active: true },
        });
        if (created) {
          // Add instructor as approved member
          await ChatRoomMember.findOrCreate({
            where: { room_id: room.id, user_id: course.instructor_id },
            defaults: { room_id: room.id, user_id: course.instructor_id, role: 'instructor', status: 'approved' },
          });
          logger.info(`Chat room created for course ${course.id}`);
        }
      }

      // Notify enrolled students if course is published
      if (course.status === 'published') {
        const enrollments = await Enrollment.findAll({
          where: { course_id: course.id },
          attributes: ['student_id'],
        });

        if (enrollments.length > 0) {
          const notifications = enrollments.map((enrollment) => ({
            user_id: enrollment.student_id,
            type: 'course_update',
            title: 'Course Updated',
            message: `"${course.title}" has been updated with new content`,
            link: `/courses/${course.id}`,
            priority: 'low',
          }));

          await NotificationsController.createBulkNotifications(notifications);
        }
      }

      logger.info(`Course updated: ${course.title}`);

      return ApiResponse.success(res, { course }, 'Course updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete course
  static async deleteCourse(req, res, next) {
    try {
      const { id } = req.params;

      const course = await Course.findByPk(id);

      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Check ownership
      if (course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only delete your own courses');
      }

      // Soft delete - archive instead
      await course.update({ status: 'archived' });

      logger.info(`Course archived: ${course.title}`);

      return ApiResponse.success(res, null, 'Course deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Enroll in course
  static async enrollCourse(req, res, next) {
    try {
      const { id } = req.params;

      const course = await Course.findByPk(id);

      if (!course) {
        throw new NotFoundError('Course not found');
      }

      if (course.status !== 'published') {
        throw new BadRequestError('Cannot enroll in unpublished course');
      }

      // Check if already enrolled
      const existingEnrollment = await Enrollment.findOne({
        where: { student_id: req.user.id, course_id: id },
      });

      if (existingEnrollment) {
        throw new BadRequestError('Already enrolled in this course');
      }

      const enrollment = await Enrollment.create({
        student_id: req.user.id,
        course_id: id,
      });

      // Auto-join course chat room as approved member on enrollment
      const chatRoom = await ChatRoom.findOne({ where: { course_id: id, is_active: true } });
      if (chatRoom) {
        await ChatRoomMember.findOrCreate({
          where: { room_id: chatRoom.id, user_id: req.user.id },
          defaults: { room_id: chatRoom.id, user_id: req.user.id, role: 'student', status: 'approved' },
        });
      }

      // Update course enrollment count
      await course.increment('enrollment_count');

      // Create notification for student
      await NotificationsController.createNotification({
        user_id: req.user.id,
        type: 'course_enrollment',
        title: 'Course Enrollment Successful',
        message: `You have successfully enrolled in "${course.title}"`,
        link: `/courses/${course.id}`,
        priority: 'normal',
      });

      // Log activity
      await ActivityController.logFromRequest(req, 'course_enroll', 'course', course.id, {
        course_title: course.title,
        course_id: course.id,
      });

      logger.info(`User ${req.user.email} enrolled in course: ${course.title}`);

      return ApiResponse.created(res, { enrollment }, 'Successfully enrolled in course');
    } catch (error) {
      next(error);
    }
  }

  // Get my courses (student)
  static async getMyCourses(req, res, next) {
    try {
      const { status } = req.query;

      const where = { student_id: req.user.id };

      if (status === 'completed') {
        where.completed_at = { [Op.ne]: null };
      } else if (status === 'in_progress') {
        where.completed_at = null;
      }

      const enrollments = await Enrollment.findAll({
        where,
        include: [
          {
            model: Course,
            as: 'course',
            include: [
              { model: Category, as: 'category' },
              { model: User, as: 'instructor', attributes: ['id', 'full_name'] },
            ],
          },
        ],
        order: [['enrollment_date', 'DESC']],
      });

      return ApiResponse.success(res, { courses: enrollments });
    } catch (error) {
      next(error);
    }
  }

  // Get instructor courses
  static async getInstructorCourses(req, res, next) {
    try {
      const courses = await Course.findAll({
        where: { instructor_id: req.user.id },
        include: [
          { model: Category, as: 'category' },
        ],
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, { courses });
    } catch (error) {
      next(error);
    }
  }

  // Get instructor's students (all enrollments across all instructor's courses)
  static async getInstructorStudents(req, res, next) {
    try {
      const { course_id } = req.query;

      // Get instructor's courses
      const courseWhere = { instructor_id: req.user.id };
      if (course_id) {
        courseWhere.id = course_id;
      }

      const instructorCourses = await Course.findAll({
        where: courseWhere,
        attributes: ['id'],
      });

      const courseIds = instructorCourses.map((c) => c.id);

      if (courseIds.length === 0) {
        return ApiResponse.success(res, { students: [] });
      }

      // Get all enrollments for instructor's courses
      const enrollments = await Enrollment.findAll({
        where: { course_id: { [Op.in]: courseIds } },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email', 'avatar_url'],
          },
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title', 'thumbnail_url'],
          },
        ],
        order: [['enrollment_date', 'DESC']],
      });

      return ApiResponse.success(res, { students: enrollments });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CourseController;
