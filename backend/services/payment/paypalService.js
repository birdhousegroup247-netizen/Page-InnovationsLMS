/**
 * PayPal Payment Service
 * Uses PayPal Orders v2 REST API directly (no SDK dependency) so we
 * can keep the sandbox/live switch dead simple via PAYPAL_MODE.
 *
 * Env required:
 *   PAYPAL_MODE          "sandbox" | "live"
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_WEBHOOK_ID    (only required when verifying webhooks)
 */

const axios = require('axios');
const logger = require('../../utils/logger');

const baseUrl = () =>
  (process.env.PAYPAL_MODE || 'sandbox').toLowerCase() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const requireCreds = () => {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set');
  }
};

// In-memory access-token cache (expires_in is typically ~9h)
let cachedToken = null;
let cachedTokenExpiresAt = 0;

const getAccessToken = async () => {
  requireCreds();
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 60_000) return cachedToken;

  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await axios.post(
    `${baseUrl()}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  cachedToken = res.data.access_token;
  cachedTokenExpiresAt = now + res.data.expires_in * 1000;
  return cachedToken;
};

const authHeaders = async () => ({
  Authorization: `Bearer ${await getAccessToken()}`,
  'Content-Type': 'application/json',
});

/**
 * Create a PayPal order (server-side). Returns { id, status, links }.
 * The frontend uses the returned `id` with the PayPal JS SDK to render the
 * approval flow; capture happens server-side via captureOrder().
 */
const createOrder = async ({ amount, currency = 'USD', reference, description }) => {
  const headers = await authHeaders();
  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: reference,
        description: description ? description.slice(0, 127) : undefined,
        amount: {
          currency_code: currency,
          value: Number(amount).toFixed(2),
        },
      },
    ],
    application_context: {
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      brand_name: 'Page Innovations',
    },
  };
  const res = await axios.post(`${baseUrl()}/v2/checkout/orders`, body, { headers });
  logger.info(`PayPal order created: ${res.data.id} ref=${reference}`);
  return res.data;
};

/**
 * Capture an approved PayPal order. Idempotent on PayPal side.
 * Returns the full order payload including capture data.
 */
const captureOrder = async (orderId) => {
  const headers = await authHeaders();
  const res = await axios.post(
    `${baseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {},
    { headers }
  );
  logger.info(`PayPal order captured: ${orderId} status=${res.data.status}`);
  return res.data;
};

/**
 * Get current order state (used as a verification fallback).
 */
const getOrder = async (orderId) => {
  const headers = await authHeaders();
  const res = await axios.get(
    `${baseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    { headers }
  );
  return res.data;
};

/**
 * Refund a previously-captured payment.
 * @param {string} captureId - PayPal capture ID (not order ID)
 * @param {number} [amount]  - Amount in major units; omit for full refund
 * @param {string} [currency='USD']
 */
const refundCapture = async ({ captureId, amount, currency = 'USD', note }) => {
  const headers = await authHeaders();
  const body = amount
    ? {
        amount: { value: Number(amount).toFixed(2), currency_code: currency },
        note_to_payer: note,
      }
    : {};
  const res = await axios.post(
    `${baseUrl()}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
    body,
    { headers }
  );
  logger.info(`PayPal refund issued: capture=${captureId} refund=${res.data.id}`);
  return res.data;
};

/**
 * Verify a PayPal webhook signature.
 * Asks PayPal directly (per docs) — there is no offline HMAC alternative.
 * Returns true on SUCCESS verification status.
 */
const verifyWebhookSignature = async ({ headers, rawBody, webhookId }) => {
  const id = webhookId || process.env.PAYPAL_WEBHOOK_ID;
  if (!id) {
    logger.warn('PAYPAL_WEBHOOK_ID not set — refusing to verify webhook');
    return false;
  }
  try {
    const authHdrs = await authHeaders();
    const body = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: id,
      webhook_event: typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString()),
    };
    const res = await axios.post(
      `${baseUrl()}/v1/notifications/verify-webhook-signature`,
      body,
      { headers: authHdrs }
    );
    return res.data.verification_status === 'SUCCESS';
  } catch (err) {
    logger.error(`PayPal webhook verification error: ${err.message}`);
    return false;
  }
};

module.exports = {
  getAccessToken,
  createOrder,
  captureOrder,
  getOrder,
  refundCapture,
  verifyWebhookSignature,
  _baseUrl: baseUrl,
};
