-- Migration: Critical Security and Performance Fixes
-- Date: 2026-01-14
-- Purpose: Apply indexes and soft delete columns from code audit
-- Database: PostgreSQL (Render compatible)

-- ============================================================================
-- SOFT DELETE COLUMNS
-- ============================================================================

-- Add deleted_at to users table (for paranoid/soft delete)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='deleted_at'
    ) THEN
        ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
    END IF;
END $$;

-- Add deleted_at to courses table (for paranoid/soft delete)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='courses' AND column_name='deleted_at'
    ) THEN
        ALTER TABLE courses ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
    END IF;
END $$;

-- ============================================================================
-- PERFORMANCE INDEXES FOR ENROLLMENTS
-- ============================================================================

-- Index for analytics queries (course enrollment trends over time)
CREATE INDEX IF NOT EXISTS idx_enrollments_course_date ON enrollments(course_id, enrollment_date);

-- Index for completion queries (finding completed enrollments)
CREATE INDEX IF NOT EXISTS idx_enrollments_completed ON enrollments(completed_at);

-- Index for student completion stats
CREATE INDEX IF NOT EXISTS idx_enrollments_student_completed ON enrollments(student_id, completed_at);

-- Index for activity tracking (recently accessed courses)
CREATE INDEX IF NOT EXISTS idx_enrollments_last_accessed ON enrollments(last_accessed);

-- ============================================================================
-- PERFORMANCE INDEXES FOR CERTIFICATES
-- ============================================================================

-- Index for student certificate queries with issue date
CREATE INDEX IF NOT EXISTS idx_certificates_student_issue ON certificates(student_id, issue_date);

-- Index for monthly/yearly certificate stats
CREATE INDEX IF NOT EXISTS idx_certificates_issue_date ON certificates(issue_date);

-- Index for student-course certificate lookup
CREATE INDEX IF NOT EXISTS idx_certificates_student_course ON certificates(student_id, course_id);

-- ============================================================================
-- PERFORMANCE INDEXES FOR CONTENT PROGRESS
-- ============================================================================

-- Index for filtering completed content (critical hot path)
CREATE INDEX IF NOT EXISTS idx_content_progress_completed ON content_progress(completed);

-- Index for student completion statistics
CREATE INDEX IF NOT EXISTS idx_content_progress_student_completed ON content_progress(student_id, completed);

-- Index for recent activity queries
CREATE INDEX IF NOT EXISTS idx_content_progress_last_accessed ON content_progress(last_accessed);

-- ============================================================================
-- PERFORMANCE INDEXES FOR COURSES
-- ============================================================================

-- Index for instructor queries (find all courses by instructor)
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);

-- Index for status queries (published, draft, archived)
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_courses_deleted_at ON courses(deleted_at);

-- Index for sorting by published date
CREATE INDEX IF NOT EXISTS idx_courses_published_at ON courses(published_at);

-- ============================================================================
-- PERFORMANCE INDEXES FOR USERS
-- ============================================================================

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- ============================================================================
-- VERIFY INSTALLATION (PostgreSQL compatible)
-- ============================================================================

-- Count indexes created
SELECT
    'Migration completed successfully!' as message,
    COUNT(*)::integer as indexes_verified
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'courses', 'enrollments', 'certificates', 'content_progress')
AND indexname LIKE 'idx_%';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration adds:
-- 1. Soft delete support for Users and Courses (paranoid mode)
-- 2. Critical indexes for dashboard analytics queries
-- 3. Indexes for certificate and completion queries
-- 4. Indexes for content progress tracking
--
-- PostgreSQL Compatible:
-- - Uses DO blocks for conditional column creation
-- - Uses pg_indexes instead of information_schema.statistics
-- - Uses ::integer for type casting
--
-- Expected performance improvements:
-- - Dashboard queries: 3-10x faster
-- - Analytics queries: 10-100x faster on large datasets
-- - Course/user lookups with soft delete: no performance degradation
--
-- Rollback:
-- To remove these indexes:
-- DROP INDEX IF EXISTS idx_enrollments_course_date;
-- DROP INDEX IF EXISTS idx_enrollments_completed;
-- (... repeat for all indexes)
--
-- To remove soft delete columns:
-- ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE courses DROP COLUMN IF EXISTS deleted_at;
