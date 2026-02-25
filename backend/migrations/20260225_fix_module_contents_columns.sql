-- Migration: Add missing columns to module_contents table
-- Date: 2026-02-25
-- Purpose: Add unlock_after_days and file_size_mb columns that are defined in
--          the Sequelize model but missing from the production DB due to sync using alter: false.
--          This caused GET /api/courses/:courseId/modules to return 500 errors.

-- Add unlock_after_days column (safe - only adds if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='module_contents' AND column_name='unlock_after_days'
    ) THEN
        ALTER TABLE module_contents ADD COLUMN unlock_after_days INTEGER NULL DEFAULT NULL;
    END IF;
END $$;

-- Add file_size_mb column (safe - only adds if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='module_contents' AND column_name='file_size_mb'
    ) THEN
        ALTER TABLE module_contents ADD COLUMN file_size_mb DECIMAL(10, 2) NULL;
    END IF;
END $$;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'module_contents'
ORDER BY ordinal_position;
