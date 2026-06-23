/**
 * Cloudflare Turnstile verification helper.
 *
 * Why Turnstile: invisible (or near-invisible) CAPTCHA that's free and
 * doesn't require users to click traffic-light puzzles. Goal here is to
 * blunt automated signup spam — bots filling /api/auth/register from
 * scripts without solving Turnstile's challenge in a real browser.
 *
 * Activation is env-gated: set TURNSTILE_SECRET_KEY to turn it on. Until
 * the key is set the verifier is a no-op so dev/local environments are
 * unaffected.
 */

const axios = require('axios');
const logger = require('./logger');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify a Turnstile token from a client. Returns true if valid OR if
 * Turnstile is not configured (no-op). Returns false on a real failure
 * so the caller can reject the request.
 */
async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Not configured — accept everything (dev/test environments).
    return { ok: true, skipped: true };
  }
  if (!token) {
    return { ok: false, reason: 'missing-token' };
  }
  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (remoteIp) params.append('remoteip', remoteIp);

    const res = await axios.post(VERIFY_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000,
    });
    if (res.data?.success) {
      return { ok: true };
    }
    logger.warn(`[Turnstile] verify failed: ${JSON.stringify(res.data?.['error-codes'] || [])}`);
    return { ok: false, reason: (res.data?.['error-codes'] || ['unknown']).join(',') };
  } catch (err) {
    logger.warn(`[Turnstile] verify network error: ${err.message}`);
    // Fail-open on network error so a Cloudflare outage doesn't take down
    // signups. The bot has to beat the front-end widget regardless.
    return { ok: true, degraded: true };
  }
}

module.exports = { verifyTurnstile };
