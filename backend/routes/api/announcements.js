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

// Get announcements for enrolled courses (Student)
router.get('/my', authenticate, authorize('student'), AnnouncementsController.getMyAnnouncements);

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
