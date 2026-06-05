-- Migration: Reconcile courses + users with the Sequelize models (PostgreSQL)
-- Date: 2026-06-05
-- Why:
--   The earlier MySQL-syntax migrations (notably 20251225_update_courses_table.sql,
--   add_instructor_status.sql, the referral/discord/leads migrations) cannot run on
--   Postgres, and sync({force:false}) never alters existing tables. As a result the
--   Railway Postgres `courses` table still has `difficulty` (not `level`) and no
--   `price`, and `users` is missing instructor_status / registration_status / lead_id /
--   referral_code / referral_credits / discord_user_id / discord_access_token.
--   That 500s the public catalog (GET /api/courses) and login (POST /api/auth/login).
--
-- This script is fully idempotent: safe to run repeatedly and safe whether or not
-- any individual column already exists.
--
-- NOTE: This mirrors the dialect-agnostic auto-migration block in server.js, which
--       applies the same changes automatically on every boot. Run this only if you
--       prefer to patch the DB by hand via psql.

-- ---------------------------------------------------------------------------
-- COURSES
-- ---------------------------------------------------------------------------

-- level (enum) — replaces the legacy `difficulty` column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_courses_level') THEN
    CREATE TYPE "enum_courses_level" AS ENUM ('beginner', 'intermediate', 'advanced');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'level'
  ) THEN
    ALTER TABLE courses ADD COLUMN level "enum_courses_level" DEFAULT 'beginner';
    -- Backfill from the legacy difficulty column if present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'courses' AND column_name = 'difficulty'
    ) THEN
      EXECUTE 'UPDATE courses SET level = difficulty::text::"enum_courses_level" WHERE level IS NULL';
    END IF;
  END IF;
END $$;

-- price
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0.00;

-- discord columns
ALTER TABLE courses ADD COLUMN IF NOT EXISTS discord_role_id    VARCHAR(100) DEFAULT NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS discord_channel_id VARCHAR(100) DEFAULT NULL;

-- status enum needs the 'pending' value (admin sets courses to pending).
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block — run standalone.
ALTER TYPE "enum_courses_status" ADD VALUE IF NOT EXISTS 'pending';

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------

-- instructor_status (enum)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_instructor_status') THEN
    CREATE TYPE "enum_users_instructor_status" AS ENUM ('none', 'pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'instructor_status'
  ) THEN
    ALTER TABLE users ADD COLUMN instructor_status "enum_users_instructor_status" NOT NULL DEFAULT 'none';
  END IF;
END $$;

-- registration_status (enum)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_registration_status') THEN
    CREATE TYPE "enum_users_registration_status" AS ENUM ('preview', 'active', 'suspended');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'registration_status'
  ) THEN
    ALTER TABLE users ADD COLUMN registration_status "enum_users_registration_status" NOT NULL DEFAULT 'preview';
  END IF;
END $$;

-- referral / discord / leads scalar columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_id              INTEGER       DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code        VARCHAR(12)   DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_credits     INTEGER       DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_user_id      VARCHAR(255)  DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_access_token VARCHAR(1000) DEFAULT NULL;

-- deleted_at (paranoid/soft-delete) is already handled by 20260114_critical_fixes.sql
-- and the server.js auto-migration, but guard here too for completeness.
ALTER TABLE users   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
