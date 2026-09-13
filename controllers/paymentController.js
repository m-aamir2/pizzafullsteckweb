const crypto = require('crypto');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getRazorpayInstance } = require('../services/razorpayService');
const { deductStockForOrder } = require('../services/inventoryService');
const { clearCart } = require('./cartController');

// POST /api/payment/create-order — creates a Razorpay order tied to our pending Order
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (String(order.user) !== String(req.user._id)) throw new ApiError(403, 'Not your order');
  if (order.paymentStatus !== 'pending') throw new ApiError(400, 'Order has already been confirmed');

  const razorpay = getRazorpayInstance();

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(order.totalAmount * 100), // paise/smallest unit
    currency: 'INR',
    receipt: String(order._id),
  });

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.json({
    success: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: order._id,
  });
});

// POST /api/payment/verify — verifies the Razorpay signature, then deducts stock and confirms the order
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (String(order.user) !== String(req.user._id)) throw new ApiError(403, 'Not your order');
  if (order.razorpayOrderId !== razorpay_order_id) throw new ApiError(400, 'Order mismatch');

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    order.paymentStatus = 'failed';
    await order.save();
    throw new ApiError(400, 'Payment verification failed — signature mismatch');
  }

  // Deduct inventory only now, atomically, so payment and stock consumption stay in lockstep.
  await deductStockForOrder(order.items);

  order.paymentStatus = 'paid';
  order.paymentId = razorpay_payment_id;
  order.orderStatus = 'Order Received';
  await order.save();
  await clearCart(req.user._id);

  const io = req.app.get('io');
  if (io) io.to(`user:${order.user}`).emit('order:updated', { orderId: order._id, orderStatus: order.orderStatus });

  res.json({ success: true, message: 'Payment verified and order confirmed', order });
});

module.exports = { createRazorpayOrder, verifyPayment };
