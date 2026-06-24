const { prisma } = require('../lib/prisma');

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product';
}

const include = {
  category: true,
  variants: { where: { deletedAt: null } },
  modifierMaps: { include: { modifier: true } },
  ingredients: { include: { ingredient: true } },
};

async function list(req, res) {
  const data = await prisma.product.findMany({
    where: { deletedAt: null },
    include,
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, message: 'Products fetched', data });
}

async function get(req, res) {
  const data = await prisma.product.findFirst({
    where: { id: Number(req.params.id), deletedAt: null },
    include,
  });
  if (!data) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, message: 'Product fetched', data });
}

async function create(req, res) {
  const slug = await uniqueProductSlug(req.body.slug || req.body.name);

  const data = await prisma.product.create({
    data: {
      categoryId: Number(req.body.categoryId),
      name: req.body.name,
      slug,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      basePrice: req.body.basePrice,
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
      variants: Array.isArray(req.body.variants) ? {
        create: req.body.variants.map((variant) => ({
          name: variant.name,
          price: variant.price,
          sku: variant.sku,
          isAvailable: variant.isAvailable !== undefined ? variant.isAvailable : true,
        })),
      } : undefined,
    },
    include,
  });
  res.status(201).json({ success: true, message: 'Product created', data });
}

async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Product image is required' });
  }

  const imageUrl = `/uploads/products/${req.file.filename}`;

  res.status(201).json({
    success: true,
    message: 'Product image uploaded',
    data: { imageUrl },
  });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const slug = req.body.slug || req.body.name
    ? await uniqueProductSlug(req.body.slug || req.body.name, id)
    : undefined;

  const data = await prisma.product.update({
    where: { id },
    data: {
      categoryId: req.body.categoryId ? Number(req.body.categoryId) : undefined,
      name: req.body.name,
      slug,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      basePrice: req.body.basePrice,
      isAvailable: req.body.isAvailable,
    },
    include,
  });
  res.json({ success: true, message: 'Product updated', data });
}

async function remove(req, res) {
  await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: { deletedAt: new Date() },
  });
  res.json({ success: true, message: 'Product deleted' });
}

async function uniqueProductSlug(value, excludeId) {
  const base = slugify(value);
  let slug = base;
  let suffix = 2;

  while (
    await prisma.product.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

module.exports = { list, get, create, update, remove, uploadImage };
