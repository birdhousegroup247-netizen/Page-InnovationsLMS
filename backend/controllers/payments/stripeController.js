/**
 * Stripe Controller
 * Handles checkout session creation, payment status queries,
 * and the Stripe webhook that confirms payments server-side.
 */

const {
  User, Course, Payment, Enrollment, CouponCode,
  CouponCodeCourse, Bundle,
} = require('../../models');
const { sequelize } = require('../../config/database');
const stripeService = require('../../services/payment/stripeService');
const enrollmentSvc = require('../../services/enrollment/enrollmentService');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError } = require('../../utils/errors');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');
const emailSvc = require('../../services/email/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const INSTALLMENT_PERCENTAGE = 60; // 60% upfront

class StripeController {
  /**
   * POST /api/payments/checkout-session
   * Creates a Stripe Checkout Session and returns the hosted URL.
   * User is redirected to Stripe to complete payment.
   */
  static async createCheckoutSession(req, res, next) {
    try {
      const { course_id, bundle_id, payment_plan = 'full', coupon_code } = req.body;
      const userId = req.user.id;

      if (!course_id && !bundle_id) {
        return ApiResponse.badRequest(res, 'course_id or bundle_id is required');
      }

      // Validate payment plan
      if (!['full', 'installment'].includes(payment_plan)) {
        return ApiResponse.badRequest(res, 'payment_plan must be "full" or "installment"');
      }

      // ── Bundle branch ─────────────────────────────────────────────
      // For bundles, we charge the bundle price and store one Payment
      // row with bundle_id set. course_id is the bundle's first course
      // as an anchor so per-course analytics still light up.
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
        course = await Course.findByPk(course_id, {
          attributes: ['id', 'title', 'price', 'status'],
        });

        if (!course) throw new NotFoundError('Course not found');
        if (course.status !== 'published') {
          return ApiResponse.badRequest(res, 'Course is not available for purchase');
        }

        // Free course — enroll directly, no payment needed
        if (!course.price || parseFloat(course.price) === 0) {
          return ApiResponse.badRequest(res, 'This course is free. Use the enroll endpoint directly.');
        }

        // Block if already has an active enrollment
        const existingEnrollment = await Enrollment.findOne({
          where: { student_id: userId, course_id },
        });
        if (existingEnrollment) {
          return ApiResponse.badRequest(res, 'You are already enrolled in this course');
        }

        // Block if already has a completed payment for this course
        const existingPayment = await Payment.findOne({
          where: { student_id: userId, course_id, payment_status: 'completed' },
        });
        if (existingPayment) {
          return ApiResponse.badRequest(res, 'You have already paid for this course');
        }
      }

      let originalPrice = parseFloat(course.price);
      let discountAmount = 0;
      let couponId = null;
      let stripeCouponId = null;

      // Apply coupon if provided. For bundles, coupon is considered
      // "valid for course" if any bundle course is in the applicable set
      // (or applies_to === 'all').
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
              if (coupon.discount_type === 'percentage') {
                discountAmount = (originalPrice * parseFloat(coupon.discount_value)) / 100;
              } else {
                discountAmount = Math.min(parseFloat(coupon.discount_value), originalPrice);
              }
              discountAmount = parseFloat(discountAmount.toFixed(2));
              couponId = coupon.id;

              // Create a one-time Stripe coupon for this checkout session
              const stripeCoupon = await stripeService.createStripeCoupon({
                discountType: coupon.discount_type,
                discountValue: parseFloat(coupon.discount_value),
                name: `TekyPro - ${coupon.code}`,
              });
              stripeCouponId = stripeCoupon.id;
            }
          }
        }
      }

      const priceAfterDiscount = originalPrice - discountAmount;

      // Adjust for installment plan (60% upfront)
      let chargeAmount = priceAfterDiscount;
      let remainingAmount = 0;
      if (payment_plan === 'installment') {
        chargeAmount = parseFloat((priceAfterDiscount * INSTALLMENT_PERCENTAGE / 100).toFixed(2));
        remainingAmount = parseFloat((priceAfterDiscount - chargeAmount).toFixed(2));
      }

      const unitAmountCents = Math.round(chargeAmount * 100);

      const anchorCourseId = bundle ? bundleCourseIds[0] : parseInt(course_id);
      const session = await stripeService.createCheckoutSession({
        userId,
        courseId: anchorCourseId,
        courseTitle: bundle ? `${bundle.title} (Bundle)` : course.title,
        unitAmount: unitAmountCents,
        paymentPlan: payment_plan,
        successUrl: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: bundle
          ? `${FRONTEND_URL}/bundles/${bundle.id}`
          : `${FRONTEND_URL}/payment-cancelled?course_id=${course_id}`,
        couponStripeId: stripeCouponId,
        extraMetadata: bundle ? { bundle_id: String(bundle.id) } : {},
      });

      // Store a pending payment record so we can match the webhook later
      await Payment.create({
        student_id: userId,
        course_id: anchorCourseId,
        bundle_id: bundle ? bundle.id : null,
        amount: chargeAmount,
        intended_amount: chargeAmount,
        original_amount: originalPrice,
        discount_amount: discountAmount,
        currency: 'USD',
        payment_method: 'card',
        payment_status: 'pending',
        payment_plan,
        installment_percentage: payment_plan === 'installment' ? INSTALLMENT_PERCENTAGE : null,
        installment_remaining_amount: payment_plan === 'installment' ? remainingAmount : null,
        installment_status: payment_plan === 'installment' ? 'pending' : 'not_applicable',
        coupon_code_id: couponId,
        stripe_checkout_session_id: session.id,
        metadata: bundle
          ? { bundle_title: bundle.title, bundle_course_ids: bundleCourseIds }
          : { course_title: course.title },
      });

      logger.info(`Checkout session ${session.id} created for user ${userId}, ${bundle ? `bundle ${bundle.id}` : `course ${course_id}`}`);

      return ApiResponse.success(res, {
        checkout_url: session.url,
        session_id: session.id,
        amount: chargeAmount,
        original_price: originalPrice,
        discount_amount: discountAmount,
        payment_plan,
        remaining_amount: remainingAmount,
      }, 'Checkout session created');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/verify?session_id=xxx
   * Called by the frontend after Stripe redirects back to /payment-success.
   * Returns payment + enrollment status.
   */
  static async verifyPayment(req, res, next) {
    try {
      const { session_id } = req.query;
      const userId = req.user.id;

      if (!session_id) {
        return ApiResponse.badRequest(res, 'session_id is required');
      }

      const payment = await Payment.findOne({
        where: { stripe_checkout_session_id: session_id, student_id: userId },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
      });

      if (!payment) {
        return ApiResponse.notFound(res, 'Payment not found');
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
   * GET /api/payments/my
   * Returns all payments for the authenticated user.
   */
  static async getMyPayments(req, res, next) {
    try {
      const payments = await Payment.findAll({
        where: { student_id: req.user.id },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, { payments });
    } catch (error) {
      // Detailed log so a recurring schema-drift fault is diagnosable
      // from the Railway logs alone — no need to crack open the toast.
      const logger = require('../../utils/logger');
      logger.error('getMyPayments failed:', {
        user_id: req.user?.id,
        name: error.name,
        message: error.message,
        original: error.original?.message,
        parent: error.parent?.message,
        code: error.original?.code || error.parent?.code,
        column: error.original?.column || error.parent?.column,
        table: error.original?.table || error.parent?.table,
        constraint: error.original?.constraint || error.parent?.constraint,
        sql: (error.sql || error.parent?.sql || '').slice(0, 500),
      });
      next(error);
    }
  }

  /**
   * POST /api/payments/installment-session
   * Creates a Stripe Checkout Session for the user's outstanding installment balance.
   * Only valid if the user has a pending/overdue installment payment.
   */
  static async createInstallmentSession(req, res, next) {
    try {
      const userId = req.user.id;

      // Find the outstanding installment payment for this user
      const payment = await Payment.findOne({
        where: {
          student_id: userId,
          payment_plan: 'installment',
          payment_status: 'completed',  // upfront portion was paid
          installment_status: { [Op.in]: ['pending', 'overdue'] },
        },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
        order: [['created_at', 'DESC']],
      });

      if (!payment) {
        return ApiResponse.badRequest(res, 'No outstanding installment balance found');
      }

      const remainingAmount = parseFloat(payment.installment_remaining_amount);
      if (!remainingAmount || remainingAmount <= 0) {
        return ApiResponse.badRequest(res, 'Invalid remaining installment amount');
      }

      const unitAmountCents = Math.round(remainingAmount * 100);

      const session = await stripeService.createCheckoutSession({
        userId,
        courseId: payment.course_id,
        courseTitle: payment.course?.title || 'Course',
        unitAmount: unitAmountCents,
        paymentPlan: 'installment_second',
        successUrl: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&installment=1`,
        cancelUrl: `${FRONTEND_URL}/billing`,
        couponStripeId: null,
        extraMetadata: { payment_type: 'installment_second', original_payment_id: String(payment.id) },
      });

      logger.info(`Installment second-payment session ${session.id} created for user ${userId}, payment ${payment.id}`);

      return ApiResponse.success(res, {
        checkout_url: session.url,
        session_id: session.id,
        remaining_amount: remainingAmount,
        course_title: payment.course?.title,
      }, 'Installment checkout session created');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/webhooks/stripe
   * Stripe calls this after a successful payment.
   * This is the ONLY place where enrollment is created — never on frontend redirect.
   * Raw body required (handled in server.js before body parser).
   */
  static async handleWebhook(req, res, next) {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      logger.warn('Stripe webhook received without signature');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = stripeService.constructWebhookEvent(req.body, signature);
    } catch (err) {
      logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
    }

    logger.info(`Stripe webhook received: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await StripeController._handleCheckoutCompleted(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await StripeController._handlePaymentFailed(event.data.object);
          break;

        default:
          logger.debug(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (err) {
      // Log but still return 200 — Stripe will retry if we return non-200
      logger.error(`Error processing webhook ${event.type}: ${err.message}`);
    }

    // Always return 200 to Stripe immediately
    return res.status(200).json({ received: true });
  }

  // ─── Private webhook handlers ───────────────────────────────────────────────

  static async _handleCheckoutCompleted(session) {
    const { user_id, course_id, payment_plan, payment_type, original_payment_id, bundle_id } = session.metadata;

    // ── Handle installment second payment ─────────────────────────────────────
    if (payment_type === 'installment_second' && original_payment_id) {
      const origPayment = await Payment.findOne({
        where: { id: parseInt(original_payment_id) },
      });

      if (!origPayment) {
        logger.error(`Installment second payment: original payment ${original_payment_id} not found`);
        return;
      }

      await origPayment.update({
        installment_status: 'completed',
        installment_paid_at: new Date(),
        metadata: {
          ...(origPayment.metadata || {}),
          installment_session_id: session.id,
          installment_intent_id: session.payment_intent,
        },
      });

      // Unsuspend user if they were suspended due to overdue installment
      await User.update(
        { registration_status: 'active' },
        { where: { id: parseInt(user_id || origPayment.student_id), registration_status: 'suspended' } }
      );

      await NotificationsController.createNotification({
        user_id: parseInt(user_id || origPayment.student_id),
        type: 'payment_confirmed',
        title: 'Installment Payment Received!',
        message: 'Your remaining balance has been paid. Full access restored.',
        link: '/my-courses',
        priority: 'high',
      });

      logger.info(`Installment second payment completed for payment ${original_payment_id}`);
      return;
    }

    // ── Handle new enrollment payment ─────────────────────────────────────────
    if (!user_id || !course_id) {
      logger.error('Webhook checkout.session.completed missing metadata', session.metadata);
      return;
    }

    const payment = await Payment.findOne({
      where: { stripe_checkout_session_id: session.id },
    });

    if (!payment) {
      logger.error(`No pending payment found for session ${session.id}`);
      return;
    }

    if (payment.payment_status === 'completed') {
      logger.info(`Payment ${payment.id} already processed — skipping`);
      return;
    }

    const amountPaid = session.amount_total / 100; // Stripe sends cents

    // Resolve bundle courses if applicable. bundle_id from metadata
    // overrides — payment.bundle_id may not be persisted for legacy rows.
    const effectiveBundleId = bundle_id ? parseInt(bundle_id) : payment.bundle_id;
    let courseIds = [parseInt(course_id)];
    if (effectiveBundleId) {
      const resolved = await enrollmentSvc.resolveBundleCourseIds(effectiveBundleId);
      if (resolved && resolved.length) courseIds = resolved;
    }

    const installmentDueDate =
      payment_plan === 'installment'
        ? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
        : null;

    // Everything that MUST land together runs inside one transaction.
    // A mid-flow failure now rolls back to a clean state instead of
    // leaving a completed Payment tied to a half-built enrollment.
    await sequelize.transaction(async (transaction) => {
      await payment.update({
        payment_status: 'completed',
        payment_date: new Date(),
        amount: amountPaid,
        stripe_payment_intent_id: session.payment_intent,
        transaction_id: session.payment_intent,
        installment_due_date: installmentDueDate,
      }, { transaction });

      await enrollmentSvc.runTransactionalSideEffects({
        payment,
        studentId: parseInt(user_id),
        courseIds,
        transaction,
      });
    });

    // Post-commit side-effects (notification, emails, referral, badge).
    // These are fire-and-forget so a temporary SMTP outage can't undo
    // the enrollment we just committed.
    await enrollmentSvc.runPostCommitSideEffects({
      studentId: parseInt(user_id),
      courseIds,
      payment,
      gateway: 'stripe',
    });
  }

  static async _handlePaymentFailed(paymentIntent) {
    const payment = await Payment.findOne({
      where: { stripe_payment_intent_id: paymentIntent.id },
      include: [{ model: Course, as: 'course', attributes: ['title'] }],
    });

    if (payment) {
      await payment.update({ payment_status: 'failed' });
      logger.warn(`Payment ${payment.id} marked as failed (intent: ${paymentIntent.id})`);

      // Notify student so they can retry
      NotificationsController.createNotification({
        user_id: payment.student_id,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment for "${payment.course?.title || 'your course'}" could not be processed. Please try again.`,
        link: `/checkout?course_id=${payment.course_id}`,
        priority: 'high',
      }).catch(() => {});

      // Send failure email (non-critical)
      try {
        const student = await User.findByPk(payment.student_id, { attributes: ['full_name', 'email'] });
        if (student) {
          await emailSvc.sendEmail({
            to: student.email,
            subject: 'TekyPro — Your payment could not be processed',
            html: `<p>Hi ${student.full_name},</p><p>Your payment for <strong>${payment.course?.title || 'your course'}</strong> could not be processed. Please <a href="${process.env.FRONTEND_URL}/checkout?course_id=${payment.course_id}">try again</a> or contact support if the issue persists.</p><p>The TekyPro Team</p>`,
            text: `Hi ${student.full_name}, your payment could not be processed. Please try again at ${process.env.FRONTEND_URL}/checkout?course_id=${payment.course_id}`,
          });
        }
      } catch (emailErr) {
        logger.warn(`Payment failure email failed: ${emailErr.message}`);
      }
    }
  }
}

module.exports = StripeController;
