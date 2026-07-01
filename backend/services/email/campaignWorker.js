/**
 * Email campaign worker.
 *
 * Runs from the drip scheduler tick. Picks up any campaign whose
 * status is 'scheduled' AND scheduled_at <= NOW(), flips to 'sending',
 * fans out to the segment, and finally flips to 'sent'.
 *
 * Rate limit: BATCH_SIZE recipients per tick per campaign, so a
 * 10k-recipient blast on a 3k/mo Resend plan takes many ticks — that's
 * deliberate. We don't want a single campaign to drain the daily
 * quota and starve verification / receipt emails.
 */

const { Op } = require('sequelize');
const {
  EmailCampaign, EmailDelivery, User, Lead, Enrollment,
} = require('../../models');
const emailService = require('./emailService');
const logger = require('../../utils/logger');

const BATCH_SIZE = 100;  // recipients per tick per campaign

async function _resolveRecipients(campaign) {
  // Returns array of { email, name, kind: 'user' | 'lead', id }.
  switch (campaign.segment) {
    case 'all_students': {
      const rows = await User.findAll({
        where: { role: 'student', is_active: true, email_opt_out: false },
        attributes: ['id', 'email', 'full_name'],
      });
      return rows.map((u) => ({ email: u.email, name: u.full_name, kind: 'user', id: u.id }));
    }
    case 'all_instructors': {
      const rows = await User.findAll({
        where: {
          role: { [Op.in]: ['instructor', 'admin', 'super_admin'] },
          is_active: true,
          email_opt_out: false,
        },
        attributes: ['id', 'email', 'full_name'],
      });
      return rows.map((u) => ({ email: u.email, name: u.full_name, kind: 'user', id: u.id }));
    }
    case 'all_users': {
      const rows = await User.findAll({
        where: { is_active: true, email_opt_out: false },
        attributes: ['id', 'email', 'full_name'],
      });
      return rows.map((u) => ({ email: u.email, name: u.full_name, kind: 'user', id: u.id }));
    }
    case 'enrolled_in_course': {
      if (!campaign.segment_course_id) return [];
      const enrollments = await Enrollment.findAll({
        where: { course_id: campaign.segment_course_id },
        attributes: ['student_id'],
        raw: true,
      });
      const ids = enrollments.map((e) => e.student_id);
      if (ids.length === 0) return [];
      const rows = await User.findAll({
        where: { id: ids, is_active: true, email_opt_out: false },
        attributes: ['id', 'email', 'full_name'],
      });
      return rows.map((u) => ({ email: u.email, name: u.full_name, kind: 'user', id: u.id }));
    }
    case 'leads_not_converted': {
      const rows = await Lead.findAll({
        where: {
          converted_at: null,
          bounced_at: null,
          email_opt_out: false,
        },
        attributes: ['id', 'email', 'full_name'],
      });
      return rows.map((l) => ({ email: l.email, name: l.full_name, kind: 'lead', id: l.id }));
    }
    default:
      return [];
  }
}

async function processCampaigns() {
  const now = new Date();

  // Pick up campaigns due to send, and any in 'sending' that need
  // another batch. Newer campaigns first so a queue backlog doesn't
  // starve fresh sends.
  const campaigns = await EmailCampaign.findAll({
    where: {
      [Op.or]: [
        { status: 'scheduled', scheduled_at: { [Op.lte]: now } },
        { status: 'sending' },
      ],
    },
    order: [['scheduled_at', 'ASC']],
    limit: 5,   // don't process too many campaigns per tick
  });

  for (const campaign of campaigns) {
    try {
      if (campaign.status === 'scheduled') {
        await campaign.update({ status: 'sending' });
        // Materialize the full recipient list into EmailDelivery rows.
        // Subsequent ticks just process pending deliveries.
        const recipients = await _resolveRecipients(campaign);
        if (recipients.length === 0) {
          await campaign.update({
            status: 'sent',
            sent_at: new Date(),
          });
          logger.info(`[campaign-worker] Campaign ${campaign.id} sent — empty segment (0 recipients)`);
          continue;
        }
        await EmailDelivery.bulkCreate(
          recipients.map((r) => ({
            campaign_id: campaign.id,
            user_id: r.kind === 'user' ? r.id : null,
            lead_id: r.kind === 'lead' ? r.id : null,
            email: r.email,
            status: 'pending',
          }))
        );
        logger.info(`[campaign-worker] Campaign ${campaign.id} materialized ${recipients.length} deliveries`);
      }

      // Process one batch of pending deliveries.
      const pending = await EmailDelivery.findAll({
        where: { campaign_id: campaign.id, status: 'pending' },
        limit: BATCH_SIZE,
      });

      if (pending.length === 0) {
        // Nothing left — finalize.
        await campaign.update({ status: 'sent', sent_at: new Date() });
        logger.info(`[campaign-worker] Campaign ${campaign.id} complete — delivered=${campaign.delivered_count} failed=${campaign.failed_count} skipped=${campaign.skipped_count}`);
        continue;
      }

      let delivered = 0;
      let failed = 0;
      let skipped = 0;

      for (const d of pending) {
        // Resolve name for the greeting
        let name = 'there';
        if (d.user_id) {
          const u = await User.findByPk(d.user_id, { attributes: ['full_name'] });
          name = u?.full_name || name;
        } else if (d.lead_id) {
          const l = await Lead.findByPk(d.lead_id, { attributes: ['full_name'] });
          name = l?.full_name || name;
        }
        try {
          const res = await emailService.sendPromotionalEmail(d.email, name, {
            subject: campaign.subject,
            title: campaign.header_title || campaign.subject,
            bodyHtml: campaign.body_html,
            ctaText: campaign.cta_text || null,
            ctaUrl: campaign.cta_url || null,
            recipientKind: d.user_id ? 'user' : 'lead',
            recipientId: d.user_id || d.lead_id,
          });
          if (res.skipped === 'opted_out') {
            await d.update({ status: 'skipped', error: 'recipient opted out' });
            skipped++;
          } else {
            await d.update({ status: 'delivered', delivered_at: new Date() });
            delivered++;
          }
        } catch (err) {
          await d.update({ status: 'failed', error: err.message?.slice(0, 500) || 'unknown' });
          failed++;
        }
      }

      await campaign.increment(
        { delivered_count: delivered, failed_count: failed, skipped_count: skipped },
        { where: { id: campaign.id } }
      );
      logger.info(
        `[campaign-worker] Campaign ${campaign.id} batch: delivered=${delivered} failed=${failed} skipped=${skipped}`
      );
    } catch (err) {
      logger.error(`[campaign-worker] Campaign ${campaign.id} crashed: ${err.message}\n${err.stack || ''}`);
      await campaign.update({ status: 'failed', error_message: err.message?.slice(0, 500) || 'unknown' });
    }
  }
}

module.exports = { processCampaigns };
