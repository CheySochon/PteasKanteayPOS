const inventoryService = require('../services/inventoryService');

async function listIngredients(req, res) {
  const data = await inventoryService.listIngredients();
  res.json({ success: true, message: 'Ingredients fetched', data });
}

async function createIngredient(req, res) {
  const data = await inventoryService.createIngredient(req.body);
  res.status(201).json({ success: true, message: 'Ingredient created', data });
}

async function updateIngredient(req, res) {
  const data = await inventoryService.updateIngredient(req.params.id, req.body);
  res.json({ success: true, message: 'Ingredient updated', data });
}

async function deleteIngredient(req, res) {
  await inventoryService.deleteIngredient(req.params.id);
  res.json({ success: true, message: 'Ingredient deleted' });
}

async function listStockMovements(req, res) {
  const data = await inventoryService.listStockMovements();
  res.json({ success: true, message: 'Stock movements fetched', data });
}

async function stockAdjustment(req, res) {
  const data = await inventoryService.createStockAdjustment({ ...req.body, createdById: req.user?.id });
  res.status(201).json({ success: true, message: 'Stock adjustment created', data });
}

async function lowStock(req, res) {
  const data = await inventoryService.getLowStock();
  res.json({ success: true, message: 'Low stock fetched', data });
}

module.exports = {
  listIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  listStockMovements,
  stockAdjustment,
  lowStock,
};
