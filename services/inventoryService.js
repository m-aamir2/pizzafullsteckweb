const Inventory = require('../models/Inventory');
const ApiError = require('../utils/ApiError');

// Builds a flat map of { "category|name": quantityNeeded } for every custom-pizza
// component in the order, so we can validate and deduct stock in one pass.
const buildRequirements = (items) => {
  const requirements = {};

  const add = (category, name, qty) => {
    const key = `${category}|${name}`;
    requirements[key] = (requirements[key] || 0) + qty;
  };

  items.forEach((item) => {
    if (item.type !== 'custom' || !item.customPizza) return;
    const { base, sauce, cheese = [], vegetables = [] } = item.customPizza;
    const qty = item.quantity;

    if (base) add('base', base, qty);
    if (sauce) add('sauce', sauce, qty);
    cheese.forEach((c) => add('cheese', c, qty));
    vegetables.forEach((v) => add('vegetable', v, qty));
  });

  return requirements;
};

// Verifies stock is sufficient WITHOUT mutating anything. Used for cart/checkout preview.
const checkStockAvailability = async (items) => {
  const requirements = buildRequirements(items);
  const keys = Object.keys(requirements);
  if (keys.length === 0) return { ok: true, shortages: [] };

  const shortages = [];
  for (const key of keys) {
    const [category, name] = key.split('|');
    const record = await Inventory.findOne({ category, name });
    const needed = requirements[key];
    if (!record || record.quantity < needed) {
      shortages.push({ category, name, needed, available: record ? record.quantity : 0 });
    }
  }

  return { ok: shortages.length === 0, shortages };
};

// Atomically deducts stock for every required component. Each decrement uses a
// conditional filter (quantity >= needed) so two simultaneous orders can never
// push a count negative — the update simply fails to match if stock has run out.
// If any single deduction fails partway through, every prior deduction in this
// order is rolled back (restocked) so the order is all-or-nothing.
const deductStockForOrder = async (items) => {
  const requirements = buildRequirements(items);
  const keys = Object.keys(requirements);
  const applied = [];

  try {
    for (const key of keys) {
      const [category, name] = key.split('|');
      const needed = requirements[key];

      const updated = await Inventory.findOneAndUpdate(
        { category, name, quantity: { $gte: needed } },
        { $inc: { quantity: -needed } },
        { new: true }
      );

      if (!updated) {
        throw new ApiError(409, `Insufficient inventory for ${name} (${category})`);
      }

      applied.push({ category, name, needed });
    }

    return true;
  } catch (err) {
    // Roll back anything we already deducted in this attempt
    for (const item of applied) {
      await Inventory.updateOne(
        { category: item.category, name: item.name },
        { $inc: { quantity: item.needed } }
      );
    }
    throw err;
  }
};

module.exports = { buildRequirements, checkStockAvailability, deductStockForOrder };
