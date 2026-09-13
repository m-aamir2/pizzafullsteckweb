const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { getAllOrders, getOrderDetail, updateOrderStatus } = require('../controllers/adminOrderController');

router.use(protect, requireAdmin);
router.get('/', getAllOrders);
router.get('/:id', getOrderDetail);
router.put('/:id/status', updateOrderStatus);

module.exports = router;
