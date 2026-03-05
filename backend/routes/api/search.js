const express = require('express');
const router = express.Router();
const SearchController = require('../../controllers/search/searchController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// GET /api/search?q=keyword&type=all|courses|lessons|articles
router.get('/', authenticate, SearchController.search);

module.exports = router;
