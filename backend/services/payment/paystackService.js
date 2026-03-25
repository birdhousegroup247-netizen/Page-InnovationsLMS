/**
 * Paystack Payment Service
 * All Paystack API interactions go through here.
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../utils/logger');

const PAYSTACK_BASE = 'https://api.paystack.co';

const getSecretKey = () => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY environment variable is not set');
  }
  return process.env.PAYSTACK_SECRET_KEY;
};

const paystackHeaders = () => ({
  Authorization: `Bearer ${getSecretKey()}`,
  'Content-Type': 'application/json',
});

/**
 * Verify a Paystack transaction by reference.
 * Returns full transaction data including status and amount.
 */
const verifyTransaction = async (reference) => {
  const res = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: paystackHeaders() }
  );
  logger.info(`Paystack transaction verified: ${reference} — status: ${res.data.data.status}`);
  return res.data.data;
};

/**
 * Issue a Paystack refund.
 * @param {string} reference  - Paystack transaction reference
 * @param {number} [amount]   - Amount in USD to refund (omit for full refund)
 */
const refundTransaction = async ({ reference, amount }) => {
  const params = { transaction: reference };
  if (amount) params.amount = Math.round(amount * 100); // to cents
  const res = await axios.post(`${PAYSTACK_BASE}/refund`, params, { headers: paystackHeaders() });
  logger.info(`Paystack refund initiated: ${reference}`);
  return res.data.data;
};

/**
 * Verify Paystack webhook HMAC-SHA512 signature.
 * Paystack signs the raw body with your secret key.
 */
const verifyWebhookSignature = (rawBody, signature) => {
  if (!process.env.PAYSTACK_SECRET_KEY || !signature) return false;
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
};

module.exports = { verifyTransaction, refundTransaction, verifyWebhookSignature };
