-- Add PayPal gateway support to payments table.
-- Idempotent: safe to run multiple times.

ALTER TABLE payments
  MODIFY COLUMN payment_gateway ENUM('stripe', 'paystack', 'paypal') NOT NULL DEFAULT 'stripe';

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS paypal_capture_id VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS idx_payments_paypal_order_id ON payments(paypal_order_id);
