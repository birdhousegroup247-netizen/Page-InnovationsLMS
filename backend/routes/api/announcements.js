/**
 * Announcements Routes
 * API endpoints for course announcements
 */

const express = require('express');
const router = express.Router();
const AnnouncementsController = require('../../controllers/announcements/announcementsController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// COURSE ANNOUNCEMENT ROUTES
// ============================================================================

// Get announcements for enrolled courses (Student).
// MUST be declared before /announcements/:announcementId — Express would
// otherwise interpret "my" as the :announcementId param and try to cast
// it to an integer, which is what produced the
// "invalid input syntax for type integer: 'my'" error on /announcements.
router.get('/announcements/my', authenticate, authorize('student'), AnnouncementsController.getMyAnnouncements);
// Backwards-compat alias — keep the old /api/my path live so any cached
// frontend bundle that still calls it doesn't 404.
router.get('/my', authenticate, authorize('student'), AnnouncementsController.getMyAnnouncements);

// Unified announcement feed for the caller. Merges:
//  - Admin / platform broadcasts targeted at this user
//  - Course announcements posted on courses they're enrolled in (students)
//    OR courses they teach (instructors)
// Any authenticated user can call it; the scope is decided server-side
// from their role + relationships.
router.get('/announcements/feed', authenticate, AnnouncementsController.getMyFeed);

// Get all announcements for a course (Enrolled students can view)
router.get('/courses/:courseId/announcements', AnnouncementsController.getCourseAnnouncements);

// Create announcement (Instructor/Admin)
router.post('/courses/:courseId/announcements', authenticate, authorize('instructor', 'admin', 'super_admin'), AnnouncementsController.createAnnouncement);

// Get specific announcement
router.get('/announcements/:announcementId', AnnouncementsController.getAnnouncementById);

// Update announcement (Instructor/Admin)
router.put('/announcements/:announcementId', authenticate, authorize('instructor', 'admin', 'super_admin'), AnnouncementsController.updateAnnouncement);

// Delete announcement (Instructor/Admin)
router.delete('/announcements/:announcementId', authenticate, authorize('instructor', 'admin', 'super_admin'), AnnouncementsController.deleteAnnouncement);

module.exports = router;
