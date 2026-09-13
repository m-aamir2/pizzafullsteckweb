const Pizza = require('../models/Pizza');
const Inventory = require('../models/Inventory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { PIZZA_BASES, SAUCES, CHEESES, VEGETABLES } = require('../config/constants');

// GET /api/pizzas
const getPizzas = asyncHandler(async (req, res) => {
  const pizzas = await Pizza.find().sort({ createdAt: 1 });
  res.json({ success: true, pizzas });
});

// GET /api/pizzas/:id
const getPizzaById = asyncHandler(async (req, res) => {
  const pizza = await Pizza.findById(req.params.id);
  if (!pizza) throw new ApiError(404, 'Pizza not found');
  res.json({ success: true, pizza });
});

// GET /api/pizzas/builder/options
// Returns the fixed builder options plus live availability/pricing pulled from inventory.
const getBuilderOptions = asyncHandler(async (req, res) => {
  const inventoryItems = await Inventory.find({
    name: { $in: [...PIZZA_BASES, ...SAUCES, ...CHEESES, ...VEGETABLES] },
  });

  const availability = {};
  inventoryItems.forEach((item) => {
    availability[item.name] = item.quantity > 0;
  });

  const withAvailability = (list) => list.map((name) => ({ name, available: availability[name] !== false }));

  res.json({
    success: true,
    options: {
      base: withAvailability(PIZZA_BASES),
      sauce: withAvailability(SAUCES),
      cheese: withAvailability(CHEESES),
      vegetable: withAvailability(VEGETABLES),
    },
    pricing: {
      base: 400,
      sauce: 50,
      cheesePerSelection: 80,
      vegetablePerSelection: 40,
    },
  });
});

module.exports = { getPizzas, getPizzaById, getBuilderOptions };
