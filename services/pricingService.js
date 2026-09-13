const ApiError = require('../utils/ApiError');
const { PIZZA_BASES, SAUCES, CHEESES, VEGETABLES } = require('../config/constants');

const CUSTOM_PRICING = {
  base: 400,
  sauce: 50,
  cheesePerSelection: 80,
  vegetablePerSelection: 40,
};

const ensureKnownSelections = (values, allowed, field) => {
  if (!Array.isArray(values) || values.some((value) => !allowed.includes(value))) {
    throw new ApiError(400, `Invalid custom pizza ${field}`);
  }
  return [...new Set(values)];
};

// This is the authoritative custom-pizza format and price. Browser-provided
// prices are never trusted.
const normalizeCustomPizza = (raw) => {
  if (!raw || !PIZZA_BASES.includes(raw.base) || !SAUCES.includes(raw.sauce)) {
    throw new ApiError(400, 'A valid custom pizza base and sauce are required');
  }
  const cheese = ensureKnownSelections(raw.cheese, CHEESES, 'cheese');
  if (cheese.length === 0) throw new ApiError(400, 'Choose at least one cheese');
  const vegetables = ensureKnownSelections(raw.vegetables || [], VEGETABLES, 'vegetables');

  return { base: raw.base, sauce: raw.sauce, cheese, vegetables };
};

const priceCustomPizza = (customPizza) =>
  CUSTOM_PRICING.base +
  CUSTOM_PRICING.sauce +
  customPizza.cheese.length * CUSTOM_PRICING.cheesePerSelection +
  customPizza.vegetables.length * CUSTOM_PRICING.vegetablePerSelection;

module.exports = { CUSTOM_PRICING, normalizeCustomPizza, priceCustomPizza };
