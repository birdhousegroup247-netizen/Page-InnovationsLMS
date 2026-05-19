-- Migration: Create Instructor Applications Table
-- Date: 2024-12-25
-- Purpose: Separate instructor application data from users table for better data modeling

-- Create instructor_applications table
CREATE TABLE IF NOT EXISTS instructor_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('pending', 'under_review', 'approved', 'rejected', 'revoked') DEFAULT 'pending',

  -- Application details
  bio TEXT NULL COMMENT 'Why the user wants to become an instructor',
  qualifications TEXT NULL COMMENT 'Education, certifications, credentials',
  teaching_experience TEXT NULL COMMENT 'Previous teaching experience',
  subject_expertise TEXT NULL COMMENT 'What subjects/topics they can teach',
  portfolio_url VARCHAR(500) NULL COMMENT 'Link to portfolio or sample work',

  -- Review information
  rejection_reason TEXT NULL COMMENT 'Why the application was rejected',
  admin_notes TEXT NULL COMMENT 'Internal notes for admins',
  reviewed_by INT NULL COMMENT 'Admin who reviewed the application',
  reviewed_at TIMESTAMP NULL COMMENT 'When the application was reviewed',

  -- Timestamps
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When application was submitted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,

  -- Indexes for performance
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_reviewed_by (reviewed_by),
  INDEX idx_applied_at (applied_at),
  INDEX idx_reviewed_at (reviewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing data from users table
-- This will create applications for users who have instructor_status
INSERT INTO instructor_applications (user_id, status, applied_at, reviewed_at)
SELECT
  id,
  CASE
    WHEN instructor_status = 'pending' THEN 'pending'
    WHEN instructor_status = 'approved' THEN 'approved'
    WHEN instructor_status = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END as status,
  created_at as applied_at,
  CASE
    WHEN instructor_status IN ('approved', 'rejected') THEN updated_at
    ELSE NULL
  END as reviewed_at
FROM users
WHERE instructor_status IN ('pending', 'approved', 'rejected');

-- Note: We're keeping instructor_status field on users table for backward compatibility
-- It will be updated automatically when applications are approved/rejected
-- In the future, you can remove this field after ensuring all code uses the new table

-- Add comments to document the migration
ALTER TABLE instructor_applications
  COMMENT = 'Stores instructor application data separately from users table. Created: 2024-12-25';

-- Success message
SELECT CONCAT('Migration completed. Created ', COUNT(*), ' application records.') as result
FROM instructor_applications;
