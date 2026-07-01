/**
 * Lead Drip Service — Sequence A
 * Sends timed emails to registered-but-not-enrolled leads.
 */

const { Op } = require('sequelize');
const { Lead, Course } = require('../../models');
const emailService = require('../email/emailService');
const logger = require('../../utils/logger');

const DAYS_MS = (n) => n * 24 * 60 * 60 * 1000;
// Give up on a lead after this many consecutive send failures at the
// same drip_status. Log-spam guard: without this the every-hour cron
// retries a bounced address forever.
const MAX_BOUNCES = 5;

// Each step: find leads in fromStatus that have been there for at least afterMs
const STEPS = [
  { fromStatus: 'registered',   afterMs: 0,           toStatus: 'welcome_sent', method: 'sendLeadWelcome' },
  { fromStatus: 'welcome_sent', afterMs: DAYS_MS(1),  toStatus: 'd1_sent',      method: 'sendLeadFollowupD1' },
  { fromStatus: 'd1_sent',      afterMs: DAYS_MS(3),  toStatus: 'd3_sent',      method: 'sendLeadFollowupD3' },
  { fromStatus: 'd3_sent',      afterMs: DAYS_MS(7),  toStatus: 'd7_sent',      method: 'sendLeadFollowupD7' },
  { fromStatus: 'd7_sent',      afterMs: DAYS_MS(14), toStatus: 'd14_sent',     method: 'sendLeadFollowupD14' },
];

async function processLeads() {
  let totalProcessed = 0;
  let totalBounced = 0;

  for (const step of STEPS) {
    const cutoff = new Date(Date.now() - step.afterMs);

    const leads = await Lead.findAll({
      where: {
        drip_status: step.fromStatus,
        registered_at: { [Op.lte]: cutoff },
        converted_at: null,       // Skip already-converted leads
        bounced_at: null,         // Skip permanently-bounced leads
        email_opt_out: false,     // Skip anyone who unsubscribed
      },
      include: [
        {
          model: Course,
          as: 'course_interest',
          attributes: ['id', 'title'],
          required: false,
        },
      ],
      limit: 50, // Batch cap so a single sweep doesn't blow the email quota
    });

    for (const lead of leads) {
      try {
        const courseTitle = lead.course_interest?.title || 'database courses';
        const result = await emailService[step.method](lead.email, lead.full_name, courseTitle);
        // sendEmail returns { skipped: 'opted_out' } if the caller
        // already unsubscribed — treat that like a successful send so
        // the drip doesn't loop on this lead forever.
        await lead.update({
          drip_status: step.toStatus,
          last_email_sent_at: new Date(),
          bounce_count: 0,  // success — reset the failure counter
        });
        totalProcessed++;
      } catch (err) {
        const newBounces = (lead.bounce_count || 0) + 1;
        if (newBounces >= MAX_BOUNCES) {
          await lead.update({
            bounce_count: newBounces,
            bounced_at: new Date(),
          });
          totalBounced++;
          logger.warn(
            `[LeadDrip] Lead ${lead.id} (${lead.email}) permanently bounced after ${newBounces} failures at ${step.fromStatus}`
          );
        } else {
          await lead.update({ bounce_count: newBounces });
        }
        logger.error(
          `[LeadDrip] Failed ${step.method} for lead ${lead.id} (${lead.email}) — attempt ${newBounces}/${MAX_BOUNCES}: ${err.message}`
        );
      }
    }
  }

  if (totalProcessed > 0 || totalBounced > 0) {
    logger.info(`[LeadDrip] Processed ${totalProcessed} email(s), permanently bounced ${totalBounced}`);
  }
}

module.exports = { processLeads };
