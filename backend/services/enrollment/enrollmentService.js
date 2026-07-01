/**
 * Shared enrollment side-effects.
 *
 * A single Payment row becoming `completed` (or an admin manual enroll)
 * has to fan out to: Enrollment row(s), user activation, coupon
 * redemption bookkeeping, chat-room membership, test auto-assignment,
 * in-app notification, and (fire-and-forget) receipt email, congrats
 * email, referral reward, badge check.
 *
 * Before this helper existed the exact same 100-line block was duplicated
 * across StripeController, PaystackController, PayPalController, and NOT
 * present in the admin manual-enroll path — which is why manually
 * enrolled students were missing chat access and test assignments.
 *
 * Everything that MUST land atomically runs inside the caller's
 * sequelize transaction. Emails / referrals / badges are best-effort and
 * intentionally fire after the transaction commits.
 */

const {
  User, Course, Payment, Enrollment, CouponCode, CouponRedemption, Bundle,
  ChatRoom, ChatRoomMember, AssignedTest, TestAssignment,
} = require('../../models');
const logger = require('../../utils/logger');
const emailSvc = require('../email/emailService');

/**
 * Run the transactional part of enrollment side-effects.
 *
 * @param {object} opts
 * @param {Payment} opts.payment          Sequelize Payment instance (already `completed` or being marked)
 * @param {number}  opts.studentId
 * @param {number[]} opts.courseIds       Courses to enroll student into (single-course = [id]; bundle = all bundle courses)
 * @param {import('sequelize').Transaction} opts.transaction
 * @returns {Promise<{ enrollments: Enrollment[] }>}
 */
