const { prisma } = require('../lib/prisma');
const { formatOrder } = require('../services/orderService');

async function list(req, res) {
  const data = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, message: 'Customers fetched', data });
}

async function get(req, res) {
  const data = await prisma.customer.findFirst({
    where: { id: Number(req.params.id), deletedAt: null },
  });
  if (!data) return res.status(404).json({ success: false, message: 'Customer not found' });
  res.json({ success: true, message: 'Customer fetched', data });
}

async function create(req, res) {
  const data = await prisma.customer.create({
    data: {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      loyaltyPoints: req.body.loyaltyPoints || 0,
    },
  });
  res.status(201).json({ success: true, message: 'Customer created', data });
}

async function update(req, res) {
  const data = await prisma.customer.update({
    where: { id: Number(req.params.id) },
    data: {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      loyaltyPoints: req.body.loyaltyPoints,
    },
  });
  res.json({ success: true, message: 'Customer updated', data });
}

async function orders(req, res) {
  const rows = await prisma.order.findMany({
    where: { customerId: Number(req.params.id), deletedAt: null },
    include: { table: true, items: true, payments: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, message: 'Customer orders fetched', data: rows.map(formatOrder) });
}

module.exports = { list, get, create, update, orders };
