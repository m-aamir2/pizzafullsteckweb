const Cart = require('../models/Cart');
const Pizza = require('../models/Pizza');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { normalizeCustomPizza, priceCustomPizza } = require('../services/pricingService');

const quantityFor = (value) => {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw new ApiError(400, 'Cart quantities must be whole numbers between 1 and 20');
  }
  return quantity;
};

const normalizeCartItems = async (rawItems) => {
  if (!Array.isArray(rawItems)) throw new ApiError(400, 'Cart items must be an array');
  if (rawItems.length > 30) throw new ApiError(400, 'Cart cannot contain more than 30 items');

  return Promise.all(rawItems.map(async (item) => {
    const quantity = quantityFor(item.quantity);
    if (item.type === 'menu') {
      const pizza = await Pizza.findById(item.pizza || item.pizzaId);
      if (!pizza || !pizza.available) throw new ApiError(400, 'A selected menu pizza is unavailable');
      return { type: 'menu', pizza: pizza._id, quantity };
    }
    if (item.type === 'custom') {
      return { type: 'custom', customPizza: normalizeCustomPizza(item.customPizza), quantity };
    }
    throw new ApiError(400, 'Invalid cart item type');
  }));
};

const presentCart = async (cart) => {
  const pizzaIds = cart.items.filter((item) => item.type === 'menu').map((item) => item.pizza);
  const pizzas = await Pizza.find({ _id: { $in: pizzaIds }, available: true });
  const pizzaById = new Map(pizzas.map((pizza) => [String(pizza._id), pizza]));

  const items = cart.items.flatMap((item) => {
    if (item.type === 'menu') {
      const pizza = pizzaById.get(String(item.pizza));
      if (!pizza) return [];
      return [{ lineId: String(item._id), type: 'menu', pizzaId: String(pizza._id), name: pizza.name, image: pizza.image, unitPrice: pizza.price, quantity: item.quantity }];
    }
    const customPizza = item.customPizza.toObject ? item.customPizza.toObject() : item.customPizza;
    return [{ lineId: String(item._id), type: 'custom', name: `Custom Pizza (${customPizza.base})`, customPizza, unitPrice: priceCustomPizza(customPizza), quantity: item.quantity }];
  });

  return { items, subtotal: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) };
};

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }) || { items: [] };
  res.json({ success: true, cart: await presentCart(cart) });
});

// Replaces the current authenticated user's cart. The user id comes only from
// the verified token, never from the request body.
const updateCart = asyncHandler(async (req, res) => {
  const items = await normalizeCartItems(req.body.items);
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $set: { items } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, cart: await presentCart(cart) });
});

const clearCart = async (userId) => Cart.updateOne({ user: userId }, { $set: { items: [] } });

module.exports = { getCart, updateCart, clearCart, presentCart };
