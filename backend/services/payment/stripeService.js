/**
 * Stripe Payment Service
 * All Stripe API interactions go through here — never call Stripe directly from controllers.
 */

const Stripe = require('stripe');
const logger = require('../../utils/logger');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Create a Stripe Checkout Session.
 * Returns a hosted checkout URL the user is redirected to.
 *
 * @param {Object} options
 * @param {number}  options.userId
 * @param {number}  options.courseId
 * @param {string}  options.courseTitle
 * @param {number}  options.unitAmount   - Amount in cents (e.g. 29900 = $299.00)
 * @param {string}  options.paymentPlan  - 'full' | 'installment'
 * @param {string}  options.successUrl
 * @param {string}  options.cancelUrl
 * @param {string|null} options.couponStripeId - Stripe coupon ID if one was applied
 */
const createCheckoutSession = async ({
  userId,
  courseId,
  courseTitle,
  unitAmount,
  paymentPlan,
  successUrl,
  cancelUrl,
  couponStripeId = null,
  extraMetadata = {},
}) => {
  const descriptionMap = {
    installment: '60% upfront payment (remaining 40% due in 21 days)',
    installment_second: 'Remaining 40% installment balance',
  };

  const sessionParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: courseTitle,
            description: descriptionMap[paymentPlan] || 'Full course access — lifetime',
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: String(userId),
      course_id: String(courseId),
      payment_plan: paymentPlan,
      ...extraMetadata,
    },
    client_reference_id: String(userId),
  };

  // Apply Stripe coupon if provided
  if (couponStripeId) {
    sessionParams.discounts = [{ coupon: couponStripeId }];
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  logger.info(`Stripe checkout session created: ${session.id} for user ${userId}, course ${courseId}`);
  return session;
};

/**
 * Retrieve a completed Checkout Session with line items.
 * Used to verify payment after Stripe redirects back.
 */
const retrieveCheckoutSession = async (sessionId) => {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'payment_intent'],
  });
};

/**
 * Construct and verify a Stripe webhook event.
 * Throws if signature is invalid — never process unverified webhooks.
 *
 * @param {Buffer} rawBody  - Raw request body (must NOT be JSON-parsed)
 * @param {string} signature - Value of `stripe-signature` header
 */
const constructWebhookEvent = (rawBody, signature) => {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

/**
 * Create a Stripe Coupon object (for discount application in checkout).
 * We create these on-the-fly when an admin coupon is applied.
 */
const createStripeCoupon = async ({ discountType, discountValue, name }) => {
  const params = { name };

  if (discountType === 'percentage') {
    params.percent_off = discountValue;
    params.duration = 'once';
  } else {
    params.amount_off = Math.round(discountValue * 100); // convert to cents
    params.currency = 'usd';
    params.duration = 'once';
  }

  const coupon = await stripe.coupons.create(params);
  logger.info(`Stripe coupon created: ${coupon.id}`);
  return coupon;
};

module.exports = {
  createCheckoutSession,
  retrieveCheckoutSession,
  constructWebhookEvent,
  createStripeCoupon,
};
