const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ORDER_STATUS } = require('../config/constants');

// GET /api/admin/orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.orderStatus = status;

  let query = Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
  let orders = await query;

  if (search) {
    const term = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.user?.name?.toLowerCase().includes(term) ||
        o.user?.email?.toLowerCase().includes(term) ||
        String(o._id).includes(term)
    );
  }

  res.json({ success: true, orders });
});

// GET /api/admin/orders/:id
const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new ApiError(404, 'Order not found');
  res.json({ success: true, order });
});

// PUT /api/admin/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUS.includes(status)) throw new ApiError(400, 'Invalid order status');

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  order.orderStatus = status;
  await order.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${order.user}`).emit('order:updated', { orderId: order._id, orderStatus: order.orderStatus });
  }

  res.json({ success: true, order });
});

module.exports = { getAllOrders, getOrderDetail, updateOrderStatus };
