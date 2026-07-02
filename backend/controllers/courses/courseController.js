const { Course, Category, User, CourseModule, ModuleContent, Enrollment, ContentProgress, ChatRoom, ChatRoomMember, Payment, Assignment, Referral, CourseInstructor } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const NotificationsController = require('../notifications/notificationsController');
const ActivityController = require('../activity/activityController');
const cache = require('../../utils/cache');
const emailService = require('../../services/email/emailService');
const BadgesController = require('../badges/badgesController');

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

      // Difficulty filter (maps to 'level' column in DB)
      if (difficulty) where.level = difficulty;

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
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
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
          { model: Course, as: 'prerequisite', attributes: ['id', 'title', 'slug'] },
          {
            model: CourseModule,
            as: 'modules',
            include: [
              {
                model: ModuleContent,
                as: 'contents',
                attributes: ['id', 'title', 'content_type', 'order_index', 'duration_minutes', 'is_preview', 'unlock_date', 'unlock_after_days', 'youtube_url', 'youtube_video_id', 'document_url', 'document_type', 'article_content'],
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

      // Compute drip lock status per content item
      const now = new Date();
      const enrolledAt = isEnrolled
        ? (await Enrollment.findOne({ where: { student_id: req.user?.id, course_id: id } }))?.created_at
        : null;

      if (course.modules) {
        course.modules.forEach((mod) => {
          if (mod.contents) {
            mod.contents.forEach((content) => {
              let dripLocked = false;
              let dripUnlockDate = null;

              if (content.unlock_date) {
                const unlockAt = new Date(content.unlock_date);
                if (unlockAt > now) {
                  dripLocked = true;
                  dripUnlockDate = content.unlock_date;
                }
              } else if (content.unlock_after_days && enrolledAt) {
                const unlockAt = new Date(enrolledAt);
                unlockAt.setDate(unlockAt.getDate() + content.unlock_after_days);
                if (unlockAt > now) {
                  dripLocked = true;
                  dripUnlockDate = unlockAt.toISOString().split('T')[0];
                }
              }

              content.dataValues.is_drip_locked = dripLocked;
              content.dataValues.drip_unlock_date = dripUnlockDate;
            });
          }
        });
      }

      // Pull the full instructor roster (lead + co + TA). Keeps the existing
      // `course.instructor` field intact for any consumer that only knows about
      // the lead — but exposes `instructors` for callers that want everyone.
      const rosterRows = await CourseInstructor.findAll({
        where: { course_id: id },
        include: [{ model: User, as: 'instructor', attributes: ['id', 'full_name', 'profile_picture', 'bio'] }],
        order: [['role', 'ASC'], ['assigned_at', 'ASC']],
      });
      const instructors = rosterRows
        .filter((r) => r.instructor)
        .map((r) => ({
          ...r.instructor.toJSON(),
          role: r.role,
        }));

      // Server-side content gate. The client lock overlay is UI only —
      // without this, the raw JSON handed every video URL and full article
      // body to anyone who opened the network tab. Full access requires
      // owning the course one way or another; everyone else gets lesson
      // metadata (title, type, duration) so the curriculum still renders,
      // but the playable fields are stripped on non-preview lessons.
      const isOwner =
        !!req.user &&
        (req.user.id === course.instructor_id ||
          ['admin', 'super_admin'].includes(req.user.role) ||
          instructors.some((i) => i.id === req.user.id));
      const hasFullAccess = isEnrolled || isOwner;

      if (!hasFullAccess && course.modules) {
        course.modules.forEach((mod) => {
          (mod.contents || []).forEach((content) => {
            if (!content.is_preview) {
              content.dataValues.youtube_url = null;
              content.dataValues.youtube_video_id = null;
              content.dataValues.document_url = null;
              content.dataValues.article_content = null;
            }
          });
        });
      }

      const responseData = { course, instructors, isEnrolled, hasFullAccess, progress };

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
      await ActivityController.logFromRequest(req, 'course_create', 'course', course.id, {
        title: course.title, status: courseStatus,
      }).catch(() => {});

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

        // First-course-published celebration email. Only fires if this
        // is the instructor's first-ever published course.
        try {
          const { Op: PubOp } = require('sequelize');
          const otherPublished = await Course.count({
            where: {
              instructor_id: course.instructor_id,
              status: 'published',
              id: { [PubOp.ne]: course.id },
            },
          });
          if (otherPublished === 0) {
            const instructor = await User.findByPk(course.instructor_id, { attributes: ['email', 'full_name'] });
            if (instructor?.email) {
              const emailSvc = require('../../services/email/emailService');
              emailSvc.sendInstructorFirstCoursePublishedEmail(instructor.email, instructor.full_name, {
                courseTitle: course.title,
                courseId: course.id,
              }).catch((e) => logger.warn(`[first-published-email] ${instructor.email}: ${e.message}`));
            }
          }
        } catch (celebErr) {
          logger.warn(`[first-published-email] check failed: ${celebErr.message}`);
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
      await ActivityController.logFromRequest(
        req,
        wasPublished ? 'course_publish' : 'course_update',
        'course',
        course.id,
        { title: course.title, status: course.status }
      ).catch(() => {});

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
      await ActivityController.logFromRequest(req, 'course_delete', 'course', course.id, {
        title: course.title,
      }).catch(() => {});

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

      // Enforce prerequisite: student must have completed the prerequisite course
      if (course.prerequisite_course_id) {
        const prereqEnrollment = await Enrollment.findOne({
          where: {
            student_id: req.user.id,
            course_id: course.prerequisite_course_id,
            completed_at: { [Op.ne]: null },
          },
        });
        if (!prereqEnrollment) {
          const prereq = await Course.findByPk(course.prerequisite_course_id, { attributes: ['id', 'title'] });
          throw new BadRequestError(
            `You must complete the prerequisite course "${prereq ? prereq.title : 'required course'}" first`
          );
        }
      }

      // Payment gate — if course has a price, verify payment before enrolling
      if (course.price && parseFloat(course.price) > 0) {
        const completedPayment = await Payment.findOne({
          where: {
            student_id: req.user.id,
            course_id: id,
            payment_status: 'completed',
          },
        });

        if (!completedPayment) {
          return res.status(402).json({
            success: false,
            message: 'Payment required to enroll in this course',
            data: {
              course_id: id,
              course_title: course.title,
              price: course.price,
              checkout_url: `/courses/${id}`,
            },
          });
        }
      }

      // Free enrol goes through the same helper as paid enrol + admin
      // comp: a `comp` Payment row + runTransactionalSideEffects for
      // chat / tests / referral / badges / notifications. Wraps in a
      // transaction so we don't end up with an Enrollment row but no
      // ChatRoomMember when a mid-flow step fails.
      const enrollmentSvc = require('../../services/enrollment/enrollmentService');
      let compPayment;
      let enrollment;
      await sequelize.transaction(async (transaction) => {
        compPayment = await Payment.create({
          student_id: req.user.id,
          course_id: id,
          amount: 0,
          intended_amount: 0,
          original_amount: course.price || 0,
          discount_amount: course.price || 0,
          currency: 'USD',
          payment_method: 'comp',
          payment_status: 'completed',
          payment_plan: 'full',
          payment_gateway: 'stripe', // enum needs a value; not exercised
          payment_date: new Date(),
          installment_status: 'not_applicable',
          transaction_id: `FREE-${req.user.id}-${id}-${Date.now()}`,
          metadata: {
            free_course_enrollment: true,
          },
        }, { transaction });

        const { enrollments } = await enrollmentSvc.runTransactionalSideEffects({
          payment: compPayment,
          studentId: req.user.id,
          courseIds: [parseInt(id)],
          transaction,
        });
        enrollment = enrollments[0];
      });

      // Post-commit best-effort side-effects: notification, congrats
      // email, referral reward, badge check. Free enrols skip the
      // receipt/congrats email pair (that's a paid-flow thing) but
      // still get the enrolment notification.
      enrollmentSvc.runPostCommitSideEffects({
        studentId: req.user.id,
        courseIds: [parseInt(id)],
        payment: compPayment,
        gateway: 'free',
        sendEmails: false,
      }).catch((e) => logger.warn(`free-enrol post-commit failed: ${e.message}`));

      // Instructor "new student joined" fanout — separate from the
      // student notification the helper fires. Bulk create dedupes
      // lead + co-instructors + TAs, skips self-enrolment.
      try {
        const recipients = new Set();
        if (course.instructor_id) recipients.add(course.instructor_id);
        const coInstructors = await CourseInstructor.findAll({
          where: { course_id: course.id },
          attributes: ['instructor_id'],
        });
        for (const ci of coInstructors) {
          if (ci.instructor_id) recipients.add(ci.instructor_id);
        }
        recipients.delete(req.user.id);
        if (recipients.size > 0) {
          const studentName = req.user.full_name || 'A new student';
          await NotificationsController.createBulkNotifications(
            Array.from(recipients).map((user_id) => ({
              user_id,
              type: 'new_enrollment',
              title: 'New student enrolled',
              message: `${studentName} just enrolled in "${course.title}".`,
              link: `/instructor/courses/${course.id}/students`,
              priority: 'low',
            }))
          );
        }
      } catch (notifErr) {
        logger.warn(`Enrollment notif to instructor(s) failed: ${notifErr.message}`);
      }

      // Discord: send invite + assign role (non-blocking). isFullyPaid
      // stays false — free enrollment doesn't warrant the paid-course
      // role that some Discord servers gate on.
      try {
        const discordCtrl = require('../discord/discordController');
        discordCtrl.onEnroll(req.user.id, course.id, false).catch(() => {});
      } catch (discordErr) {
        logger.warn(`Discord enroll hook skipped: ${discordErr.message}`);
      }

      await ActivityController.logFromRequest(req, 'course_enroll', 'course', course.id, {
        course_title: course.title,
        course_id: course.id,
        comp_payment_id: compPayment.id,
      });

      // Enrollment confirmation email — still the free-enrol version,
      // not the paid receipt.
      emailService.sendEnrollmentConfirmation(req.user.email, req.user.full_name, course).catch((e) =>
        logger.warn(`Enrollment email failed for ${req.user.email}: ${e.message}`)
      );

      logger.info(`User ${req.user.email} enrolled in course: ${course.title} (comp payment ${compPayment.id})`);

      return ApiResponse.created(res, { enrollment, payment_id: compPayment.id }, 'Successfully enrolled in course');
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

      // Attach total_contents + completed_contents per row so the
      // Dashboard "X of Y lessons" line shows real numbers instead
      // of always 0/0. We do this server-side to avoid the Dashboard
      // doing N round trips. Failures are silent — the % bar still
      // renders from progress_percentage.
      const courseIds = enrollments.map((e) => e.course_id).filter(Boolean);
      let totalByCourse = new Map();
      let completedByPair = new Map(); // key = `${courseId}:${studentId}`
      if (courseIds.length > 0) {
        try {
          // Count lessons per course in one query.
          const counts = await ModuleContent.findAll({
            attributes: [
              [sequelize.col('module.course_id'), 'course_id'],
              [sequelize.fn('COUNT', sequelize.col('ModuleContent.id')), 'total'],
            ],
            include: [{ model: CourseModule, as: 'module', attributes: [], where: { course_id: { [Op.in]: courseIds } } }],
            group: ['module.course_id'],
            raw: true,
          });
          for (const r of counts) totalByCourse.set(parseInt(r.course_id, 10), parseInt(r.total, 10));

          // Count completed lessons per (student, course) in one query.
          const done = await ContentProgress.findAll({
            attributes: [
              [sequelize.col('content.module.course_id'), 'course_id'],
              [sequelize.fn('COUNT', sequelize.col('ContentProgress.id')), 'done'],
            ],
            where: { student_id: req.user.id, completed: true },
            include: [{
              model: ModuleContent,
              as: 'content',
              attributes: [],
              required: true,
              include: [{ model: CourseModule, as: 'module', attributes: [], where: { course_id: { [Op.in]: courseIds } } }],
            }],
            group: ['content.module.course_id'],
            raw: true,
          });
          for (const r of done) completedByPair.set(`${req.user.id}:${parseInt(r.course_id, 10)}`, parseInt(r.done, 10));
        } catch (e) {
          logger.warn(`[getMyCourses] lesson-count enrichment failed: ${e.message}`);
        }
      }

      const shaped = enrollments.map((e) => {
        const plain = e.toJSON();
        plain.total_contents = totalByCourse.get(plain.course_id) || 0;
        plain.completed_contents = completedByPair.get(`${req.user.id}:${plain.course_id}`) || 0;
        return plain;
      });

      return ApiResponse.success(res, { courses: shaped });
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

      // Get all enrollments for instructor's courses. The User model
      // uses `profile_picture`, not `avatar_url` — selecting a
      // non-existent column was throwing 500 here. Course.category_id
      // is included so the frontend picker can scope by category.
      const enrollments = await Enrollment.findAll({
        where: { course_id: { [Op.in]: courseIds } },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email', 'profile_picture'],
          },
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title', 'thumbnail', 'category_id'],
          },
        ],
        order: [['enrollment_date', 'DESC']],
      });

      return ApiResponse.success(res, { students: enrollments });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/courses/:id/clone — deep clone a course
  static async cloneCourse(req, res, next) {
    try {
      const { id } = req.params;

      const original = await Course.findByPk(id, {
        include: [
          {
            model: CourseModule,
            as: 'modules',
            include: [
              {
                model: ModuleContent,
                as: 'contents',
                order: [['order_index', 'ASC']],
              },
            ],
            order: [['order_index', 'ASC']],
          },
        ],
      });

      if (!original) throw new NotFoundError('Course not found');

      // Only instructor who owns it or admin can clone
      if (original.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only clone your own courses');
      }

      // Create new course as draft
      const cloned = await Course.create({
        title: `Copy of ${original.title}`,
        slug: `${original.slug}-copy-${Date.now()}`,
        description: original.description,
        thumbnail: original.thumbnail,
        category_id: original.category_id,
        instructor_id: req.user.id,
        difficulty: original.difficulty,
        duration_hours: original.duration_hours,
        price: original.price,
        status: 'draft',
        prerequisite_course_id: null, // don't clone prerequisites
      });

      // Clone modules and contents
      for (const mod of original.modules || []) {
        const newMod = await CourseModule.create({
          course_id: cloned.id,
          title: mod.title,
          description: mod.description,
          order_index: mod.order_index,
        });

        for (const content of mod.contents || []) {
          const newContent = await ModuleContent.create({
            module_id: newMod.id,
            title: content.title,
            description: content.description,
            content_type: content.content_type,
            youtube_url: content.youtube_url,
            youtube_video_id: content.youtube_video_id,
            document_url: content.document_url,
            document_type: content.document_type,
            file_size_mb: content.file_size_mb,
            article_content: content.article_content,
            order_index: content.order_index,
            duration_minutes: content.duration_minutes,
            is_preview: content.is_preview,
            unlock_date: null, // don't copy drip schedule — instructor can reset
            unlock_after_days: content.unlock_after_days,
          });

          // Clone assignments attached to this content
          const assignments = await Assignment.findAll({ where: { content_id: content.id } });
          for (const a of assignments) {
            await Assignment.create({
              course_id: cloned.id,
              content_id: newContent.id,
              created_by: req.user.id,
              title: a.title,
              description: a.description,
              due_date: null, // don't copy due dates
              max_score: a.max_score,
              allow_file_upload: a.allow_file_upload,
              allow_text_submission: a.allow_text_submission,
            });
          }
        }
      }

      logger.info(`Course cloned: ${original.title} → ${cloned.title} by ${req.user.email}`);

      return ApiResponse.created(res, { course: cloned }, 'Course cloned successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CourseController;
