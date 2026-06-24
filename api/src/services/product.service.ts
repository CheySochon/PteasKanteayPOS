import { prisma } from "../config/prisma.js";

function slugify(value: string): string {
  return (
    String(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "product"
  );
}

const productInclude = {
  category: true,
  variants: { where: { deletedAt: null as Date | null } },
  modifierMaps: { include: { modifier: true } },
  ingredients: { include: { ingredient: true } },
};

async function uniqueProductSlug(value: string, excludeId?: number): Promise<string> {
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

export const listProducts = async () => {
  return prisma.product.findMany({
    where: { deletedAt: null },
    include: productInclude,
    orderBy: { name: "asc" },
  });
};

export const getProduct = async (id: number) => {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: productInclude,
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

export const createProduct = async (data: {
  categoryId: number;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  isAvailable?: boolean;
  variants?: { name: string; price: number; sku?: string; isAvailable?: boolean }[];
}) => {
  const slug = await uniqueProductSlug(data.slug ?? data.name);

  return prisma.product.create({
    data: {
      categoryId: data.categoryId,
      name: data.name,
      slug,
      description: data.description,
      imageUrl: data.imageUrl,
      basePrice: data.basePrice,
      isAvailable: data.isAvailable ?? true,
      variants: Array.isArray(data.variants)
        ? {
            create: data.variants.map((v) => ({
              name: v.name,
              price: v.price,
              sku: v.sku,
              isAvailable: v.isAvailable ?? true,
            })),
          }
        : undefined,
    },
    include: productInclude,
  });
};

export const updateProduct = async (
  id: number,
  data: {
    categoryId?: number;
    name?: string;
    slug?: string;
    description?: string;
    imageUrl?: string | null;
    basePrice?: number;
    isAvailable?: boolean;
  },
) => {
  const slug =
    data.slug ?? data.name
      ? await uniqueProductSlug((data.slug ?? data.name)!, id)
      : undefined;

  return prisma.product.update({
    where: { id },
    data: {
      categoryId: data.categoryId,
      name: data.name,
      slug,
      description: data.description,
      imageUrl: data.imageUrl,
      basePrice: data.basePrice,
      isAvailable: data.isAvailable,
    },
    include: productInclude,
  });
};

export const deleteProduct = async (id: number) => {
  return prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
