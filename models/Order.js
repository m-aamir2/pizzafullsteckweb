const mongoose = require('mongoose');

const customPizzaSchema = new mongoose.Schema(
  {
    base: String,
    sauce: String,
    cheese: [String],
    vegetables: [String],
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['menu', 'custom'], required: true },
    pizza: { type: mongoose.Schema.Types.ObjectId, ref: 'Pizza' },
    name: { type: String, required: true },
    customPizza: customPizzaSchema,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'cash_on_delivery'], default: 'pending' },
    paymentId: { type: String },
    razorpayOrderId: { type: String },
    orderStatus: {
      type: String,
      enum: ['Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered', 'Cancelled'],
      default: 'Order Received',
    },
    deliveryAddress: {
      fullName: String,
      phone: String,
      addressLine: String,
      city: String,
      postalCode: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
