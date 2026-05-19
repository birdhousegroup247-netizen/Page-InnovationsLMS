-- Migration: Add Performance Indexes
-- Date: 2024-12-25
-- Purpose: Add missing indexes for improved query performance

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Index for searching by email (already exists, but verify)
-- CREATE INDEX idx_users_email ON users(email);

-- Index for filtering by role
CREATE INDEX idx_users_role ON users(role);

-- Index for filtering by active status
CREATE INDEX idx_users_is_active ON users(is_active);

-- Index for instructor status filtering
CREATE INDEX idx_users_instructor_status ON users(instructor_status);

-- Composite index for role-based active user queries
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- Index for last login queries (finding inactive users)
CREATE INDEX idx_users_last_login ON users(last_login);

-- ============================================================================
-- COURSES TABLE
-- ============================================================================

-- Index for instructor queries (find all courses by instructor)
CREATE INDEX idx_courses_instructor ON courses(instructor_id);

-- Index for category filtering
CREATE INDEX idx_courses_category ON courses(category_id);

-- Index for published courses
CREATE INDEX idx_courses_published ON courses(is_published);

-- Index for course difficulty filtering
CREATE INDEX idx_courses_difficulty ON courses(difficulty_level);

-- Composite index for published courses by category
CREATE INDEX idx_courses_published_category ON courses(is_published, category_id);

-- Index for created date (sorting newest courses)
CREATE INDEX idx_courses_created_at ON courses(created_at);

-- Index for featured courses
CREATE INDEX idx_courses_is_featured ON courses(is_featured);

-- Full-text search index for course title and description
-- CREATE FULLTEXT INDEX IF NOT EXISTS idx_courses_search ON courses(title, description);

-- ============================================================================
-- ENROLLMENTS TABLE
-- ============================================================================

-- Index for student enrollments
CREATE INDEX idx_enrollments_student ON enrollments(student_id);

-- Index for course enrollments (count students per course)
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

-- Composite index for student-course lookup
CREATE INDEX idx_enrollments_student_course ON enrollments(student_id, course_id);

-- Index for enrollment status
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Index for enrollment date (recent enrollments)
CREATE INDEX idx_enrollments_enrolled_at ON enrollments(enrolled_at);

-- Composite index for active enrollments per student
CREATE INDEX idx_enrollments_student_status ON enrollments(student_id, status);

-- ============================================================================
-- COURSE_MODULES TABLE
-- ============================================================================

-- Index for finding modules by course
CREATE INDEX idx_modules_course ON course_modules(course_id);

-- Index for ordering modules
CREATE INDEX idx_modules_order ON course_modules(display_order);

-- Composite index for course modules in order
CREATE INDEX idx_modules_course_order ON course_modules(course_id, display_order);

-- ============================================================================
-- MODULE_CONTENTS TABLE
-- ============================================================================

-- Index for finding contents by module
CREATE INDEX idx_contents_module ON module_contents(module_id);

-- Index for content type filtering
CREATE INDEX idx_contents_type ON module_contents(content_type);

-- Index for ordering content
CREATE INDEX idx_contents_order ON module_contents(display_order);

-- Composite index for module contents in order
CREATE INDEX idx_contents_module_order ON module_contents(module_id, display_order);

-- ============================================================================
-- CONTENT_PROGRESS TABLE
-- ============================================================================

-- Index for student progress queries
CREATE INDEX idx_progress_student ON content_progress(student_id);

-- Index for content progress tracking
CREATE INDEX idx_progress_content ON content_progress(content_id);

-- Composite index for student-content lookup
CREATE INDEX idx_progress_student_content ON content_progress(student_id, content_id);

-- Index for completion status
CREATE INDEX idx_progress_completed ON content_progress(is_completed);

-- Index for last accessed (recently viewed content)
CREATE INDEX idx_progress_last_accessed ON content_progress(last_accessed_at);

-- ============================================================================
-- ACTIVITY_LOGS TABLE
-- ============================================================================

-- Index for user activities
CREATE INDEX idx_activity_user ON activity_logs(user_id);

-- Index for action type filtering
CREATE INDEX idx_activity_action ON activity_logs(action);

-- Index for entity lookups
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);

-- Index for timestamp (recent activities)
CREATE INDEX idx_activity_created_at ON activity_logs(created_at);

-- Composite index for user actions by date
CREATE INDEX idx_activity_user_date ON activity_logs(user_id, created_at);

-- ============================================================================
-- INSTRUCTOR_APPLICATIONS TABLE
-- ============================================================================

