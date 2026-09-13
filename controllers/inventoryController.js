const Inventory = require('../models/Inventory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/inventory  (admin)
const getInventory = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const items = await Inventory.find(filter).sort({ category: 1, name: 1 });
  res.json({ success: true, items });
});

// PUT /api/inventory/:id  (admin) — set/adjust quantity or threshold
const updateInventory = asyncHandler(async (req, res) => {
  const { quantity, threshold, adjust } = req.body;
  const item = await Inventory.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Inventory item not found');

  if (typeof adjust === 'number') {
    item.quantity = Math.max(0, item.quantity + adjust);
  } else if (typeof quantity === 'number') {
    item.quantity = Math.max(0, quantity);
  }

  if (typeof threshold === 'number') {
    item.threshold = Math.max(0, threshold);
  }

  await item.save();
  res.json({ success: true, item });
});

// POST /api/inventory (admin) — add a new tracked item
const createInventoryItem = asyncHandler(async (req, res) => {
  const { category, name, quantity, threshold, unit } = req.body;
  if (!category || !name) throw new ApiError(400, 'Category and name are required');

  const item = await Inventory.create({
    category,
    name,
    quantity: quantity || 0,
    threshold: threshold ?? 10,
    unit: unit || 'units',
  });

  res.status(201).json({ success: true, item });
});

module.exports = { getInventory, updateInventory, createInventoryItem };
