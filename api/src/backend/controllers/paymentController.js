const paymentService = require('../services/paymentService');

async function list(req, res) {
  const data = await paymentService.listPayments();
  res.json({ success: true, message: 'Payments fetched', data });
}

async function create(req, res) {
  const data = await paymentService.createPayment(req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'Payment created', data });
}

async function listByOrder(req, res) {
  const data = await paymentService.listOrderPayments(req.params.orderId);
  res.json({ success: true, message: 'Order payments fetched', data });
}

module.exports = { list, create, listByOrder };
