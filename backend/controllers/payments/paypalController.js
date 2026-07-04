/**
 * PayPal Controller
 * Mirrors the Paystack flow: server creates a PayPal order, frontend
 * approves via PayPal JS SDK, then frontend calls /capture which finalizes
 * enrollment. Webhook is the source of truth as a backup.
 */

const {
  User, Course, Payment, Enrollment, CouponCode,
  CouponCodeCourse, Bundle,
} = require('../../models');
const { sequelize } = require('../../config/database');
const paypalService = require('../../services/payment/paypalService');
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

class PayPalController {
  /**
   * POST /api/payments/paypal/initialize
   * Body: { course_id, payment_plan?, coupon_code? }
   * Creates a pending Payment row and a PayPal order. Returns the
   * PayPal order id for the frontend SDK to approve.
   */
  static async initializeCheckout(req, res, next) {
    try {
      const { course_id, bundle_id, payment_plan = 'full', coupon_code } = req.body;
      const userId = req.user.id;

      if (!course_id && !bundle_id) return ApiResponse.badRequest(res, 'course_id or bundle_id is required');
      if (!['full', 'installment'].includes(payment_plan)) {
        return ApiResponse.badRequest(res, 'payment_plan must be "full" or "installment"');
      }

      // ── Bundle branch ─────────────────────────────────────────────
      let bundle = null;
      let bundleCourseIds = null;
      let course;
      if (bundle_id) {
        bundle = await Bundle.findOne({
          where: { id: bundle_id, is_active: true },
          include: [{ model: Course, as: 'courses', attributes: ['id', 'title', 'price'] }],
        });
        if (!bundle) throw new NotFoundError('Bundle not found');
        if (!bundle.courses.length) return ApiResponse.badRequest(res, 'Bundle has no courses');
        if (!bundle.price || parseFloat(bundle.price) === 0) {
          return ApiResponse.badRequest(res, 'Bundle price not set');
        }
        bundleCourseIds = bundle.courses.map((c) => c.id);
        course = { id: bundle.courses[0].id, title: bundle.title, price: bundle.price };

        const alreadyEnrolled = await Enrollment.count({
          where: { student_id: userId, course_id: { [Op.in]: bundleCourseIds } },
        });
        if (alreadyEnrolled === bundleCourseIds.length) {
          return ApiResponse.badRequest(res, 'You are already enrolled in every course in this bundle');
        }

        const dupBundlePayment = await Payment.findOne({
          where: { student_id: userId, bundle_id, payment_status: 'completed' },
        });
        if (dupBundlePayment) {
          return ApiResponse.badRequest(res, 'You have already purchased this bundle');
        }
      } else {
        course = await Course.findByPk(course_id, { attributes: ['id', 'title', 'price', 'status'] });
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
      }

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
            const targetCourseIds = bundleCourseIds || [parseInt(course_id)];
            const validForCourse =
              coupon.applies_to === 'all' ||
              coupon.applicable_courses.some((c) => targetCourseIds.includes(c.course_id));
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
      const anchorCourseId = bundle ? bundleCourseIds[0] : parseInt(course_id);

      const order = await paypalService.createOrder({
        amount: chargeAmount,
        currency: 'USD',
        reference,
        description: bundle ? `Page Innovations Bundle — ${bundle.title}` : `Page Innovations — ${course.title}`,
      });

      await Payment.create({
        student_id: userId,
        course_id: anchorCourseId,
        bundle_id: bundle ? bundle.id : null,
        amount: chargeAmount,
        intended_amount: chargeAmount,
        original_amount: originalPrice,
        discount_amount: discountAmount,
        currency: 'USD',
        payment_method: 'paypal',
        payment_status: 'pending',
        payment_plan,
        payment_gateway: 'paypal',
        paypal_order_id: order.id,
        installment_percentage: payment_plan === 'installment' ? INSTALLMENT_PERCENTAGE : null,
        installment_remaining_amount: payment_plan === 'installment' ? remainingAmount : null,
        installment_status: payment_plan === 'installment' ? 'pending' : 'not_applicable',
        coupon_code_id: couponId,
        metadata: bundle
          ? { bundle_title: bundle.title, bundle_course_ids: bundleCourseIds, paypal_reference: reference }
          : { course_title: course.title, paypal_reference: reference },
      });

      logger.info(`PayPal order initialized: ${order.id} user=${userId} ${bundle ? `bundle=${bundle.id}` : `course=${course_id}`}`);

      return ApiResponse.success(res, {
        order_id: order.id,
        amount: chargeAmount,
        currency: 'USD',
        payment_plan,
        remaining_amount: remainingAmount,
        original_price: originalPrice,
        discount_amount: discountAmount,
      }, 'PayPal order created');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/paypal/installment
   * Creates a second PayPal order for the remaining installment balance.
   */
  static async initializeInstallmentCheckout(req, res, next) {
    try {
      const userId = req.user.id;

      const payment = await Payment.findOne({
        where: {
          student_id: userId,
          payment_plan: 'installment',
          payment_status: 'completed',
          payment_gateway: 'paypal',
          installment_status: { [Op.in]: ['pending', 'overdue'] },
        },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
        order: [['created_at', 'DESC']],
      });

      if (!payment) {
        return ApiResponse.badRequest(res, 'No outstanding PayPal installment balance found');
      }

      const remainingAmount = parseFloat(payment.installment_remaining_amount);
      if (!remainingAmount || remainingAmount <= 0) {
        return ApiResponse.badRequest(res, 'Invalid remaining installment amount');
      }

      const reference = generateRef();
      const order = await paypalService.createOrder({
        amount: remainingAmount,
        currency: 'USD',
        reference,
        description: `Page Innovations Installment — ${payment.course?.title || 'Course'}`,
      });

      await payment.update({
        metadata: {
          ...(payment.metadata || {}),
          paypal_installment_order_id: order.id,
        },
      });

      logger.info(`PayPal installment order created: ${order.id} user=${userId} payment=${payment.id}`);

      return ApiResponse.success(res, {
        order_id: order.id,
        amount: remainingAmount,
        currency: 'USD',
        course_title: payment.course?.title,
      }, 'PayPal installment order created');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/paypal/capture
   * Body: { order_id }
   * Called by the frontend after PayPal SDK approval. Captures the order
   * and finalizes enrollment. Idempotent.
   */
  static async captureOrder(req, res, next) {
    try {
      const { order_id } = req.body;
      const userId = req.user.id;
      if (!order_id) return ApiResponse.badRequest(res, 'order_id is required');

      let payment = await Payment.findOne({
        where: { paypal_order_id: order_id, student_id: userId },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
      });

      // Installment second-payment: order id is stored inside metadata of the original row.
      let isInstallment = false;
      if (!payment) {
        const studentInstallments = await Payment.findAll({
          where: { student_id: userId, payment_gateway: 'paypal', payment_plan: 'installment' },
          include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
        });
        payment = studentInstallments.find(
          (p) => p.metadata?.paypal_installment_order_id === order_id
        ) || null;
        isInstallment = !!payment;
      }

      if (!payment) return ApiResponse.notFound(res, 'Payment not found');

      if (payment.payment_status === 'completed' && !isInstallment) {
        return ApiResponse.success(res, {
          payment_status: payment.payment_status,
          course: payment.course,
          already_processed: true,
        });
      }

      const captureResp = await paypalService.captureOrder(order_id);

      if (captureResp.status !== 'COMPLETED') {
        return ApiResponse.badRequest(res, `PayPal order not completed (status: ${captureResp.status})`);
      }

      const capture = captureResp.purchase_units?.[0]?.payments?.captures?.[0];
      const amountPaid = capture ? parseFloat(capture.amount.value) : payment.amount;
      const captureId = capture?.id || null;

      if (isInstallment) {
        await PayPalController._completeInstallment(payment, captureId);
      } else {
        await payment.update({ paypal_capture_id: captureId });
        await PayPalController._enrollFromPayment(payment, amountPaid);
      }

      await payment.reload({
        include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
      });

      const enrollment = payment.enrollment_id
        ? await Enrollment.findByPk(payment.enrollment_id)
        : null;

      return ApiResponse.success(res, {
        payment_status: payment.payment_status,
        payment_plan: payment.payment_plan,
        amount_paid: amountPaid,
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
   * GET /api/payments/paypal/verify?order_id=xxx
   * Polling fallback if the frontend lost the capture response.
   * Just reads the current Payment row; webhook will fill it in.
   */
  static async verifyPayment(req, res, next) {
    try {
      const { order_id } = req.query;
      const userId = req.user.id;
      if (!order_id) return ApiResponse.badRequest(res, 'order_id is required');

      let payment = await Payment.findOne({
        where: { paypal_order_id: order_id, student_id: userId },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
      });

      if (!payment) {
        const studentInstallments = await Payment.findAll({
          where: { student_id: userId, payment_gateway: 'paypal', payment_plan: 'installment' },
          include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
        });
        payment = studentInstallments.find(
          (p) => p.metadata?.paypal_installment_order_id === order_id
        ) || null;
      }

      if (!payment) return ApiResponse.notFound(res, 'Payment not found');

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
   * POST /api/webhooks/paypal
   * Raw body required for signature verification.
   * Handles: PAYMENT.CAPTURE.COMPLETED (idempotent fallback to frontend capture).
   */
  static async handleWebhook(req, res) {
    const verified = await paypalService.verifyWebhookSignature({
      headers: req.headers,
      rawBody: req.body,
    });
    if (!verified) {
      logger.warn('PayPal webhook received with invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString());
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    logger.info(`PayPal webhook received: ${event.event_type}`);

    try {
      if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        await PayPalController._handleCaptureCompleted(event.resource);
      }
    } catch (err) {
      logger.error(`PayPal webhook processing error: ${err.message}`);
    }

    return res.status(200).json({ received: true });
  }

  // ─── Private handlers ─────────────────────────────────────────────────────

  static async _handleCaptureCompleted(resource) {
    // resource.supplementary_data.related_ids.order_id → PayPal order id
    const orderId = resource?.supplementary_data?.related_ids?.order_id;
    const captureId = resource?.id;
    const amountPaid = resource?.amount?.value ? parseFloat(resource.amount.value) : null;

    if (!orderId) {
      logger.warn('PayPal webhook capture missing order_id — cannot match');
      return;
    }

    // Installment second payment lookup
    const pendingInstallments = await Payment.findAll({
      where: {
        payment_gateway: 'paypal',
        payment_plan: 'installment',
        payment_status: 'completed',
        installment_status: { [Op.in]: ['pending', 'overdue'] },
      },
    });
    const installmentPayment = pendingInstallments.find(
      (p) => p.metadata?.paypal_installment_order_id === orderId
    );
    if (installmentPayment) {
      await PayPalController._completeInstallment(installmentPayment, captureId);
      return;
    }

    const payment = await Payment.findOne({ where: { paypal_order_id: orderId } });
    if (!payment) {
      logger.error(`PayPal webhook: no payment found for order ${orderId}`);
      return;
    }
    if (payment.payment_status === 'completed') {
      logger.info(`PayPal payment ${payment.id} already processed — skipping`);
      return;
    }

    await payment.update({ paypal_capture_id: captureId });
    await PayPalController._enrollFromPayment(payment, amountPaid || payment.amount);
  }

  static async _completeInstallment(payment, captureId) {
    await payment.update({
      installment_status: 'completed',
      installment_paid_at: new Date(),
      metadata: {
        ...(payment.metadata || {}),
        paypal_installment_capture_id: captureId,
      },
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

    logger.info(`PayPal installment second payment completed for payment ${payment.id}`);
  }

  static async _enrollFromPayment(payment, amountPaid) {
    const { student_id, course_id, payment_plan, bundle_id } = payment;

    const installmentDueDate =
      payment_plan === 'installment'
        ? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
        : null;

    // Resolve target courses (single or bundle-wide)
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
        transaction_id: payment.paypal_capture_id || payment.paypal_order_id,
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
      gateway: 'paypal',
    });
  }
}

module.exports = PayPalController;