async function runTransactionalSideEffects({ payment, studentId, courseIds, transaction }) {
  const enrollments = [];

  // Activate the user account. Suspended installment users get flipped
  // back to active when they pay the remainder; new enrollees get their
  // trial gate lifted.
  await User.update(
    { registration_status: 'active' },
    { where: { id: studentId }, transaction }
  );

  // Coupon redemption: increment uses_count under a row lock so two
  // concurrent webhooks on a max_uses=1 coupon can't both slip through.
  // Idempotent — if a CouponRedemption already exists for this payment,
  // skip (means we already ran this side-effect for this webhook).
  if (payment.coupon_code_id) {
    const existing = await CouponRedemption.findOne({
      where: { payment_id: payment.id },
      transaction,
    });
    if (!existing) {
      const coupon = await CouponCode.findOne({
        where: { id: payment.coupon_code_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (coupon) {
        // Re-check max_uses under the lock. If someone else raced us
        // and filled the slot, we still record the redemption (money
        // was already taken) but log the overshoot for admin cleanup.
        if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
          logger.warn(
            `Coupon ${coupon.code} overshoot: uses_count=${coupon.uses_count} max_uses=${coupon.max_uses} — payment ${payment.id} still redeemed (money already taken)`
          );
        }
        await coupon.increment('uses_count', { by: 1, transaction });
        await CouponRedemption.create({
          coupon_code_id: payment.coupon_code_id,
          user_id: studentId,
          payment_id: payment.id,
          original_price: payment.original_amount,
          discount_amount: payment.discount_amount,
          final_price: payment.amount,
        }, { transaction });
      }
    }
  }

  // Enroll into each course, wire chat, wire tests. Loop covers both
  // single-course purchases (courseIds.length === 1) and bundles.
  for (const courseId of courseIds) {
    const [enrollment] = await Enrollment.findOrCreate({
      where: { student_id: studentId, course_id: courseId },
      defaults: {
        student_id: studentId,
        course_id: courseId,
        enrollment_date: new Date(),
        progress_percentage: 0,
      },
      transaction,
    });
    enrollments.push(enrollment);

    const chatRoom = await ChatRoom.findOne({
      where: { course_id: courseId, is_active: true },
      transaction,
    });
    if (chatRoom) {
      await ChatRoomMember.findOrCreate({
        where: { room_id: chatRoom.id, user_id: studentId },
        defaults: { role: 'student', status: 'approved' },
        transaction,
      });
    }

    const publishedTests = await AssignedTest.findAll({
      where: { course_id: courseId, status: 'published' },
      attributes: ['id', 'end_date'],
      transaction,
    });
    for (const test of publishedTests) {
      if (test.end_date && new Date() > new Date(test.end_date)) continue;
      await TestAssignment.findOrCreate({
        where: { test_id: test.id, student_id: studentId },
        defaults: { due_date: test.end_date || null, status: 'pending' },
        transaction,
      });
    }
  }

  // Link the payment to the primary enrollment (first one). Bundles
  // still bump enrollment_count on every course but the Payment row
  // itself only tracks one enrollment_id.
  if (enrollments.length && !payment.enrollment_id) {
    await payment.update({ enrollment_id: enrollments[0].id }, { transaction });
  }

  // Bump enrollment_count on each course. Kept outside the courseIds
  // loop only to keep the update queries batched.
  await Course.increment('enrollment_count', {
    by: 1,
    where: { id: courseIds },
    transaction,
  });

  return { enrollments };
}

/**
 * Post-commit best-effort side-effects. Do NOT await these inside a
 * transaction — they hit external services and can hang.
 * Any failure is logged and swallowed.
 *
 * @param {object} opts
 * @param {number} opts.studentId
 * @param {number[]} opts.courseIds
 * @param {Payment} opts.payment
 * @param {string} [opts.gateway]  e.g. 'stripe', 'paystack', 'paypal', 'comp'
 * @param {boolean} [opts.sendEmails=true]
 */
async function runPostCommitSideEffects({ studentId, courseIds, payment, gateway = 'stripe', sendEmails = true }) {
  const NotificationsController = require('../../controllers/notifications/notificationsController');

  // Load fresh names/emails for the emails + notification link.
  const [student, courses] = await Promise.all([
    User.findByPk(studentId, { attributes: ['id', 'full_name', 'email'] }),
    Course.findAll({ where: { id: courseIds }, attributes: ['id', 'title'] }),
  ]);
  if (!student) return;

  const isBundle = courseIds.length > 1;
  const primaryCourseTitle = courses[0]?.title || 'your course';
  const primaryCourseId = courseIds[0];

  // In-app notification
  try {
    await NotificationsController.createNotification({
      user_id: studentId,
      type: 'course_enrollment',
      title: 'Enrollment Confirmed!',
      message: isBundle
        ? `Your payment was successful. You now have full access to all ${courseIds.length} courses in your bundle.`
        : 'Your payment was successful. You now have full access to your course.',
      link: isBundle ? '/my-courses' : `/courses/${primaryCourseId}`,
      priority: 'high',
    });
  } catch (e) {
    logger.warn(`Enrollment notification failed (non-critical): ${e.message}`);
  }

  // Payment receipt + congrats email (skip for comp'd enrollments)
  if (sendEmails && payment.payment_method !== 'comp') {
    try {
      await emailSvc.sendPaymentReceipt(student.email, student.full_name, {
        courseTitle: isBundle ? `${courseIds.length}-Course Bundle` : primaryCourseTitle,
        amountPaid: payment.amount,
        paymentPlan: payment.payment_plan,
        remainingAmount: payment.installment_remaining_amount,
        invoiceDate: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
        paymentId: payment.id,
        currency: payment.currency || 'USD',
      });
      await emailSvc.sendPaymentCongrats(student.email, student.full_name, {
        courseTitle: primaryCourseTitle,
        courseId: primaryCourseId,
      });
    } catch (e) {
      logger.warn(`Enrollment emails failed (non-critical): ${e.message}`);
    }
  }

  // Referral reward — first paid enrollment credits whoever referred
  // this user. Idempotent via Referral.status='pending' check.
  try {
    const { Referral } = require('../../models');
    const ref = await Referral.findOne({
      where: { referred_id: studentId, status: 'pending' },
    });
    if (ref) {
      await ref.update({ status: 'rewarded', rewarded_at: new Date() });
      await User.increment('referral_credits', { by: 1, where: { id: ref.referrer_id } });
      logger.info(`Referral rewarded: referrer ${ref.referrer_id} credited for user ${studentId}`);
    }
  } catch (e) {
    logger.warn(`Referral reward failed (non-critical): ${e.message}`);
  }

  // Badge check — enrollment milestones
  try {
    const BadgesController = require('../../controllers/badges/badgesController');
    BadgesController.checkAndAward(studentId, 'enrollment_count').catch(() => {});
  } catch (e) { /* silent */ }

  logger.info(
    `Enrollment side-effects (${gateway}) complete — payment ${payment.id} → user ${studentId} → courses [${courseIds.join(',')}]`
  );
}

/**
 * Resolve a bundle_id to its course IDs. Returns null if bundle is missing.
 */
async function resolveBundleCourseIds(bundleId) {
  if (!bundleId) return null;
  const bundle = await Bundle.findByPk(bundleId, {
    include: [{ model: Course, as: 'courses', attributes: ['id'], through: { attributes: [] } }],
  });
  if (!bundle) return null;
  return bundle.courses.map((c) => c.id);
}

module.exports = {
  runTransactionalSideEffects,
  runPostCommitSideEffects,
  resolveBundleCourseIds,
};
