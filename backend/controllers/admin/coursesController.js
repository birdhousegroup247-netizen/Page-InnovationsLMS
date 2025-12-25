const { Course, User, Category, Enrollment } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');

class AdminCoursesController {
    // Get all courses with filters (admin view)
    static async getAllCourses(req, res, next) {
        try {
            const { status, search, instructor_id, category_id, page = 1, limit = 20 } = req.query;

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

            if (search) {
                where[Op.or] = [
                    { title: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } },
                ];
            }

            const offset = (page - 1) * limit;

            const { count, rows } = await Course.findAndCountAll({
                where,
                include: [
                    { model: User, as: 'instructor', attributes: ['id', 'full_name', 'email'] },
                    { model: Category, as: 'category', attributes: ['id', 'name'] },
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['created_at', 'DESC']],
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
                ],
            });

            if (!course) {
                throw new NotFoundError('Course not found');
            }

            // Get enrollment count
            const enrollmentCount = await Enrollment.count({ where: { course_id: id } });

            return ApiResponse.success(res, {
                course,
                stats: {
                    enrollments: enrollmentCount,
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
                stats: {
                    total,
                    published,
                    draft,
                    pending,
                    archived,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AdminCoursesController;
