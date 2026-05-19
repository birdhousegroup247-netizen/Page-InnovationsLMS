-- Migration: Add Question Approval Tracking Fields
-- Date: 2026-01-01
-- Description: Adds fields to track question approval status, reviewer, and rejection reasons

-- Add new columns to question_bank table
ALTER TABLE question_bank
ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER is_approved,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL AFTER approval_status,
ADD COLUMN IF NOT EXISTS reviewed_by INT DEFAULT NULL AFTER rejection_reason,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP DEFAULT NULL AFTER reviewed_by;

-- Add foreign key constraint for reviewed_by
ALTER TABLE question_bank
ADD CONSTRAINT fk_question_reviewed_by
FOREIGN KEY (reviewed_by) REFERENCES users(id)
ON DELETE SET NULL;

-- Create index for faster queries on approval_status
CREATE INDEX IF NOT EXISTS idx_question_approval_status ON question_bank(approval_status);
CREATE INDEX IF NOT EXISTS idx_question_reviewed_by ON question_bank(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_question_reviewed_at ON question_bank(reviewed_at);

-- Update existing records to have approval_status based on is_approved
UPDATE question_bank
SET approval_status = CASE
    WHEN is_approved = 1 THEN 'approved'
    ELSE 'pending'
END
WHERE approval_status IS NULL;

-- Migration complete
-- Note: Run this migration using: mysql -u <user> -p <database> < add_question_approval_fields.sql
