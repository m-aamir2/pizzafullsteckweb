const express = require('express');
const router = express.Router();
const { protect, requireVerified } = require('../middleware/authMiddleware');
const { createRazorpayOrder, verifyPayment } = require('../controllers/paymentController');

router.use(protect, requireVerified);
router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);

module.exports = router;
