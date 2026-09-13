const ROLES = { USER: 'user', ADMIN: 'admin' };

const ORDER_STATUS = [
  'Order Received',
  'In Kitchen',
  'Sent to Delivery',
  'Delivered',
  'Cancelled',
];

const INVENTORY_CATEGORIES = ['base', 'sauce', 'cheese', 'vegetable'];

const PIZZA_BASES = ['Classic', 'Thin Crust', 'Whole Wheat', 'Cheese Burst', 'Gluten Free'];
const SAUCES = ['Tomato', 'BBQ', 'Garlic', 'Pesto', 'Spicy'];
const CHEESES = ['Mozzarella', 'Cheddar', 'Parmesan', 'Cheese Blend'];
const VEGETABLES = ['Onion', 'Capsicum', 'Mushroom', 'Olives', 'Tomato', 'Jalapeno', 'Corn', 'Spinach'];

const DELIVERY_FEE = 150; // flat delivery fee, in smallest display currency unit (e.g. PKR/INR)

module.exports = {
  ROLES,
  ORDER_STATUS,
  INVENTORY_CATEGORIES,
  PIZZA_BASES,
  SAUCES,
  CHEESES,
  VEGETABLES,
  DELIVERY_FEE,
};
