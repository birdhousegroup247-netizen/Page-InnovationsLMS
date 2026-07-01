/**
 * Paystack Controller
 * Mirrors StripeController flow but for Paystack popup payments.
 * Frontend uses Paystack Inline.js — no redirect needed from backend.
 */

const {
  User, Course, Payment, Enrollment, CouponCode,
  CouponCodeCourse, Bundle,
} = require('../../models');
const { sequelize } = require('../../config/database');
const paystackService = require('../../services/payment/paystackService');
const enrollmentSvc = require('../../services/enrollment/enrollmentService');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError } = require('../../utils/errors');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');
const crypto = require('crypto');

const INSTALLMENT_PERCENTAGE = 60;

function generateRef() {
  return `TKP-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

class PaystackController {
  /**
   * POST /api/payments/paystack/initialize
   * Validates the order, applies coupon, creates a pending Payment record,
   * and returns a reference + amount for the frontend Paystack popup.
   */
  static async initializeCheckout(req, res, next) {
    try {
      const { course_id, payment_plan = 'full', coupon_code } = req.body;
      const userId = req.user.id;

      if (!course_id) return ApiResponse.badRequest(res, 'course_id is required');
      if (!['full', 'installment'].includes(payment_plan)) {
        return ApiResponse.badRequest(res, 'payment_plan must be "full" or "installment"');
      }

      const course = await Course.findByPk(course_id, { attributes: ['id', 'title', 'price', 'status'] });
      if (!course) throw new NotFoundError('Course not found');
      if (course.status !== 'published') return ApiResponse.badRequest(res, 'Course is not available for purchase');
      if (!course.price || parseFloat(course.price) === 0) {
        return ApiResponse.badRequest(res, 'This course is free. Use the enroll endpoint directly.');
      }

      const existingEnrollment = await Enrollment.findOne({ where: { student_id: userId, course_id } });
      if (existingEnrollment) return ApiResponse.badRequest(res, 'You are already enrolled in this course');

      const existingPayment = await Payment.findOne({
        where: { student_id: userId, course_id, payment_status: 'completed' },
      });
      if (existingPayment) return ApiResponse.badRequest(res, 'You have already paid for this course');

      let originalPrice = parseFloat(course.price);
      let discountAmount = 0;
      let couponId = null;

      if (coupon_code) {
        const coupon = await CouponCode.findOne({
          where: { code: coupon_code.toUpperCase().trim(), is_active: true },
          include: [{ model: CouponCodeCourse, as: 'applicable_courses' }],
        });
        if (coupon && (!coupon.expires_at || new Date() < new Date(coupon.expires_at))) {
          if (coupon.max_uses === null || coupon.uses_count < coupon.max_uses) {
            const validForCourse =
              coupon.applies_to === 'all' ||
              coupon.applicable_courses.some((c) => c.course_id === parseInt(course_id));
            if (validForCourse) {
              discountAmount =
                coupon.discount_type === 'percentage'
                  ? parseFloat(((originalPrice * parseFloat(coupon.discount_value)) / 100).toFixed(2))
                  : Math.min(parseFloat(coupon.discount_value), originalPrice);
              discountAmount = parseFloat(discountAmount.toFixed(2));
              couponId = coupon.id;
            }
          }
        }
      }

      const priceAfterDiscount = originalPrice - discountAmount;
      let chargeAmount = priceAfterDiscount;
      let remainingAmount = 0;
      if (payment_plan === 'installment') {
        chargeAmount = parseFloat(((priceAfterDiscount * INSTALLMENT_PERCENTAGE) / 100).toFixed(2));
        remainingAmount = parseFloat((priceAfterDiscount - chargeAmount).toFixed(2));
      }

      const reference = generateRef();
      const student = await User.findByPk(userId, { attributes: ['email'] });

      await Payment.create({
        student_id: userId,
        course_id,
        amount: chargeAmount,
        original_amount: originalPrice,
        discount_amount: discountAmount,
        currency: 'USD',
        payment_method: 'card',
        payment_status: 'pending',
        payment_plan,
        payment_gateway: 'paystack',
        paystack_reference: reference,
        installment_percentage: payment_plan === 'installment' ? INSTALLMENT_PERCENTAGE : null,
        installment_remaining_amount: payment_plan === 'installment' ? remainingAmount : null,
        installment_status: payment_plan === 'installment' ? 'pending' : 'not_applicable',
        coupon_code_id: couponId,
        metadata: { course_title: course.title },
      });

      logger.info(`Paystack checkout initialized: ref=${reference} user=${userId} course=${course_id}`);

      return ApiResponse.success(res, {
        reference,
        amount: chargeAmount,
        email: student.email,
        payment_plan,
        remaining_amount: remainingAmount,
        original_price: originalPrice,
        discount_amount: discountAmount,
      }, 'Paystack checkout initialized');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/paystack/installment
   * Returns a reference for the outstanding 40% installment balance (Paystack only).
   */
  static async initializeInstallmentCheckout(req, res, next) {
    try {
      const userId = req.user.id;

      const payment = await Payment.findOne({
        where: {
          student_id: userId,
          payment_plan: 'installment',
          payment_status: 'completed',
          payment_gateway: 'paystack',
          installment_status: { [Op.in]: ['pending', 'overdue'] },
        },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
        order: [['created_at', 'DESC']],
      });

      if (!payment) {
        return ApiResponse.badRequest(res, 'No outstanding Paystack installment balance found');
      }

      const remainingAmount = parseFloat(payment.installment_remaining_amount);
      if (!remainingAmount || remainingAmount <= 0) {
        return ApiResponse.badRequest(res, 'Invalid remaining installment amount');
      }

      // Generate a new reference for this installment and store it in the original payment's metadata
      const installmentRef = generateRef();
      await payment.update({
        metadata: { ...(payment.metadata || {}), paystack_installment_ref: installmentRef },
      });

      const student = await User.findByPk(userId, { attributes: ['email'] });

      logger.info(`Paystack installment session initialized: ref=${installmentRef} user=${userId} payment=${payment.id}`);

      return ApiResponse.success(res, {
        reference: installmentRef,
        amount: remainingAmount,
        email: student.email,
        course_title: payment.course?.title,
      }, 'Paystack installment session initialized');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/paystack/verify?reference=xxx
   * Called by the frontend after Paystack popup closes.
   * If webhook hasn't arrived yet, attempts to verify directly with Paystack.
   */
  static async verifyPayment(req, res, next) {
    try {
      const { reference } = req.query;
      const userId = req.user.id;

      if (!reference) return ApiResponse.badRequest(res, 'reference is required');

      // Look up by direct paystack_reference (new enrollment)
      let payment = await Payment.findOne({
        where: { paystack_reference: reference, student_id: userId },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
      });

      // Or by installment reference stored inside metadata (installment second payment)
      if (!payment) {
        const studentPayments = await Payment.findAll({
          where: { student_id: userId, payment_gateway: 'paystack', payment_plan: 'installment' },
          include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
        });
        payment = studentPayments.find((p) => p.metadata?.paystack_installment_ref === reference) || null;
      }

      if (!payment) return ApiResponse.notFound(res, 'Payment not found');

      // If still pending, try Paystack direct verify (webhook may be slightly delayed)
      if (payment.payment_status === 'pending' && process.env.PAYSTACK_SECRET_KEY) {
        try {
          const paystackData = await paystackService.verifyTransaction(reference);
          if (paystackData.status === 'success') {
            const isInstallment = payment.metadata?.paystack_installment_ref === reference;
            if (isInstallment) {
              await PaystackController._completeInstallment(payment);
            } else {
              await PaystackController._enrollFromPayment(payment, paystackData.amount / 100);
            }
            await payment.reload({
              include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
            });
          }
        } catch (verifyErr) {
          logger.warn(`Paystack direct verify failed for ${reference}: ${verifyErr.message}`);
        }
      }

      const enrollment = payment.enrollment_id
        ? await Enrollment.findByPk(payment.enrollment_id)
        : null;

      return ApiResponse.success(res, {
        payment_status: payment.payment_status,
        payment_plan: payment.payment_plan,
        amount_paid: payment.amount,
        course: payment.course,
        enrolled: !!enrollment,
        installment_due_date: payment.installment_due_date,
        installment_remaining: payment.installment_remaining_amount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/webhooks/paystack
   * Paystack calls this after a successful payment.
   * Raw body required for HMAC signature verification.
   */
  static async handleWebhook(req, res) {
    const signature = req.headers['x-paystack-signature'];

    if (!paystackService.verifyWebhookSignature(req.body, signature)) {
      logger.warn('Paystack webhook received with invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString());
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    logger.info(`Paystack webhook received: ${event.event}`);

    try {
      if (event.event === 'charge.success') {
        await PaystackController._handleChargeSuccess(event.data);
      }
    } catch (err) {
      logger.error(`Paystack webhook processing error: ${err.message}`);
    }

    // Always return 200 — Paystack retries on non-200
    return res.status(200).json({ received: true });
  }

  // ─── Private handlers ─────────────────────────────────────────────────────

  static async _handleChargeSuccess(data) {
    const reference = data.reference;
    const amountPaid = data.amount / 100;

    // Check if this is an installment second payment
    // We stored the ref inside the original payment's metadata
    const pendingInstallments = await Payment.findAll({
      where: {
        payment_gateway: 'paystack',
        payment_plan: 'installment',
        payment_status: 'completed',
        installment_status: { [Op.in]: ['pending', 'overdue'] },
      },
    });
    const installmentPayment = pendingInstallments.find(
      (p) => p.metadata?.paystack_installment_ref === reference
    );

    if (installmentPayment) {
      await PaystackController._completeInstallment(installmentPayment);
      return;
    }

    // New enrollment payment
    const payment = await Payment.findOne({ where: { paystack_reference: reference } });
    if (!payment) {
      logger.error(`Paystack webhook: no payment found for reference ${reference}`);
      return;
    }
    if (payment.payment_status === 'completed') {
      logger.info(`Paystack payment ${payment.id} already processed — skipping`);
      return;
    }

    await PaystackController._enrollFromPayment(payment, amountPaid);
  }

  static async _completeInstallment(payment) {
    await payment.update({
      installment_status: 'completed',
      installment_paid_at: new Date(),
    });

    await User.update(
      { registration_status: 'active' },
      { where: { id: payment.student_id, registration_status: 'suspended' } }
    );

    await NotificationsController.createNotification({
      user_id: payment.student_id,
      type: 'payment_confirmed',
      title: 'Installment Payment Received!',
      message: 'Your remaining balance has been paid. Full access restored.',
      link: '/my-courses',
      priority: 'high',
    });

    logger.info(`Paystack installment second payment completed for payment ${payment.id}`);
  }

  static async _enrollFromPayment(payment, amountPaid) {
    const { student_id, course_id, payment_plan, bundle_id } = payment;

    const installmentDueDate =
      payment_plan === 'installment'
        ? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
        : null;

    let courseIds = [course_id];
    if (bundle_id) {
      const resolved = await enrollmentSvc.resolveBundleCourseIds(bundle_id);
      if (resolved && resolved.length) courseIds = resolved;
    }

    await sequelize.transaction(async (transaction) => {
      await payment.update({
        payment_status: 'completed',
        payment_date: new Date(),
        amount: amountPaid || payment.amount,
        transaction_id: payment.paystack_reference,
        installment_due_date: installmentDueDate,
      }, { transaction });

      await enrollmentSvc.runTransactionalSideEffects({
        payment,
        studentId: student_id,
        courseIds,
        transaction,
      });
    });

    await enrollmentSvc.runPostCommitSideEffects({
      studentId: student_id,
      courseIds,
      payment,
      gateway: 'paystack',
    });
  }
}

module.exports = PaystackController;
