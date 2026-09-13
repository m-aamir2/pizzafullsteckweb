const express = require('express');
const router = express.Router();
const { protect, requireVerified } = require('../middleware/authMiddleware');
const { createOrder, confirmCashOrder, getMyOrders, getOrderById } = require('../controllers/orderController');

router.use(protect, requireVerified);
router.post('/', createOrder);
router.post('/:id/confirm-cash', confirmCashOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);

module.exports = router;
