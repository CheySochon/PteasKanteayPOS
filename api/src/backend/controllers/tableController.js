const { prisma } = require('../lib/prisma');
const { makeQrPngBuffer, makeTableToken } = require('../utils/qr');

async function list(req, res) {
  const data = await prisma.diningTable.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, message: 'Tables fetched', data });
}

async function create(req, res) {
  const data = await prisma.diningTable.create({
    data: {
      name: req.body.name,
      capacity: Number(req.body.capacity || 2),
      zone: req.body.zone || 'indoor',
      qrToken: req.body.qrToken || makeTableToken(req.body.name),
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    },
  });
  res.status(201).json({ success: true, message: 'Table created', data });
}

async function update(req, res) {
  const data = await prisma.diningTable.update({
    where: { id: Number(req.params.id) },
    data: {
      name: req.body.name,
      capacity: req.body.capacity ? Number(req.body.capacity) : undefined,
      zone: req.body.zone,
      qrToken: req.body.qrToken,
      isActive: req.body.isActive,
    },
  });
  res.json({ success: true, message: 'Table updated', data });
}

async function remove(req, res) {
  await prisma.diningTable.update({
    where: { id: Number(req.params.id) },
    data: { deletedAt: new Date() },
  });
  res.json({ success: true, message: 'Table deleted' });
}

async function qrMenu(req, res) {
  const table = await prisma.diningTable.findFirst({
    where: { qrToken: req.params.qrToken, deletedAt: null, isActive: true },
  });
  if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
    prisma.product.findMany({
      where: { deletedAt: null, isAvailable: true },
      include: {
        category: true,
        variants: { where: { deletedAt: null, isAvailable: true } },
        modifierMaps: { include: { modifier: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  res.json({ success: true, message: 'QR menu fetched', data: { table, categories, products } });
}

async function qrCode(req, res) {
  const table = await prisma.diningTable.findFirst({
    where: { qrToken: req.params.qrToken, deletedAt: null },
  });
  if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

  const fallbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/qr/${table.qrToken}`;
  const qrUrl = typeof req.query.url === 'string' && req.query.url ? req.query.url : fallbackUrl;
  const png = await makeQrPngBuffer(qrUrl);

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  res.send(png);
}

module.exports = { list, create, update, remove, qrMenu, qrCode };
