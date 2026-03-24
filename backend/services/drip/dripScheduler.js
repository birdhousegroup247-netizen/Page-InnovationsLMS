/**
 * Drip Scheduler
 * Master cron job that runs all email drip sequences hourly.
 * Registered in server.js on app startup.
 */

const cron = require('node-cron');
const leadDripService = require('./leadDripService');
const onboardingDripService = require('./onboardingDripService');
const installmentReminderService = require('./installmentReminderService');
const logger = require('../../utils/logger');

function startDripScheduler() {
  // Run at :05 past every hour (slight offset from the hour to avoid race conditions)
  cron.schedule('5 * * * *', async () => {
    logger.debug('[DripScheduler] Hourly check starting');

    try {
      await leadDripService.processLeads();
    } catch (err) {
      logger.error('[DripScheduler] leadDripService crashed:', err.message);
    }

    try {
      await onboardingDripService.processOnboarding();
    } catch (err) {
      logger.error('[DripScheduler] onboardingDripService crashed:', err.message);
    }

    try {
      await installmentReminderService.processInstallments();
    } catch (err) {
      logger.error('[DripScheduler] installmentReminderService crashed:', err.message);
    }
  });

  logger.info('[DripScheduler] Started — runs hourly at :05');
}

module.exports = { startDripScheduler };
