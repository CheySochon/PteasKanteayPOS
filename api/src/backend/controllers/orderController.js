const orderService = require('../services/orderService');

async function list(req, res) {
  const data = await orderService.listOrders(req.query);
  res.json(data);
}

async function get(req, res) {
  const data = await orderService.getOrder(req.params.id);
  res.json(data);
}

async function create(req, res) {
  const data = await orderService.createOrder(req.body, req.user?.id);
  res.status(201).json(data);
}

async function updateStatus(req, res) {
  const data = await orderService.updateStatus(req.params.id, req.body.status);
  res.json({ success: true, message: 'Order status updated', data });
}

async function remove(req, res) {
  await orderService.deleteOrder(req.params.id);
  res.json({ success: true, message: 'Order deleted' });
}

async function addItem(req, res) {
  const data = await orderService.addItem(req.params.id, req.body);
  res.status(201).json({ success: true, message: 'Order item added', data });
}

async function splitBill(req, res) {
  const data = await orderService.splitBill(req.params.id, req.body.splits || []);
  res.json({ success: true, message: 'Split bill calculated', data });
}

module.exports = { list, get, create, updateStatus, remove, addItem, splitBill };
