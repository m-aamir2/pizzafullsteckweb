require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Pizza = require('../models/Pizza');
const Inventory = require('../models/Inventory');
const { PIZZA_BASES, SAUCES, CHEESES, VEGETABLES } = require('../config/constants');

const pizzas = [
  {
    name: 'Margherita',
    description: 'Classic delight with rich tomato sauce, fresh mozzarella, and basil.',
    price: 799,
    image: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=600',
    ingredients: ['Tomato Sauce', 'Mozzarella', 'Basil'],
    available: true,
  },
  {
    name: 'Pepperoni',
    description: 'Loaded with generous layers of spicy pepperoni and melted cheese.',
    price: 999,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600',
    ingredients: ['Tomato Sauce', 'Mozzarella', 'Pepperoni'],
    available: true,
  },
  {
    name: 'Veggie Supreme',
    description: 'A garden medley of capsicum, onion, mushroom, olives, and corn.',
    price: 899,
    image: 'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=600',
    ingredients: ['Tomato Sauce', 'Mozzarella', 'Capsicum', 'Onion', 'Mushroom', 'Olives', 'Corn'],
    available: true,
  },
  {
    name: 'Cheese Burst',
    description: 'An extra layer of gooey cheese stuffed right into the crust.',
    price: 1099,
    image: 'https://images.unsplash.com/photo-1548369937-47519962c11a?w=600',
    ingredients: ['Tomato Sauce', 'Mozzarella', 'Cheddar', 'Cheese Blend'],
    available: true,
  },
  {
    name: 'BBQ Chicken',
    description: 'Smoky BBQ sauce, grilled chicken chunks, and red onion.',
    price: 1199,
    image: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=600',
    ingredients: ['BBQ Sauce', 'Mozzarella', 'Grilled Chicken', 'Onion'],
    available: true,
  },
  {
    name: 'Spicy Chicken',
    description: 'Fiery chicken tikka pieces with jalapenos for those who like it hot.',
    price: 1199,
    image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600',
    ingredients: ['Spicy Sauce', 'Mozzarella', 'Chicken Tikka', 'Jalapeno'],
    available: true,
  },
  {
    name: 'Farmhouse',
    description: 'Onion, capsicum, tomato, and mushroom on a bed of melted cheese.',
    price: 899,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
    ingredients: ['Tomato Sauce', 'Mozzarella', 'Onion', 'Capsicum', 'Tomato', 'Mushroom'],
    available: true,
  },
  {
    name: 'Four Cheese',
    description: 'A rich blend of mozzarella, cheddar, parmesan, and cheese sauce.',
    price: 1049,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
    ingredients: ['Cheese Blend', 'Mozzarella', 'Cheddar', 'Parmesan'],
    available: true,
  },
];

const buildInventory = () => {
  const items = [];
  PIZZA_BASES.forEach((name) => items.push({ category: 'base', name, quantity: 50, threshold: 15 }));
  SAUCES.forEach((name) => items.push({ category: 'sauce', name, quantity: 50, threshold: 15 }));
  CHEESES.forEach((name) => items.push({ category: 'cheese', name, quantity: 50, threshold: 15 }));
  VEGETABLES.forEach((name) => items.push({ category: 'vegetable', name, quantity: 60, threshold: 20 }));
  return items;
};

const run = async () => {
  await connectDB();

  console.log('Clearing existing pizzas and inventory...');
  await Pizza.deleteMany({});
  await Inventory.deleteMany({});

  console.log('Seeding pizzas...');
  await Pizza.insertMany(pizzas);

  console.log('Seeding inventory...');
  await Inventory.insertMany(buildInventory());

  const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  // Never create a known default administrator. Provisioning is opt-in and
  // must supply both values through a trusted environment, not registration.
  if (!adminEmail || !adminPassword) {
    console.log('Admin seed configuration not supplied; skipping admin account.');
  } else {
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      console.log('Creating configured admin account...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: process.env.ADMIN_SEED_NAME || 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
      });
      console.log('Configured admin account created.');
    } else {
      console.log('Configured admin account already exists, skipping.');
    }
  }

  console.log('Seed complete.');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
