/**
 * Installment Reminder Service — Sequence C
 * Manages the 7-stage progressive lock system for 60/40 installment users.
 *
 * Stages (measured from installment_due_date):
 *   Day 0  → due date arrives (installment_due_date)
 *   Day +0 → D21 friendly reminder email
 *   Day +3 → D24 orange banner email
 *   Day +7 → D28 red urgent email
 *   Day +11→ D32 partial lock (disable new content) + email
 *   Day +14→ D35 soft lock (fullscreen overlay) + email
 *   Day +21→ D42 hard lock (user.registration_status='suspended') + email
 */

const { Op } = require('sequelize');
const { Payment, User, Course } = require('../../models');
const emailService = require('../email/emailService');
const logger = require('../../utils/logger');

const DAYS_MS = (n) => n * 24 * 60 * 60 * 1000;

// Sequence steps relative to installment_due_date
const STEPS = [
  { tag: 'r_d21', offsetMs: 0,           method: 'sendInstallmentReminderD21', lockDay: null },
  { tag: 'r_d24', offsetMs: DAYS_MS(3),  method: 'sendInstallmentReminderD24', lockDay: null },
  { tag: 'r_d28', offsetMs: DAYS_MS(7),  method: 'sendInstallmentReminderD28', lockDay: 32 },
  { tag: 'r_d32', offsetMs: DAYS_MS(11), method: 'sendInstallmentReminderD32', lockDay: null },
  { tag: 'r_d35', offsetMs: DAYS_MS(14), method: 'sendInstallmentReminderD35', lockDay: null },
  { tag: 'r_d42', offsetMs: DAYS_MS(21), method: 'sendInstallmentSuspendedD42', lockDay: null, suspend: true },
];

async function processInstallments() {
  let totalProcessed = 0;

  const FE = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Get all overdue/pending installment payments
  const payments = await Payment.findAll({
    where: {
      payment_plan: 'installment',
      installment_status: { [Op.in]: ['pending', 'overdue'] },
      payment_status: 'completed', // Upfront 60% was paid
      installment_due_date: { [Op.ne]: null },
    },
    include: [
      { model: User, as: 'student', attributes: ['id', 'email', 'full_name', 'registration_status'] },
      { model: Course, as: 'course', attributes: ['id', 'title'] },
    ],
    limit: 200,
  });

  for (const payment of payments) {
    if (!payment.student) continue;

    const dueDate = new Date(payment.installment_due_date);
    const sentTags = payment.metadata?.reminders_sent || [];

    // Mark as overdue if past due date and still 'pending'
    if (payment.installment_status === 'pending' && new Date() > dueDate) {
      await payment.update({ installment_status: 'overdue' });
    }

    const payUrl = `${FE}/checkout?course_id=${payment.course_id}&installment_payment=1`;
    const remainingAmount = payment.installment_remaining_amount || 0;

    for (const step of STEPS) {
      if (sentTags.includes(step.tag)) continue;

      const triggerAt = new Date(dueDate.getTime() + step.offsetMs);
      if (new Date() < triggerAt) continue;

      try {
        // D28 email includes the lock date (Day 32 from payment)
        const lockDate =
          step.lockDay === 32
            ? new Date(dueDate.getTime() + DAYS_MS(11))
            : null;

        await emailService[step.method](payment.student.email, payment.student.full_name, {
          remainingAmount,
          dueDate,
          payUrl,
          currency: payment.currency || 'USD',
          ...(lockDate && { lockDate }),
        });

        // Hard lock — suspend user account at Day 42
        if (step.suspend && payment.student.registration_status !== 'suspended') {
          await User.update(
            { registration_status: 'suspended' },
            { where: { id: payment.student.id } }
          );
          logger.warn(`[InstallmentReminder] Hard locked user ${payment.student.id} (${payment.student.email}) — payment ${payment.id}`);
        }

        // Save reminder tag
        const newMetadata = {
          ...(payment.metadata || {}),
          reminders_sent: [...sentTags, step.tag],
        };
        await payment.update({ metadata: newMetadata });
        sentTags.push(step.tag);

        totalProcessed++;
        logger.debug(`[InstallmentReminder] Sent '${step.tag}' to ${payment.student.email}`);
      } catch (err) {
        logger.error(`[InstallmentReminder] Failed '${step.tag}' for payment ${payment.id}: ${err.message}`);
      }
    }
  }

  if (totalProcessed > 0) {
    logger.info(`[InstallmentReminder] Processed ${totalProcessed} installment reminder(s)`);
  }
}

module.exports = { processInstallments };
