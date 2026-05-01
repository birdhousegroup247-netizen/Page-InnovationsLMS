const express = require('express');
const router = express.Router();
const CourseController = require('../../controllers/courses/courseController');
const CategoryController = require('../../controllers/courses/categoryController');
const ModuleController = require('../../controllers/courses/moduleController');
const ContentController = require('../../controllers/courses/contentController');
const ProgressController = require('../../controllers/courses/progressController');
const { authenticate, optionalAuthenticate, authorize, checkNotSuspended } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// CATEGORY ROUTES
// ============================================================================
router.get('/categories', CategoryController.getAllCategories);
router.get('/categories/main', CategoryController.getMainCategories);
router.get('/categories/:parentId/sub', CategoryController.getSubCategories);

// ============================================================================
// COURSE ROUTES (Authenticated) - Must come before /:id routes
// ============================================================================
router.get('/my/enrollments', authenticate, CourseController.getMyCourses);  // Allow all authenticated users to see their enrollments
router.get('/my/teaching', authenticate, authorize('instructor', 'admin', 'super_admin'), CourseController.getInstructorCourses);
router.get('/my/students', authenticate, authorize('instructor', 'admin', 'super_admin'), CourseController.getInstructorStudents);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), CourseController.createCourse);

// ============================================================================
// COURSE ROUTES (Public) - /:id must come after specific routes
// ============================================================================
router.get('/', CourseController.getAllCourses);
router.get('/:id', optionalAuthenticate, CourseController.getCourseById);
router.put('/:id', authenticate, CourseController.updateCourse);
router.delete('/:id', authenticate, CourseController.deleteCourse);
router.post('/:id/enroll', authenticate, authorize('student'), CourseController.enrollCourse);
router.post('/:id/clone', authenticate, authorize('instructor', 'admin', 'super_admin'), CourseController.cloneCourse);

// ============================================================================
// MODULE ROUTES
// ============================================================================
router.get('/:courseId/modules', ModuleController.getCourseModules);
router.post('/:courseId/modules', authenticate, authorize('instructor', 'admin', 'super_admin'), ModuleController.createModule);
router.put('/modules/:moduleId', authenticate, ModuleController.updateModule);
router.delete('/modules/:moduleId', authenticate, ModuleController.deleteModule);

// ============================================================================
// CONTENT ROUTES
// ============================================================================
router.get('/modules/:moduleId/contents', optionalAuthenticate, ContentController.getModuleContents);
router.get('/contents/:contentId', optionalAuthenticate, ContentController.getContentById);
router.post('/modules/:moduleId/contents', authenticate, authorize('instructor', 'admin', 'super_admin'), ContentController.createContent);
router.put('/contents/:contentId', authenticate, ContentController.updateContent);
router.delete('/contents/:contentId', authenticate, ContentController.deleteContent);

// ============================================================================
// PROGRESS ROUTES
// ============================================================================
router.get('/:courseId/progress', authenticate, authorize('student'), ProgressController.getCourseProgress);
router.post('/contents/:contentId/complete', authenticate, authorize('student'), checkNotSuspended, ProgressController.markContentComplete);
router.post('/contents/:contentId/progress', authenticate, authorize('student'), checkNotSuspended, ProgressController.updateProgress);

// ============================================================================
// LIVE SESSIONS (sub-route)
// ============================================================================
router.use('/:courseId/sessions', require('./live-sessions'));

// ============================================================================
// FORUM (sub-route)
// ============================================================================
router.use('/:courseId/forum', require('./forum'));

module.exports = router;
