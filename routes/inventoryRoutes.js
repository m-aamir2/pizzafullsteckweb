const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { getInventory, updateInventory, createInventoryItem } = require('../controllers/inventoryController');

router.use(protect, requireAdmin);
router.get('/', getInventory);
router.post('/', createInventoryItem);
router.put('/:id', updateInventory);

module.exports = router;
