const { Course, User, Category, Enrollment, CourseModule, ModuleContent, ChatRoom, ChatRoomMember, CourseInstructor } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const { Op, fn, col, literal } = require('sequelize');

class AdminCoursesController {
    // Get all courses with filters (admin view)
    static async getAllCourses(req, res, next) {
        try {
            const { status, search, instructor_id, category_id, level, dateFrom, dateTo, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

            const where = {};

            if (status && status !== 'all') {
                where.status = status;
            }

            if (instructor_id) {
                where.instructor_id = instructor_id;
            }

            if (category_id) {
                where.category_id = category_id;
            }

            if (level) {
                where.level = level;
            }

            if (search) {
                where[Op.or] = [
                    { title: { [Op.iLike]: `%${search}%` } },
                    { description: { [Op.iLike]: `%${search}%` } },
                ];
            }

            // Date range filtering
            if (dateFrom || dateTo) {
                where.created_at = {};
                if (dateFrom) {
                    where.created_at[Op.gte] = new Date(dateFrom);
                }
                if (dateTo) {
                    // Add 1 day to include the entire day
                    const endDate = new Date(dateTo);
                    endDate.setDate(endDate.getDate() + 1);
                    where.created_at[Op.lt] = endDate;
                }
            }

            const offset = (page - 1) * limit;

            // Validate sortBy to prevent SQL injection
            const allowedSortFields = ['title', 'created_at', 'status', 'price', 'enrollment_count', 'level'];
            const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
            const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const { count, rows } = await Course.findAndCountAll({
                where,
                include: [
                    { model: User, as: 'instructor', attributes: ['id', 'full_name', 'email'] },
                    { model: Category, as: 'category', attributes: ['id', 'name'] },
                ],
                attributes: {
                    include: [
                        [
                            literal('(SELECT COUNT(*) FROM course_modules WHERE course_modules.course_id = "Course"."id")'),
                            'module_count'
                        ],
                        [
                            literal('(SELECT COUNT(*) FROM module_contents mc INNER JOIN course_modules cm ON mc.module_id = cm.id WHERE cm.course_id = "Course"."id")'),
                            'content_count'
                        ]
                    ]
                },
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [[validSortBy, validSortOrder]],
            });

            return ApiResponse.success(res, {
                courses: rows,
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

    // Get course by ID (admin view)
    static async getCourseById(req, res, next) {
        try {
            const { id } = req.params;

            const course = await Course.findByPk(id, {
                include: [
                    { model: User, as: 'instructor', attributes: ['id', 'full_name', 'email', 'profile_picture'] },
                    { model: Category, as: 'category' },
                    {
                        model: require('../../models/CourseModule'),
                        as: 'modules',
                        include: [
                            {
                                model: require('../../models/ModuleContent'),
                                as: 'contents',
                                attributes: ['id', 'title', 'content_type', 'duration_minutes', 'order_index'],
                                separate: true,
                                order: [['order_index', 'ASC']],
                            }
                        ],
                        separate: true,
                        order: [['order_index', 'ASC']],
                    }
                ],
            });

            if (!course) {
                throw new NotFoundError('Course not found');
            }

            // Get enrollment count
            const enrollmentCount = await Enrollment.count({ where: { course_id: id } });

            // Calculate content stats
            const moduleCount = course.modules?.length || 0;
            let contentCount = 0;
            let videoCount = 0;
            let documentCount = 0;
            let articleCount = 0;
            let totalDuration = 0;

            if (course.modules) {
                course.modules.forEach(module => {
                    if (module.contents) {
                        contentCount += module.contents.length;
                        module.contents.forEach(content => {
                            if (content.content_type === 'video') videoCount++;
                            else if (content.content_type === 'document') documentCount++;
                            else if (content.content_type === 'article') articleCount++;

                            if (content.duration_minutes) {
                                totalDuration += content.duration_minutes;
                            }
                        });
                    }
                });
            }

            return ApiResponse.success(res, {
                course,
                stats: {
                    enrollments: enrollmentCount,
                    modules: moduleCount,
                    contents: contentCount,
                    videos: videoCount,
                    documents: documentCount,
                    articles: articleCount,
                    totalDurationMinutes: totalDuration,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // Update course status (approve/reject/archive)
    static async updateCourseStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['published', 'draft', 'archived', 'pending'].includes(status)) {
                throw new BadRequestError('Invalid status');
            }

            const course = await Course.findByPk(id);

            if (!course) {
                throw new NotFoundError('Course not found');
            }

            const oldStatus = course.status;
            await course.update({ status });

            // Auto-create chat room when course is published for the first time
            if (status === 'published' && oldStatus !== 'published') {
                const [chatRoom, created] = await ChatRoom.findOrCreate({
                    where: { course_id: course.id },
                    defaults: { course_id: course.id, is_active: true },
                });

                if (created) {
                    // Auto-approve instructor as a member
                    await ChatRoomMember.create({
                        room_id: chatRoom.id,
                        user_id: course.instructor_id,
                        role: 'instructor',
                        status: 'approved',
                        approved_by: req.user.id,
                        joined_at: new Date(),
                    });

                    // Auto-add pending join requests for already-enrolled students
                    const enrollments = await Enrollment.findAll({
                        where: { course_id: course.id },
                        attributes: ['student_id'],
                    });

                    if (enrollments.length > 0) {
                        const memberRequests = enrollments.map((e) => ({
                            room_id: chatRoom.id,
                            user_id: e.student_id,
                            role: 'student',
                            status: 'pending',
                        }));
                        await ChatRoomMember.bulkCreate(memberRequests, { ignoreDuplicates: true });
                    }

                    logger.info(`Chat room created for course ${course.id} with ${enrollments.length} pending student requests`);
                }
            }

            logger.info(`Course ${id} status updated from ${oldStatus} to ${status} by admin ${req.user.email}`);

            return ApiResponse.success(res, { course }, 'Course status updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get course stats
    static async getCourseStats(req, res, next) {
        try {
            const total = await Course.count();
            const published = await Course.count({ where: { status: 'published' } });
            const draft = await Course.count({ where: { status: 'draft' } });
            const pending = await Course.count({ where: { status: 'pending' } });
            const archived = await Course.count({ where: { status: 'archived' } });

            return ApiResponse.success(res, {
                total,
                published,
                draft,
                pending,
                archived,
            });
        } catch (error) {
            next(error);
        }
    }

    // Bulk update course status
    static async bulkUpdateStatus(req, res, next) {
        try {
            const { courseIds, status } = req.body;

            if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
                throw new BadRequestError('Course IDs array is required');
            }

            if (!['published', 'draft', 'archived', 'pending'].includes(status)) {
                throw new BadRequestError('Invalid status');
            }

            const updated = await Course.update(
                { status },
                { where: { id: courseIds } }
            );

            logger.info(`Bulk updated ${updated[0]} courses to status ${status} by admin ${req.user.email}`);

            return ApiResponse.success(
                res,
                { updatedCount: updated[0] },
                `Successfully updated ${updated[0]} course(s)`
            );
        } catch (error) {
            next(error);
        }
    }

    // Bulk delete courses
    static async bulkDelete(req, res, next) {
        try {
            const { courseIds } = req.body;

            if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
                throw new BadRequestError('Course IDs array is required');
            }

            // Only super admins can delete courses
            if (req.user.role !== 'super_admin') {
                throw new ForbiddenError('Only super admins can delete courses');
            }

            const deleted = await Course.destroy({
                where: { id: courseIds }
            });

            logger.info(`Bulk deleted ${deleted} courses by super admin ${req.user.email}`);

            return ApiResponse.success(
                res,
                { deletedCount: deleted },
                `Successfully deleted ${deleted} course(s)`
            );
        } catch (error) {
            next(error);
        }
    }

    // Assign instructor to course
    static async assignInstructor(req, res, next) {
        try {
            const { id } = req.params;
            const { instructor_id } = req.body;

            if (!instructor_id) {
                throw new BadRequestError('instructor_id is required');
            }

            const course = await Course.findByPk(id);
            if (!course) throw new NotFoundError('Course not found');

            // Validate the instructor exists and has an appropriate role
            const instructor = await User.findOne({
                where: { id: instructor_id, role: ['instructor', 'admin', 'super_admin'] }
            });
            if (!instructor) {
                throw new BadRequestError('User not found or does not have instructor role');
            }

            await course.update({ instructor_id });

            // Mirror into the join table so the full roster query sees this user
            // as 'lead'. If they were already 'co' or 'ta', promote them to lead.
            await CourseInstructor.upsert({
                course_id: course.id,
                user_id: instructor.id,
                role: 'lead',
                assigned_by: req.user.id,
                assigned_at: new Date(),
            }, { conflictFields: ['course_id', 'user_id'] }).catch(async () => {
                // Older Postgres versions or dialects without conflictFields support —
                // fall back to find-or-create then update.
                const [row] = await CourseInstructor.findOrCreate({
                    where: { course_id: course.id, user_id: instructor.id },
                    defaults: { role: 'lead', assigned_by: req.user.id, assigned_at: new Date() },
                });
                if (row.role !== 'lead') await row.update({ role: 'lead', assigned_by: req.user.id });
            });

            logger.info(`Course ${id} lead instructor changed to user ${instructor_id} by admin ${req.user.email}`);

            return ApiResponse.success(res, {
                course: { id: course.id, title: course.title, instructor_id: course.instructor_id },
                instructor: { id: instructor.id, full_name: instructor.full_name, email: instructor.email }
            }, 'Instructor assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * List all instructors assigned to a course (lead + co + TA).
     * GET /api/admin/courses/:id/instructors
     */
    static async listInstructors(req, res, next) {
        try {
            const { id } = req.params;
            const course = await Course.findByPk(id);
            if (!course) throw new NotFoundError('Course not found');

            const rows = await CourseInstructor.findAll({
                where: { course_id: id },
                include: [
                    { model: User, as: 'instructor', attributes: ['id', 'full_name', 'email', 'profile_picture', 'role', 'instructor_status'] },
                    { model: User, as: 'assigner', attributes: ['id', 'full_name', 'email'], required: false },
                ],
                order: [['role', 'ASC'], ['assigned_at', 'ASC']],
            });

            return ApiResponse.success(res, {
                instructors: rows.map((r) => ({
                    id: r.id,
                    user_id: r.user_id,
                    role: r.role,
                    assigned_at: r.assigned_at,
                    assigned_by: r.assigner ? { id: r.assigner.id, full_name: r.assigner.full_name } : null,
                    user: r.instructor,
                })),
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Add an instructor (co or TA) to a course.
     * POST /api/admin/courses/:id/instructors { user_id, role }
     */
    static async addInstructor(req, res, next) {
        try {
            const { id } = req.params;
            const { user_id, role = 'co' } = req.body;
            if (!user_id) throw new BadRequestError('user_id is required');
            if (!['lead', 'co', 'ta'].includes(role)) {
                throw new BadRequestError('role must be one of: lead, co, ta');
            }

            const course = await Course.findByPk(id);
            if (!course) throw new NotFoundError('Course not found');

            const user = await User.findByPk(user_id);
            if (!user) throw new BadRequestError('User not found');
            // Anyone can co-teach — but only users who can actually teach should
            // appear in instructor pickers. Approved instructors, admins, and
            // super-admins are allowed.
            const canTeach = user.role === 'admin' || user.role === 'super_admin'
                || (user.role === 'instructor')
                || user.instructor_status === 'approved';
            if (!canTeach) {
                throw new BadRequestError('User cannot be assigned as instructor — must be an approved instructor or admin');
            }

            // If promoting to lead, demote any prior lead + sync courses.instructor_id
            if (role === 'lead') {
                await CourseInstructor.update(
                    { role: 'co' },
                    { where: { course_id: id, role: 'lead' } }
                );
                await course.update({ instructor_id: user.id });
            }

            const [row, created] = await CourseInstructor.findOrCreate({
                where: { course_id: id, user_id },
                defaults: { role, assigned_by: req.user.id, assigned_at: new Date() },
            });
            if (!created && row.role !== role) {
                await row.update({ role, assigned_by: req.user.id });
            }

            logger.info(`Instructor ${user_id} (${role}) ${created ? 'added to' : 'updated on'} course ${id} by admin ${req.user.email}`);

            return ApiResponse.success(res, {
                instructor: { id: row.id, user_id, role: row.role },
            }, created ? 'Instructor added' : 'Instructor role updated');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Remove an instructor from a course. Refuses to remove the last 'lead'
     * unless another instructor is promoted to lead first.
     * DELETE /api/admin/courses/:id/instructors/:userId
     */
    static async removeInstructor(req, res, next) {
        try {
            const { id, userId } = req.params;
            const row = await CourseInstructor.findOne({ where: { course_id: id, user_id: userId } });
            if (!row) throw new NotFoundError('That instructor is not on this course');

            if (row.role === 'lead') {
                // Don't leave a course leaderless. The admin must pick a new lead first.
                throw new BadRequestError(
                    'Cannot remove the lead instructor. Promote another instructor to lead first.'
                );
            }

            await row.destroy();
            logger.info(`Instructor ${userId} removed from course ${id} by admin ${req.user.email}`);
            return ApiResponse.success(res, null, 'Instructor removed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * List the courses an instructor currently teaches.
     * GET /api/admin/users/:userId/teaching-courses
     */
    static async listInstructorCourses(req, res, next) {
        try {
            const { userId } = req.params;
            const rows = await CourseInstructor.findAll({
                where: { user_id: userId },
                include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'slug', 'status', 'thumbnail_url'] }],
                order: [['assigned_at', 'DESC']],
            });
            return ApiResponse.success(res, {
                courses: rows.filter((r) => r.course).map((r) => ({
                    course: r.course,
                    role: r.role,
                    assigned_at: r.assigned_at,
                })),
            });
        } catch (error) {
            next(error);
        }
    }

    // Bulk update course field (price, category, etc.)
    static async bulkUpdateField(req, res, next) {
        try {
            const { courseIds, field, value } = req.body;

            if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
                throw new BadRequestError('Course IDs array is required');
            }

            // Whitelist allowed fields for bulk update
            const allowedFields = ['price', 'category_id', 'level'];
            if (!allowedFields.includes(field)) {
                throw new BadRequestError(`Field '${field}' cannot be bulk updated`);
            }

            const updateData = { [field]: value };
            const updated = await Course.update(
                updateData,
                { where: { id: courseIds } }
            );

            logger.info(`Bulk updated ${field} for ${updated[0]} courses by admin ${req.user.email}`);

            return ApiResponse.success(
                res,
                { updatedCount: updated[0] },
                `Successfully updated ${updated[0]} course(s)`
            );
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AdminCoursesController;
