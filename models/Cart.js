const mongoose = require('mongoose');

const customPizzaSchema = new mongoose.Schema(
  {
    base: { type: String, required: true },
    sauce: { type: String, required: true },
    cheese: { type: [String], required: true },
    vegetables: { type: [String], default: [] },
  },
  { _id: false }
);

const cartItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['menu', 'custom'], required: true },
    pizza: { type: mongoose.Schema.Types.ObjectId, ref: 'Pizza' },
    customPizza: customPizzaSchema,
    quantity: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    // One cart per account makes cart ownership enforceable by the API.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
