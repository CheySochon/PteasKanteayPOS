const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventoryController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const inventoryRoles = [authMiddleware, roleMiddleware(['Admin', 'Staff'])];

router.get('/ingredients', asyncHandler(controller.listIngredients));
router.post('/ingredients', inventoryRoles, asyncHandler(controller.createIngredient));
router.put('/ingredients/:id', inventoryRoles, asyncHandler(controller.updateIngredient));
router.delete('/ingredients/:id', inventoryRoles, asyncHandler(controller.deleteIngredient));
router.get('/stock-movements', asyncHandler(controller.listStockMovements));
router.post('/stock-adjustment', inventoryRoles, asyncHandler(controller.stockAdjustment));
router.get('/low-stock', asyncHandler(controller.lowStock));

module.exports = router;
