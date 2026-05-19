-- Migration: Add course_id to question_bank table
-- Date: 2025-12-25
-- Description: Link questions to specific courses instead of generic categories

-- Add course_id column to question_bank
ALTER TABLE question_bank
ADD COLUMN course_id INT NULL,
ADD CONSTRAINT fk_question_course
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- Make category_id nullable (since course already has category)
ALTER TABLE question_bank
MODIFY COLUMN category_id INT NULL;

-- Add index on course_id for better query performance
CREATE INDEX idx_question_bank_course_id ON question_bank(course_id);

-- Optional: Migrate existing questions to link to a default course
-- UPDATE question_bank SET course_id = (SELECT id FROM courses LIMIT 1) WHERE course_id IS NULL;

-- Add comment
ALTER TABLE question_bank
MODIFY COLUMN course_id INT NULL
COMMENT 'Links question to a specific course. NULL means question is not course-specific.';
