/**
 * Onboarding Drip Service — Sequence B
 * Sends timed emails to newly paid users after enrollment.
 * Tracks which emails were sent via payment.metadata.onboarding_sent[].
 */

const { Op } = require('sequelize');
const { Payment, User, Course } = require('../../models');
const emailService = require('../email/emailService');
const logger = require('../../utils/logger');

const DAYS_MS = (n) => n * 24 * 60 * 60 * 1000;

// Steps keyed by a unique tag (stored in metadata to prevent re-sending)
const STEPS = [
  {
    tag: 'receipt',
    afterMs: 0, // Immediate — on payment completion
    send: async (payment, user, course) => {
      await emailService.sendPaymentReceipt(user.email, user.full_name, {
        courseTitle: course.title,
        amountPaid: payment.amount,
        paymentPlan: payment.payment_plan,
        remainingAmount: payment.installment_remaining_amount,
        invoiceDate: payment.payment_date
          ? new Date(payment.payment_date).toLocaleDateString('en-US', { dateStyle: 'long' })
          : null,
        paymentId: payment.id,
      });
    },
  },
  {
    tag: 'congrats',
    afterMs: 60 * 60 * 1000, // +1 hour
    send: async (payment, user, course) => {
      await emailService.sendPaymentCongrats(user.email, user.full_name, {
        courseTitle: course.title,
        courseId: course.id,
      });
    },
  },
  {
    tag: 'onboarding_d1',
    afterMs: DAYS_MS(1),
    send: async (payment, user, course) => {
      await emailService.sendOnboardingD1(user.email, user.full_name, {
        courseTitle: course.title,
        courseId: course.id,
      });
    },
  },
  {
    tag: 'onboarding_d3',
    afterMs: DAYS_MS(3),
    send: async (payment, user, course) => {
      await emailService.sendOnboardingD3(user.email, user.full_name, {
        courseTitle: course.title,
      });
    },
  },
  {
    tag: 'onboarding_d7',
    afterMs: DAYS_MS(7),
    send: async (payment, user, course) => {
      await emailService.sendOnboardingD7(user.email, user.full_name, {
        courseTitle: course.title,
      });
    },
  },
];

async function processOnboarding() {
  let totalProcessed = 0;

  // Get all completed payments that haven't finished the onboarding sequence
  const payments = await Payment.findAll({
    where: {
      payment_status: 'completed',
      payment_date: { [Op.ne]: null },
    },
    include: [
      { model: User, as: 'student', attributes: ['id', 'email', 'full_name'] },
      { model: Course, as: 'course', attributes: ['id', 'title'] },
    ],
    limit: 200,
  });

  for (const payment of payments) {
    if (!payment.student || !payment.course) continue;

    const paymentDate = new Date(payment.payment_date);
    const sentTags = payment.metadata?.onboarding_sent || [];

    for (const step of STEPS) {
      if (sentTags.includes(step.tag)) continue; // Already sent

      const readyAt = new Date(paymentDate.getTime() + step.afterMs);
      if (new Date() < readyAt) continue; // Not yet time

      try {
        await step.send(payment, payment.student, payment.course);

        // Mark as sent in metadata
        const newMetadata = {
          ...(payment.metadata || {}),
          onboarding_sent: [...sentTags, step.tag],
        };
        await payment.update({ metadata: newMetadata });
        sentTags.push(step.tag); // Keep local copy in sync for the inner loop

        totalProcessed++;
        logger.debug(`[OnboardingDrip] Sent '${step.tag}' to user ${payment.student.email} (payment ${payment.id})`);
      } catch (err) {
        logger.error(`[OnboardingDrip] Failed '${step.tag}' for payment ${payment.id}: ${err.message}`);
      }
    }
  }

  if (totalProcessed > 0) {
    logger.info(`[OnboardingDrip] Processed ${totalProcessed} onboarding email(s)`);
  }
}

module.exports = { processOnboarding };
