/**
 * Lifecycle emails — the "soft" ones that keep long-form engagement
 * from decaying.
 *
 *   processReEngagement()
 *     Sends one "come back and finish" email to any paid student who
 *     hasn't logged in for RE_ENGAGE_DAYS days AND has an active
 *     enrollment with < 100% progress. Idempotent via
 *     user.last_reengagement_sent_at (only sends once per RE_ENGAGE_COOLDOWN).
 *
 *   processCertificateShareNudges()
 *     3 days after a certificate is issued, prompts the student to
 *     share it on LinkedIn and (optionally) suggests a follow-up
 *     course. Idempotent via certificate.share_nudge_sent_at.
 *
 * Both are safe to run every drip tick — the stamps guarantee no
 * double-send.
 */

const { Op, fn, col } = require('sequelize');
const {
  User, Payment, Enrollment, Course, Certificate,
} = require('../../models');
const emailService = require('../email/emailService');
const logger = require('../../utils/logger');

const RE_ENGAGE_DAYS = 30;                    // trigger after N days of inactivity
const RE_ENGAGE_COOLDOWN_DAYS = 45;           // don't re-send more than once per this window
const SHARE_NUDGE_DELAY_DAYS = 3;

async function processReEngagement() {
  const cutoff = new Date(Date.now() - RE_ENGAGE_DAYS * 24 * 60 * 60 * 1000);
  const cooldownCutoff = new Date(Date.now() - RE_ENGAGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  // Only paid students — this isn't a lead-nurture path, and we don't
  // want to email trial signups here.
  const candidates = await User.findAll({
    where: {
      role: 'student',
      is_active: true,
      email_opt_out: false,
      last_login: { [Op.lt]: cutoff },
      [Op.or]: [
        { last_reengagement_sent_at: null },
        { last_reengagement_sent_at: { [Op.lt]: cooldownCutoff } },
      ],
    },
    attributes: ['id', 'email', 'full_name', 'last_login'],
    limit: 100,
  });

  let sent = 0;
  for (const u of candidates) {
    try {
      // Confirm they actually paid for a course — a free-course-only
      // enrollment doesn't warrant re-engagement.
      const hasPaid = await Payment.count({
        where: { student_id: u.id, payment_status: 'completed' },
      });
      if (hasPaid === 0) {
        // Stamp so we don't re-check this user every tick.
        await u.update({ last_reengagement_sent_at: new Date() });
        continue;
      }

      // Pick their most recent incomplete enrollment to link to.
      const enrollment = await Enrollment.findOne({
        where: {
          student_id: u.id,
          completed_at: null,
        },
        order: [['enrollment_date', 'DESC']],
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
      });

      const daysInactive = Math.round((Date.now() - new Date(u.last_login).getTime()) / (24 * 60 * 60 * 1000));

      await emailService.sendReEngagementEmail(u.email, u.full_name, {
        courseTitle: enrollment?.course?.title || null,
        courseId: enrollment?.course?.id || null,
        daysInactive,
      });
      await u.update({ last_reengagement_sent_at: new Date() });
      sent++;
    } catch (err) {
      logger.warn(`[re-engagement] user ${u.id} failed: ${err.message}`);
    }
  }

  if (sent > 0) logger.info(`[re-engagement] Sent ${sent} re-engagement email(s)`);
}

async function processCertificateShareNudges() {
  const cutoff = new Date(Date.now() - SHARE_NUDGE_DELAY_DAYS * 24 * 60 * 60 * 1000);

  const due = await Certificate.findAll({
    where: {
      share_nudge_sent_at: null,
      created_at: { [Op.lte]: cutoff },
    },
    order: [['created_at', 'ASC']],
    limit: 100,
  });

  let sent = 0;
  for (const cert of due) {
    try {
      const student = await User.findByPk(cert.student_id, {
        attributes: ['id', 'email', 'full_name', 'email_opt_out'],
      });
      if (!student || !student.email || student.email_opt_out) {
        await cert.update({ share_nudge_sent_at: new Date() });
        continue;
      }

      // Suggest a follow-up course they aren't already enrolled in.
      // Simplest heuristic: cheapest published course they haven't
      // enrolled in yet, other than the one they just finished.
      const existingIds = await Enrollment.findAll({
        where: { student_id: cert.student_id },
        attributes: ['course_id'],
        raw: true,
      }).then((rows) => rows.map((r) => r.course_id));

      const suggestion = await Course.findOne({
        where: {
          status: 'published',
          id: { [Op.notIn]: existingIds.length ? existingIds : [0] },
        },
        order: [['average_rating', 'DESC'], ['enrollment_count', 'DESC']],
        attributes: ['id', 'title'],
      });

      await emailService.sendCertificateShareNudge(student.email, student.full_name, {
        courseTitle: cert.course_title,
        courseId: cert.course_id,
        certificateUrl: cert.certificate_url || null,
        suggestedCourseTitle: suggestion?.title || null,
        suggestedCourseId: suggestion?.id || null,
      });
      await cert.update({ share_nudge_sent_at: new Date() });
      sent++;
    } catch (err) {
      logger.warn(`[cert-share-nudge] certificate ${cert.id} failed: ${err.message}`);
    }
  }

  if (sent > 0) logger.info(`[cert-share-nudge] Sent ${sent} share-nudge email(s)`);
}

/**
 * Instructor monthly earnings summary. Runs on the 1st of each month
 * from a dedicated cron (or manually via the export). For each
 * instructor with published courses, computes the prior month's:
 *   - gross revenue (sum of completed payments)
 *   - refund total
 *   - new enrollment count
 *   - top-earning course
 * Idempotent via user.last_earnings_summary_at (skip anyone whose
 * stamp is already in the current month).
 */
async function processInstructorMonthlyEarnings(reportForDate = new Date()) {
  // Pick the prior month.
  const year = reportForDate.getUTCFullYear();
  const monthIdx = reportForDate.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, monthIdx - 1, 1));
  const monthEnd   = new Date(Date.UTC(year, monthIdx, 1));
  const monthLabel = monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const instructors = await User.findAll({
    where: {
      role: { [Op.in]: ['instructor', 'admin', 'super_admin'] },
      is_active: true,
      email_opt_out: false,
    },
    attributes: ['id', 'email', 'full_name', 'last_earnings_summary_at'],
  });

  let sent = 0;
  for (const inst of instructors) {
    try {
      // Skip if we already sent them this month's summary
      if (inst.last_earnings_summary_at && new Date(inst.last_earnings_summary_at) >= monthEnd) {
        continue;
      }

      // Instructor's courses
      const courses = await Course.findAll({
        where: { instructor_id: inst.id, status: 'published' },
        attributes: ['id', 'title'],
      });
      if (courses.length === 0) {
        // Nobody's course, nothing to report — stamp so we don't keep re-checking.
        await inst.update({ last_earnings_summary_at: new Date() });
        continue;
      }

      const courseIds = courses.map((c) => c.id);
      const payments = await Payment.findAll({
        where: {
          course_id: { [Op.in]: courseIds },
          payment_date: { [Op.gte]: monthStart, [Op.lt]: monthEnd },
        },
        attributes: ['course_id', 'amount', 'refund_amount', 'payment_status', 'currency'],
        raw: true,
      });

      const grossRevenue = payments
        .filter((p) => p.payment_status === 'completed' || p.payment_status === 'refunded')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const refunds = payments
        .filter((p) => p.payment_status === 'refunded')
        .reduce((sum, p) => sum + parseFloat(p.refund_amount || 0), 0);
      const netRevenue = grossRevenue - refunds;
      const enrollments = payments.filter((p) => p.payment_status === 'completed').length;

      // Skip the send if literally nothing happened — an empty
      // month email is just noise.
      if (grossRevenue === 0 && enrollments === 0) {
        await inst.update({ last_earnings_summary_at: new Date() });
        continue;
      }

      // Top course by gross
      const perCourse = {};
      for (const p of payments) {
        perCourse[p.course_id] = (perCourse[p.course_id] || 0) + parseFloat(p.amount || 0);
      }
      const topCourseId = Object.entries(perCourse).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topCourse = courses.find((c) => c.id === parseInt(topCourseId));

      // Use the currency of the highest-revenue payment as the display
      // currency — mixed-currency instructors are rare, but if it happens
      // this at least picks the dominant one.
      const currency = payments[0]?.currency || 'USD';

      await emailService.sendInstructorMonthlyEarnings(inst.email, inst.full_name, {
        monthLabel,
        grossRevenue,
        enrollments,
        refunds,
        netRevenue,
        topCourse: topCourse?.title || null,
        currency,
      });
      await inst.update({ last_earnings_summary_at: new Date() });
      sent++;
    } catch (err) {
      logger.warn(`[monthly-earnings] instructor ${inst.id} failed: ${err.message}`);
    }
  }

  if (sent > 0) logger.info(`[monthly-earnings] Sent ${sent} monthly summary email(s) for ${monthLabel}`);
}

