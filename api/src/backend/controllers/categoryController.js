const { prisma } = require('../lib/prisma');

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function list(req, res) {
  const data = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, message: 'Categories fetched', data });
}

async function create(req, res) {
  const data = await prisma.category.create({
    data: {
      name: req.body.name,
      slug: req.body.slug || slugify(req.body.name),
      description: req.body.description,
    },
  });
  res.status(201).json({ success: true, message: 'Category created', data });
}

async function update(req, res) {
  const data = await prisma.category.update({
    where: { id: Number(req.params.id) },
    data: {
      name: req.body.name,
      slug: req.body.slug || (req.body.name ? slugify(req.body.name) : undefined),
      description: req.body.description,
    },
  });
  res.json({ success: true, message: 'Category updated', data });
}

async function remove(req, res) {
  await prisma.category.update({
    where: { id: Number(req.params.id) },
    data: { deletedAt: new Date() },
  });
  res.json({ success: true, message: 'Category deleted' });
}

module.exports = { list, create, update, remove };
