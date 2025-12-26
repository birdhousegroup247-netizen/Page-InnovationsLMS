const express = require('express');
const router = express.Router();
const AdminCategoryController = require('../../../controllers/admin/categoryController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// ============================================================================
// CATEGORY MANAGEMENT ROUTES
// ============================================================================

// IMPORTANT: Specific routes must come before dynamic :id routes

// Get category statistics
router.get('/stats', AdminCategoryController.getStats);

// Get all categories (including inactive if requested)
router.get('/', AdminCategoryController.getAllCategories);

// Get category by ID
router.get('/:id', AdminCategoryController.getCategoryById);

// Create new category
router.post('/', AdminCategoryController.createCategory);

// Update category
router.put('/:id', AdminCategoryController.updateCategory);

// Delete category
router.delete('/:id', AdminCategoryController.deleteCategory);

module.exports = router;