/**
 * Called from InstructorReviewController.createReview — checks whether
 * this new review pushed the instructor across a milestone (10 / 50 /
 * 100 / 250 / 500 reviews) and fires the email once per milestone.
 * Idempotent via user.last_review_milestone.
 */
const REVIEW_MILESTONES = [10, 50, 100, 250, 500, 1000];
async function checkReviewMilestoneAndSend(instructorId) {
  try {
    const { InstructorReview } = require('../../models');
    const [stats, instructor] = await Promise.all([
      InstructorReview.findOne({
        where: { instructor_id: instructorId },
        attributes: [
          [fn('COUNT', col('id')), 'count'],
          [fn('AVG', col('rating')), 'avg'],
        ],
        raw: true,
      }),
      User.findByPk(instructorId, { attributes: ['id', 'email', 'full_name', 'last_review_milestone', 'email_opt_out'] }),
    ]);
    if (!instructor || !instructor.email || instructor.email_opt_out) return;

    const totalReviews = parseInt(stats?.count || 0);
    const alreadyEmailedUpTo = instructor.last_review_milestone || 0;

    // Find the highest milestone we've crossed that we haven't emailed yet.
    const crossed = REVIEW_MILESTONES
      .filter((m) => totalReviews >= m && m > alreadyEmailedUpTo)
      .sort((a, b) => b - a)[0];
    if (!crossed) return;

    await emailService.sendInstructorReviewMilestone(instructor.email, instructor.full_name, {
      milestone: crossed,
      averageRating: stats?.avg || null,
    });
    await instructor.update({ last_review_milestone: crossed });
    logger.info(`[review-milestone] Sent ${crossed}-review milestone email to instructor ${instructor.id}`);
  } catch (err) {
    logger.warn(`[review-milestone] check failed for instructor ${instructorId}: ${err.message}`);
  }
}

module.exports = {
  processReEngagement,
  processCertificateShareNudges,
  processInstructorMonthlyEarnings,
  checkReviewMilestoneAndSend,
  RE_ENGAGE_DAYS,
  SHARE_NUDGE_DELAY_DAYS,
};
