const { Payment, User, Course, Enrollment, ChatRoomMember } = require('../../models');
const emailSvc = require('../../services/email/emailService');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { Op, fn, col, literal, sequelize: seq } = require('sequelize');
const { sequelize } = require('../../config/database');

class AdminPaymentsController {
  // GET /api/admin/payments/stats
  static async getStats(req, res, next) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalRevenue, monthRevenue, totalRefunds, pendingCount, paymentCount] = await Promise.all([
        Payment.sum('amount', { where: { payment_status: 'completed' } }),
        Payment.sum('amount', { where: { payment_status: 'completed', payment_date: { [Op.gte]: startOfMonth } } }),
        Payment.sum('refund_amount', { where: { payment_status: 'refunded' } }),
        Payment.count({ where: { payment_status: 'pending' } }),
        Payment.count({ where: { payment_status: 'completed' } }),
      ]);

      const avgOrderValue = paymentCount > 0 ? (totalRevenue || 0) / paymentCount : 0;

      // Monthly chart — last 12 months
      const monthlyData = await Payment.findAll({
        attributes: [
          [fn('DATE_TRUNC', 'month', col('payment_date')), 'month'],
          [fn('SUM', col('amount')), 'revenue'],
          [fn('COUNT', col('id')), 'transactions'],
        ],
        where: {
          payment_status: 'completed',
          payment_date: { [Op.gte]: new Date(now.getFullYear() - 1, now.getMonth(), 1) },
        },
        group: [fn('DATE_TRUNC', 'month', col('payment_date'))],
        order: [[fn('DATE_TRUNC', 'month', col('payment_date')), 'ASC']],
        raw: true,
      });

      // Top 5 courses by revenue
      const topCourses = await Payment.findAll({
        attributes: [
          'course_id',
          [fn('SUM', col('Payment.amount')), 'revenue'],
          [fn('COUNT', col('Payment.id')), 'sales'],
        ],
        where: { payment_status: 'completed' },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
        group: ['Payment.course_id', 'course.id'],
        order: [[fn('SUM', col('Payment.amount')), 'DESC']],
        limit: 5,
        raw: false,
      });

      // Payment method breakdown
      const methodBreakdown = await Payment.findAll({
        attributes: [
          'payment_method',
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { payment_status: 'completed' },
        group: ['payment_method'],
        raw: true,
      });

      return ApiResponse.success(res, {
        total_revenue: parseFloat(totalRevenue || 0).toFixed(2),
        this_month_revenue: parseFloat(monthRevenue || 0).toFixed(2),
        total_refunds: parseFloat(totalRefunds || 0).toFixed(2),
        pending_payments: pendingCount,
        avg_order_value: parseFloat(avgOrderValue).toFixed(2),
        monthly_chart: monthlyData.map(m => ({
          month: m.month,
          revenue: parseFloat(m.revenue || 0).toFixed(2),
          transactions: parseInt(m.transactions),
        })),
        top_courses: topCourses.map(p => ({
          course_id: p.course_id,
          title: p.course?.title,
          thumbnail: p.course?.thumbnail,
          revenue: parseFloat(p.getDataValue('revenue') || 0).toFixed(2),
          sales: parseInt(p.getDataValue('sales')),
        })),
        method_breakdown: methodBreakdown,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/payments — list all payments
  static async getAllPayments(req, res, next) {
    try {
      const {
        status,
        payment_method,
        date_from,
        date_to,
        student_id,
        course_id,
        search,
        page = 1,
        limit = 20,
      } = req.query;

      const where = {};
      if (status && status !== 'all') where.payment_status = status;
      if (payment_method) where.payment_method = payment_method;
      if (student_id) where.student_id = student_id;
      if (course_id) where.course_id = course_id;
      if (date_from) where.payment_date = { ...(where.payment_date || {}), [Op.gte]: new Date(date_from) };
      if (date_to) {
        const end = new Date(date_to);
        end.setDate(end.getDate() + 1);
        where.payment_date = { ...(where.payment_date || {}), [Op.lt]: end };
      }

      const studentWhere = {};
      if (search) {
        studentWhere[Op.or] = [
          { full_name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await Payment.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email'],
            where: Object.keys(studentWhere).length ? studentWhere : undefined,
          },
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title'],
          },
        ],
        limit: parseInt(limit),
        offset,
        order: [['payment_date', 'DESC']],
      });

      return ApiResponse.success(res, {
        payments: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/payments/:id/refund
  static async issueRefund(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const payment = await Payment.findByPk(id);
      if (!payment) throw new NotFoundError('Payment not found');

      if (payment.payment_status !== 'completed') {
        throw new BadRequestError('Only completed payments can be refunded');
      }

      // Attempt Stripe refund if stripe credentials and charge info exist
      if ((payment.stripe_charge_id || payment.stripe_payment_intent_id) && process.env.STRIPE_SECRET_KEY) {
        try {
          const stripeService = require('../../services/payment/stripeService');
          const stripeInstance = require('stripe')(process.env.STRIPE_SECRET_KEY);
          if (payment.stripe_payment_intent_id) {
            await stripeInstance.refunds.create({ payment_intent: payment.stripe_payment_intent_id });
          } else {
            await stripeInstance.refunds.create({ charge: payment.stripe_charge_id });
          }
        } catch (stripeError) {
          logger.error(`Stripe refund failed for payment ${id}:`, stripeError.message);
          throw new BadRequestError(`Stripe refund failed: ${stripeError.message}`);
        }
      }

      await payment.update({
        payment_status: 'refunded',
        refund_date: new Date(),
        refund_amount: payment.amount,
        refund_reason: reason || 'Admin initiated refund',
      });

      // Revoke course access — remove enrollment and chat room membership
      if (payment.enrollment_id) {
        const enrollment = await Enrollment.findByPk(payment.enrollment_id, {
          include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
        });
        if (enrollment) {
          // Remove from course chat room
          const { ChatRoom } = require('../../models');
          const chatRoom = await ChatRoom.findOne({ where: { course_id: enrollment.course_id } });
          if (chatRoom) {
            await ChatRoomMember.destroy({ where: { room_id: chatRoom.id, user_id: payment.student_id } });
          }
          await enrollment.destroy();

          // Notify student
          const student = await User.findByPk(payment.student_id, { attributes: ['full_name', 'email'] });
          if (student) {
            try {
              await emailSvc.sendRefundConfirmation(student.email, student.full_name, {
                courseTitle: enrollment.course?.title || 'your course',
                refundAmount: payment.amount,
              });
            } catch (emailErr) {
              logger.warn('Refund email failed (non-critical):', emailErr.message);
            }
          }
        }
      }

      logger.info(`Admin ${req.user.email} issued refund for payment ${id} — enrollment revoked`);

      return ApiResponse.success(res, { payment }, 'Refund issued and course access revoked');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminPaymentsController;
