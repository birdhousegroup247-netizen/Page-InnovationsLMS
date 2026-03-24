/**
 * Lead Drip Service — Sequence A
 * Sends timed emails to registered-but-not-enrolled leads.
 */

const { Op } = require('sequelize');
const { Lead, Course } = require('../../models');
const emailService = require('../email/emailService');
const logger = require('../../utils/logger');

const DAYS_MS = (n) => n * 24 * 60 * 60 * 1000;

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

  for (const step of STEPS) {
    const cutoff = new Date(Date.now() - step.afterMs);

    const leads = await Lead.findAll({
      where: {
        drip_status: step.fromStatus,
        registered_at: { [Op.lte]: cutoff },
        converted_at: null, // Skip already-converted leads
      },
      include: [
        {
          model: Course,
          as: 'course_interest',
          attributes: ['id', 'title'],
          required: false,
        },
      ],
      limit: 50, // Process in batches to avoid overwhelming the email server
    });

    for (const lead of leads) {
      try {
        const courseTitle = lead.course_interest?.title || 'database courses';
        await emailService[step.method](lead.email, lead.full_name, courseTitle);
        await lead.update({
          drip_status: step.toStatus,
          last_email_sent_at: new Date(),
        });
        totalProcessed++;
      } catch (err) {
        logger.error(`[LeadDrip] Failed ${step.method} for lead ${lead.id} (${lead.email}): ${err.message}`);
      }
    }
  }

  if (totalProcessed > 0) {
    logger.info(`[LeadDrip] Processed ${totalProcessed} lead email(s)`);
  }
}

module.exports = { processLeads };
