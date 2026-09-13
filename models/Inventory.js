const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    category: { type: String, enum: ['base', 'sauce', 'cheese', 'vegetable'], required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    threshold: { type: Number, required: true, min: 0, default: 10 },
    unit: { type: String, default: 'units' },
    lowStockNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

inventorySchema.index({ category: 1, name: 1 }, { unique: true });

inventorySchema.virtual('status').get(function () {
  if (this.quantity <= 0) return 'Out of Stock';
  if (this.quantity < this.threshold) return 'Low Stock';
  return 'In Stock';
});

inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', inventorySchema);