-- Index for user applications
CREATE INDEX idx_instructor_apps_user ON instructor_applications(user_id);

-- Index for application status
CREATE INDEX idx_instructor_apps_status ON instructor_applications(status);

-- Index for reviewer queries
CREATE INDEX idx_instructor_apps_reviewer ON instructor_applications(reviewed_by);

-- Index for application date
CREATE INDEX idx_instructor_apps_applied_at ON instructor_applications(applied_at);

-- Index for reviewed date
CREATE INDEX idx_instructor_apps_reviewed_at ON instructor_applications(reviewed_at);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================

-- Index for parent category queries
CREATE INDEX idx_categories_parent ON categories(parent_category_id);

-- Index for active categories
CREATE INDEX idx_categories_active ON categories(is_active);

-- Index for display order
CREATE INDEX idx_categories_order ON categories(display_order);

-- Composite index for active categories in order
CREATE INDEX idx_categories_active_order ON categories(is_active, display_order);

-- ============================================================================
-- CERTIFICATES TABLE
-- ============================================================================

-- Index for student certificates
CREATE INDEX idx_certificates_student ON certificates(student_id);

-- Index for course certificates
CREATE INDEX idx_certificates_course ON certificates(course_id);

-- Index for issued date
CREATE INDEX idx_certificates_issued_at ON certificates(issued_at);

-- Composite index for student-course certificates
CREATE INDEX idx_certificates_student_course ON certificates(student_id, course_id);

-- ============================================================================
-- COURSE_REVIEWS TABLE
-- ============================================================================

-- Index for course reviews
CREATE INDEX idx_reviews_course ON course_reviews(course_id);

-- Index for student reviews
CREATE INDEX idx_reviews_student ON course_reviews(student_id);

-- Index for rating (finding top-rated courses)
CREATE INDEX idx_reviews_rating ON course_reviews(rating);

-- Index for review date
CREATE INDEX idx_reviews_created_at ON course_reviews(created_at);

-- Composite index for course ratings
CREATE INDEX idx_reviews_course_rating ON course_reviews(course_id, rating);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

-- Index for user notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Index for unread notifications
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- Index for notification date
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Composite index for user's unread notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- ============================================================================
-- PASSWORD_RESETS TABLE
-- ============================================================================

-- Index for user password resets
CREATE INDEX idx_password_resets_user ON password_resets(user_id);

-- Index for token lookups
CREATE INDEX idx_password_resets_token ON password_resets(token);

-- Index for expiration checks
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);

-- Index for used status
CREATE INDEX idx_password_resets_used ON password_resets(used);

-- ============================================================================
-- ASSIGNED_TESTS TABLE
-- ============================================================================

-- Index for instructor tests
CREATE INDEX idx_assigned_tests_instructor ON assigned_tests(instructor_id);

-- Index for course tests
CREATE INDEX idx_assigned_tests_course ON assigned_tests(course_id);

-- Index for test status
CREATE INDEX idx_assigned_tests_is_active ON assigned_tests(is_active);

-- Index for test date
CREATE INDEX idx_assigned_tests_created_at ON assigned_tests(created_at);

-- ============================================================================
-- TEST_ASSIGNMENTS TABLE
-- ============================================================================

-- Index for student assignments
CREATE INDEX idx_test_assignments_student ON test_assignments(student_id);

-- Index for test assignments
CREATE INDEX idx_test_assignments_test ON test_assignments(test_id);

-- Index for assignment status
CREATE INDEX idx_test_assignments_status ON test_assignments(status);

-- Index for due date
CREATE INDEX idx_test_assignments_due_date ON test_assignments(due_date);

-- Composite index for student-test lookup
CREATE INDEX idx_test_assignments_student_test ON test_assignments(student_id, test_id);

-- ============================================================================
-- Success message
-- ============================================================================

SELECT 'Performance indexes created successfully!' as result;

-- ============================================================================
-- NOTES
-- ============================================================================
-- These indexes will significantly improve:
-- 1. User queries (by role, status, email)
-- 2. Course browsing (by category, instructor, published status)
-- 3. Enrollment queries (student courses, course students)
-- 4. Progress tracking (student progress lookups)
-- 5. Activity logging and reporting
-- 6. Instructor application queries
-- 7. Category filtering and navigation
-- 8. Certificate generation and verification
-- 9. Review and rating queries
-- 10. Notification management
-- 11. Test assignment and tracking

-- Monitor query performance and add additional indexes as needed based on:
-- - Slow query logs
-- - EXPLAIN ANALYZE results
-- - Application-specific query patterns
