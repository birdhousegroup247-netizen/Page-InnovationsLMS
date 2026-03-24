const express = require('express');
const router = express.Router();
const WishlistController = require('../../controllers/wishlist/wishlistController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

router.use(authenticate);

router.get('/', WishlistController.getMyWishlist);
router.post('/:courseId', WishlistController.addToWishlist);
router.delete('/:courseId', WishlistController.removeFromWishlist);
router.get('/:courseId/check', WishlistController.checkWishlist);

module.exports = router;
