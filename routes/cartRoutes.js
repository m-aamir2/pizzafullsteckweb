const express = require('express');
const router = express.Router();
const { protect, requireVerified } = require('../middleware/authMiddleware');
const { getCart, updateCart } = require('../controllers/cartController');

router.use(protect, requireVerified);
router.get('/', getCart);
router.put('/', updateCart);

module.exports = router;
