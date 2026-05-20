-- Add PayPal gateway support to payments table — PostgreSQL variant.
--
-- This is the Railway / production migration. The MySQL companion lives
-- at 20260519_add_paypal_to_payments.sql for local dev.
--
-- Idempotent: safe to run multiple times.
--
-- Run with:  psql "$DATABASE_URL" -f 20260519_add_paypal_to_payments.postgres.sql

BEGIN;

-- The payment_gateway enum type Sequelize creates is named
-- "enum_payments_payment_gateway". ALTER TYPE ... ADD VALUE cannot run
-- inside a transaction on Postgres < 12, so we COMMIT around it.
COMMIT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'paypal'
      AND enumtypid = 'enum_payments_payment_gateway'::regtype
  ) THEN
    ALTER TYPE enum_payments_payment_gateway ADD VALUE 'paypal';
  END IF;
EXCEPTION
  -- If the enum type does not exist yet (fresh DB), Sequelize will
  -- create it on first sync with the right values, so do nothing.
  WHEN undefined_object THEN NULL;
END $$;

BEGIN;

-- Add the PayPal-specific columns. Postgres supports IF NOT EXISTS
-- on ADD COLUMN since 9.6.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS paypal_order_id   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS paypal_capture_id VARCHAR(255);

-- Unique constraint on paypal_order_id (NULLs are allowed multiple times
-- in a UNIQUE constraint by Postgres default, which is what we want
-- for non-PayPal payments).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND tablename = 'payments'
      AND indexname = 'payments_paypal_order_id_key'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_paypal_order_id_key UNIQUE (paypal_order_id);
  END IF;
END $$;

-- Lookup index used by capture + webhook + verify paths.
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order_id
  ON payments(paypal_order_id);

COMMIT;
