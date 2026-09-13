const express = require('express');
const router = express.Router();
const { getPizzas, getPizzaById, getBuilderOptions } = require('../controllers/pizzaController');

router.get('/', getPizzas);
router.get('/builder/options', getBuilderOptions);
router.get('/:id', getPizzaById);

module.exports = router;
