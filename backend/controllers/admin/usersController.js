const { User, Course, Enrollment, Certificate } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

class UsersController {
  // Get all users with filters
  static async getAllUsers(req, res, next) {
    try {
      const { role, search } = req.query;

      // Get safe pagination parameters with maximum limit enforcement
      const { page, limit, offset } = getPaginationParams(req.query);

      const where = {};

      if (role && role !== 'all') {
        where.role = role;
      }

      if (search) {
        where[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        users: rows,
        pagination: getPaginationMeta(page, limit, count),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user by ID with details
  static async getUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get user statistics
      const enrollments = await Enrollment.count({ where: { student_id: userId } });
      const certificates = await Certificate.count({ where: { student_id: userId } });
      const coursesCreated = await Course.count({ where: { instructor_id: userId } });

      return ApiResponse.success(res, {
        user,
        stats: {
          enrollments: user.role === 'student' ? enrollments : null,
          certificates: user.role === 'student' ? certificates : null,
          coursesCreated: ['instructor', 'admin', 'super_admin'].includes(user.role) ? coursesCreated : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new user
  static async createUser(req, res, next) {
    try {
      const { full_name, email, password, role, phone } = req.body;

      // Check if email exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new BadRequestError('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        full_name,
        email,
        password: hashedPassword,
        role: role || 'student',
        phone,
        is_active: true,
        email_verified: true, // Admin created users are auto-verified
      });

      logger.info(`User created by admin: ${email} with role ${role}`);

      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      return ApiResponse.created(res, { user: userResponse }, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Update user
  static async updateUser(req, res, next) {
    try {
      const { userId } = req.params;
      const updates = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // If updating password, hash it
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 12);
      }

      // Prevent updating certain fields
      delete updates.id;
      delete updates.created_at;

      await user.update(updates);

      logger.info(`User updated by admin: ${user.email}`);

      const userResponse = user.toJSON();
      delete userResponse.password;

      return ApiResponse.success(res, { user: userResponse }, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete/Deactivate user
  static async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Prevent self-deletion
      if (user.id === req.user.id) {
        throw new BadRequestError('Cannot delete your own account');
      }

      // Soft delete - deactivate instead of deleting
      await user.update({ is_active: false });

      logger.info(`User deactivated by admin: ${user.email}`);

      return ApiResponse.success(res, null, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Activate user
  static async activateUser(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      await user.update({ is_active: true });

      logger.info(`User activated by admin: ${user.email}`);

      return ApiResponse.success(res, null, 'User activated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get user roles distribution
  static async getRolesDistribution(req, res, next) {
    try {
      const students = await User.count({ where: { role: 'student' } });
      const instructors = await User.count({ where: { role: 'instructor' } });
      const admins = await User.count({ where: { role: 'admin' } });
      const superAdmins = await User.count({ where: { role: 'super_admin' } });

      return ApiResponse.success(res, {
        roles: {
          student: students,
          instructor: instructors,
          admin: admins,
          super_admin: superAdmins,
          total: students + instructors + admins + superAdmins,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UsersController;
