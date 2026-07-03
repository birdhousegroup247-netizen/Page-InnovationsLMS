/**
 * Birthday Service
 *
 * - Daily cron at 06:05 UTC fires a "Happy Birthday from Page Innovation"
 *   notification for every user whose date_of_birth matches today
 *   (month + day, year-agnostic). Idempotent — guarded by the
 *   user.birthday_celebrated_year field so re-runs in the same day
 *   don't double-notify.
 *
 * - getCelebrationFor(user) is used by the on-open endpoint to drive
 *   the in-app celebration modal. Returns null if there's nothing
 *   to show, or { status: 'today' | 'belated', daysAgo } if the
 *   user has an unseen birthday in the current year.
 *
 * Grace window for the belated celebration: 10 days. After that we
 * give up and wait until next year — surprising someone with a
 * "your birthday was 30 days ago" message would be weird.
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, sequelize } = require('../../models');
const NotificationsController = require('../../controllers/notifications/notificationsController');
const emailService = require('../email/emailService');
const logger = require('../../utils/logger');

const BELATED_GRACE_DAYS = 10;

// Compute "days between today and this year's birthday" given a
// stored date_of_birth string like '1995-06-24'. Returns:
//   0  => today is their birthday
//   N>0 => N days ago this year
//   N<0 => N days in the future
//   null => no DOB on file
function daysSinceThisYearBirthday(dob, now = new Date()) {
  if (!dob) return null;
  // dob can be a JS Date (DATEONLY pulled as Date) or a YYYY-MM-DD
  // string — normalize to month + day in UTC so the comparison
  // doesn't drift across timezones.
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const thisYearBday = new Date(Date.UTC(today.getUTCFullYear(), month, day));
  const ms = today.getTime() - thisYearBday.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

async function runDailyBirthdayJob() {
  const year = new Date().getUTCFullYear();
  // Pull every user with a DOB whose this-year birthday is today.
  // We can't filter on EXTRACT in a portable way through ORMs, so
  // fetch the small ones and filter in JS.
  const users = await User.findAll({
    where: { date_of_birth: { [Op.ne]: null }, is_active: true },
    attributes: ['id', 'full_name', 'email', 'date_of_birth', 'birthday_celebrated_year'],
  });

  let fired = 0;
  for (const u of users) {
    if (daysSinceThisYearBirthday(u.date_of_birth) !== 0) continue;
    if (u.birthday_celebrated_year === year) continue; // already wished this year
    try {
      // Personalized birthday note, written like a human at Page Innovation
      // would draft it. Keeps a steady warmth, names them by their
      // first name, and ends on the learning journey so the message
      // doubles as encouragement rather than a generic ping.
      const firstName = (u.full_name?.split(' ')[0] || 'there').trim();
      const message =
        `Happy Birthday, ${firstName}! 🎂 ` +
        `Everyone at Page Innovation is rooting for you today. ` +
        `Thank you for letting us be a small part of your learning journey — ` +
        `the curiosity you bring to every lesson is exactly what makes growth happen. ` +
        `Here's to another year of building, breaking, and getting better. We can't wait to see what you create next. 💙`;
      await NotificationsController.createNotification({
        user_id: u.id,
        type: 'birthday',
        title: `🎉 Happy Birthday, ${firstName}!`,
        message,
        link: '/notifications',
        priority: 'normal',
      });
      // Fire the email alongside the notification — someone who
      // isn't in the app today still gets the wish. Fire-and-forget
      // because a transport hiccup shouldn't kill the batch.
      if (u.email) {
        emailService.sendBirthdayEmail(u.email, u.full_name).catch((err) => {
          logger.warn(`[Birthday] email failed for user ${u.id}: ${err.message}`);
        });
      }
      fired += 1;
    } catch (err) {
      logger.warn(`[Birthday] notif failed for user ${u.id}: ${err.message}`);
    }
  }
  if (fired > 0) {
    logger.info(`[Birthday] daily job sent ${fired} wish(es)`);
  }
  return fired;
}

function startBirthdayScheduler() {
  // 06:05 UTC every day — slightly after the top of the hour so we
  // don't collide with the drip scheduler at :05 minute past hourly.
  cron.schedule('5 6 * * *', async () => {
    try {
      await runDailyBirthdayJob();
    } catch (err) {
      logger.error(`[Birthday] daily job crashed: ${err.message}\n${err.stack || ''}`);
    }
  });
  logger.info('[Birthday] Scheduler started — runs daily at 06:05 UTC');
}

// Returns the celebration payload for the modal, or null. Also
// idempotent — caller decides when to flip birthday_celebrated_year
// (we don't flip it here so the modal can show every reload until
// the user dismisses).
function getCelebrationFor(user) {
  if (!user?.date_of_birth) return null;
  const year = new Date().getUTCFullYear();
  if (user.birthday_celebrated_year === year) return null;
  const days = daysSinceThisYearBirthday(user.date_of_birth);
  if (days === null) return null;
  if (days === 0) return { status: 'today', days_ago: 0 };
  if (days > 0 && days <= BELATED_GRACE_DAYS) return { status: 'belated', days_ago: days };
  return null;
}

module.exports = {
  startBirthdayScheduler,
  runDailyBirthdayJob,
  getCelebrationFor,
  daysSinceThisYearBirthday,
  BELATED_GRACE_DAYS,
};
