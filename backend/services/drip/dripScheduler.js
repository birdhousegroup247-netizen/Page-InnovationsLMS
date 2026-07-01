/**
 * Drip Scheduler
 * Master cron job that runs all email drip sequences hourly.
 * Registered in server.js on app startup.
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const leadDripService = require('./leadDripService');
const onboardingDripService = require('./onboardingDripService');
const installmentReminderService = require('./installmentReminderService');
const campaignWorker = require('../email/campaignWorker');
const lifecycleService = require('../lifecycle/lifecycleService');
const logger = require('../../utils/logger');

function startDripScheduler() {
  // Run at :05 past every hour (slight offset from the hour to avoid race conditions)
  cron.schedule('5 * * * *', async () => {
    logger.debug('[DripScheduler] Hourly check starting');

    // Log the full error (.message can be empty for some Sequelize errors —
    // we'd see "crashed:" with no clue what broke). `.stack` covers both cases.
    try {
      await leadDripService.processLeads();
    } catch (err) {
      logger.error(`[DripScheduler] leadDripService crashed: ${err.message || err.name || 'unknown'}\n${err.stack || ''}`);
    }

    try {
      await onboardingDripService.processOnboarding();
    } catch (err) {
      logger.error(`[DripScheduler] onboardingDripService crashed: ${err.message || err.name || 'unknown'}\n${err.stack || ''}`);
    }

    try {
      await installmentReminderService.processInstallments();
    } catch (err) {
      logger.error(`[DripScheduler] installmentReminderService crashed: ${err.message || err.name || 'unknown'}\n${err.stack || ''}`);
    }

    try {
      await campaignWorker.processCampaigns();
    } catch (err) {
      logger.error(`[DripScheduler] campaignWorker crashed: ${err.message || err.name || 'unknown'}\n${err.stack || ''}`);
    }

    try {
      await lifecycleService.processReEngagement();
    } catch (err) {
      logger.error(`[DripScheduler] processReEngagement crashed: ${err.message || err.name || 'unknown'}\n${err.stack || ''}`);
    }

    try {
      await lifecycleService.processCertificateShareNudges();
    } catch (err) {
      logger.error(`[DripScheduler] processCertificateShareNudges crashed: ${err.message || err.name || 'unknown'}\n${err.stack || ''}`);
    }
  });

  // Instructor monthly earnings summary — 06:15 UTC on the 1st of each
  // month. Kept off the hourly tick so a wide fanout doesn't sit on
  // top of the drip processing.
  cron.schedule('15 6 1 * *', async () => {
    try {
      await lifecycleService.processInstructorMonthlyEarnings();
    } catch (err) {
      logger.error(`[DripScheduler] processInstructorMonthlyEarnings crashed: ${err.message || err.name || 'unknown'}\n${err.stack || ''}`);
    }
  });

  // Notification retention — 03:20 UTC daily. Deletes read
  // notifications older than 90 days so power users don't accumulate
  // 10k+ rows over a year. Unread rows never age out — they're
  // actionable by definition.
  cron.schedule('20 3 * * *', async () => {
    try {
      const { Notification } = require('../../models');
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const deleted = await Notification.destroy({
        where: {
          is_read: true,
          created_at: { [Op.lt]: cutoff },
        },
      });
      if (deleted > 0) {
        logger.info(`[notif-retention] Purged ${deleted} read notifications older than 90 days`);
      }
    } catch (err) {
      logger.error(`[notif-retention] crashed: ${err.message || 'unknown'}\n${err.stack || ''}`);
    }
  });

  logger.info('[DripScheduler] Started — hourly at :05, monthly earnings at 06:15 UTC on the 1st, notif retention 03:20 UTC daily');
}

module.exports = { startDripScheduler };
