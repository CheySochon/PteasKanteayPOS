const { prisma } = require('../lib/prisma');

async function list(req, res) {
  const data = await prisma.shift.findMany({
    include: { user: { include: { role: true } } },
    orderBy: { startTime: 'desc' },
  });
  res.json({ success: true, message: 'Shifts fetched', data });
}

async function start(req, res) {
  const userId = req.user?.id || Number(req.body.userId);
  if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

  const data = await prisma.shift.create({
    data: {
      userId,
      openingCash: req.body.openingCash || 0,
      notes: req.body.notes,
      status: 'open',
    },
  });
  res.status(201).json({ success: true, message: 'Shift started', data });
}

async function end(req, res) {
  const data = await prisma.shift.update({
    where: { id: Number(req.params.id) },
    data: {
      endTime: new Date(),
      closingCash: req.body.closingCash || 0,
      notes: req.body.notes,
      status: 'closed',
    },
  });
  res.json({ success: true, message: 'Shift ended', data });
}

module.exports = { list, start, end };
