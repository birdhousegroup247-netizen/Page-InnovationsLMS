/**
 * Bookmarks Routes
 * API endpoints for lesson and article bookmarks
 */

const express = require('express');
const router = express.Router();
const BookmarksController = require('../../controllers/bookmarks/bookmarksController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// All bookmark routes require student authentication
router.use(authenticate);
router.use(authorize('student'));

// ============================================================================
// LESSON BOOKMARK ROUTES
// ============================================================================

// Create a lesson bookmark
router.post('/lessons', BookmarksController.createLessonBookmark);

// Get all lesson bookmarks
router.get('/lessons', BookmarksController.getLessonBookmarks);

// Check if a lesson is bookmarked
router.get('/lessons/:contentId', BookmarksController.checkLessonBookmark);

// Update lesson bookmark notes
router.put('/lessons/:bookmarkId', BookmarksController.updateLessonBookmark);

// Delete lesson bookmark
router.delete('/lessons/:bookmarkId', BookmarksController.deleteLessonBookmark);

// ============================================================================
// ARTICLE BOOKMARK ROUTES
// ============================================================================

// Create an article bookmark
router.post('/articles', BookmarksController.createArticleBookmark);

// Get all article bookmarks
router.get('/articles', BookmarksController.getArticleBookmarks);

// Check if an article is bookmarked
router.get('/articles/:articleId/check', BookmarksController.checkArticleBookmark);

// Delete article bookmark
router.delete('/articles/:bookmarkId', BookmarksController.deleteArticleBookmark);

module.exports = router;
