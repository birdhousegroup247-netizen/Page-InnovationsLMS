const express = require('express');
const router = express.Router();
const KnowledgeController = require('../../controllers/knowledge/knowledgeController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// KNOWLEDGE CENTER ROUTES (Public)
// ============================================================================
router.get('/', KnowledgeController.getAllArticles);
router.get('/popular', KnowledgeController.getPopularArticles);
router.get('/:slug', KnowledgeController.getArticleBySlug);
router.get('/:id/related', KnowledgeController.getRelatedArticles);

// ============================================================================
// KNOWLEDGE CENTER ROUTES (Authenticated)
// ============================================================================
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), KnowledgeController.createArticle);
router.put('/:id', authenticate, KnowledgeController.updateArticle);
router.delete('/:id', authenticate, KnowledgeController.deleteArticle);

module.exports = router;
