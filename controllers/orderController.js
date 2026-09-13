const Order = require('../models/Order');
const Pizza = require('../models/Pizza');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { checkStockAvailability } = require('../services/inventoryService');
const { DELIVERY_FEE } = require('../config/constants');
const { normalizeCustomPizza, priceCustomPizza } = require('../services/pricingService');
const Cart = require('../models/Cart');
const { clearCart } = require('./cartController');

// Recomputes item pricing server-side so the client can never manipulate totals.
const priceItems = async (rawItems) => {
  const priced = [];

  for (const raw of rawItems) {
    if (raw.type === 'menu') {
      const pizza = await Pizza.findById(raw.pizza);
      if (!pizza || !pizza.available) {
        throw new ApiError(400, `${raw.name || 'A menu pizza'} is not currently available`);
      }
      const quantity = Math.max(1, Number(raw.quantity) || 1);
      priced.push({
        type: 'menu',
        pizza: pizza._id,
        name: pizza.name,
        quantity,
        unitPrice: pizza.price,
        totalPrice: pizza.price * quantity,
      });
    } else if (raw.type === 'custom') {
      const quantity = Math.max(1, Number(raw.quantity) || 1);
      const customPizza = normalizeCustomPizza(raw.customPizza);
      const unitPrice = priceCustomPizza(customPizza);

      priced.push({
        type: 'custom',
        name: raw.name || 'Custom Pizza',
        customPizza,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
      });
    } else {
      throw new ApiError(400, 'Invalid order item type');
    }
  }

  return priced;
};

// POST /api/orders — creates a pending order (no stock deducted yet; that happens on payment verification)
const createOrder = asyncHandler(async (req, res) => {
  const { deliveryAddress } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart?.items?.length) {
    throw new ApiError(400, 'Order must contain at least one item');
  }
  if (!deliveryAddress?.fullName || !deliveryAddress?.phone || !deliveryAddress?.addressLine || !deliveryAddress?.city) {
    throw new ApiError(400, 'Complete delivery address is required');
  }

  const pricedItems = await priceItems(cart.items);

  const stockCheck = await checkStockAvailability(pricedItems);
  if (!stockCheck.ok) {
    throw new ApiError(409, `Insufficient inventory for: ${stockCheck.shortages.map((s) => s.name).join(', ')}`);
  }

  const subtotal = pricedItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const deliveryFee = DELIVERY_FEE;
  const totalAmount = subtotal + deliveryFee;

  const order = await Order.create({
    user: req.user._id,
    items: pricedItems,
    subtotal,
    deliveryFee,
    totalAmount,
    deliveryAddress,
    paymentStatus: 'pending',
    orderStatus: 'Order Received',
  });

  res.status(201).json({ success: true, order });
});

// POST /api/orders/:id/confirm-cash — confirms a cash-on-delivery purchase.
// This is intentionally server-side: ownership, payment state, stock deduction,
// and cart clearing cannot be forged by a browser request.
const confirmCashOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (String(order.user) !== String(req.user._id)) throw new ApiError(403, 'Not your order');
  if (order.paymentStatus !== 'pending') throw new ApiError(400, 'Order has already been confirmed');

  const stockCheck = await checkStockAvailability(order.items);
  if (!stockCheck.ok) {
    throw new ApiError(409, `Insufficient inventory for: ${stockCheck.shortages.map((s) => s.name).join(', ')}`);
  }

  const { deductStockForOrder } = require('../services/inventoryService');
  await deductStockForOrder(order.items);
  order.paymentStatus = 'cash_on_delivery';
  order.orderStatus = 'Order Received';
  await order.save();
  await clearCart(req.user._id);

  const io = req.app.get('io');
  if (io) io.to(`user:${order.user}`).emit('order:updated', { orderId: order._id, orderStatus: order.orderStatus });
  res.json({ success: true, message: 'Order confirmed for cash on delivery', order });
});

// GET /api/orders — current user's orders
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

// GET /api/orders/:id — must belong to requester unless admin
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  if (req.user.role !== 'admin' && String(order.user) !== String(req.user._id)) {
    throw new ApiError(403, 'You do not have access to this order');
  }

  res.json({ success: true, order });
});

module.exports = { createOrder, confirmCashOrder, getMyOrders, getOrderById };
