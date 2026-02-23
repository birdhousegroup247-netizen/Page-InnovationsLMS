const { Course, User, Category, Enrollment, CourseModule, ModuleContent, ChatRoom, ChatRoomMember } = require('../../models');
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
                    { title: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } },
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
                            literal('(SELECT COUNT(*) FROM course_modules WHERE course_modules.course_id = "Course".id)'),
                            'module_count'
                        ],
                        [
                            literal('(SELECT COUNT(*) FROM module_contents mc INNER JOIN course_modules cm ON mc.module_id = cm.id WHERE cm.course_id = "Course".id)'),
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
                                attributes: ['id', 'title', 'content_type', 'duration_minutes', 'order_index']
                            }
                        ],
                        order: [['order_index', 'ASC']]
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
