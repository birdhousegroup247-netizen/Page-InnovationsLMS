-- Migration: Update courses table to add price field and rename difficulty to level
-- Date: 2025-12-25
-- Description:
--   1. Add price column (DECIMAL 10,2) with default 0.00
--   2. Rename difficulty column to level
--   3. Add 'pending' to status enum
--   4. Add index on level column

-- Step 1: Add price column
ALTER TABLE courses
ADD COLUMN price DECIMAL(10, 2) DEFAULT 0.00 AFTER duration_hours;

-- Step 2: Rename difficulty to level
ALTER TABLE courses
CHANGE COLUMN difficulty level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner';

-- Step 3: Modify status enum to include 'pending'
ALTER TABLE courses
MODIFY COLUMN status ENUM('draft', 'published', 'archived', 'pending') DEFAULT 'draft';

-- Step 4: Add index on level column
-- Note: The difficulty index may not exist, ignore error if it doesn't
CREATE INDEX idx_level ON courses(level);

-- Step 5: Add index on price for sorting/filtering
CREATE INDEX idx_price ON courses(price);

-- Verify changes
-- SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_NAME = 'courses'
-- AND COLUMN_NAME IN ('price', 'level', 'status');
