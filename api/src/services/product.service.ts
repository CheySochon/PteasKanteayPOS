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
  inventory: true,
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

export async function shouldTrackStockForProduct(categoryId?: number, productName?: string): Promise<boolean> {
  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (category) {
      const catNameLower = `${category.name} ${category.nameKm || ""} ${category.slug}`.toLowerCase();
      const isDrinkCategory = [
        "coffee", "tea", "frappe", "drink", "drinks", "beverage", "beverages",
        "juice", "smoothie", "boba", "soda", "beer", "wine", "កាហ្វេ", "តែ", "ភេសជ្ជៈ", "គ្រឿងផឹក"
      ].some((kw) => catNameLower.includes(kw));
      if (isDrinkCategory) return true;
    }
  }

  if (productName) {
    const prodNameLower = productName.toLowerCase();
    const isDrinkName = [
      "americano", "latte", "cappuccino", "mocha", "espresso", "frappe", "tea", "green tea",
      "coca", "coke", "pepsi", "sprite", "fanta", "water", "soda", "juice", "smoothie",
      "beer", "wine", "vital", "ទឹកក្រូច", "ទឹកសុទ្ធ", "ភេសជ្ជៈ"
    ].some((kw) => prodNameLower.includes(kw));
    if (isDrinkName) return true;
  }

  return false;
}

export const createProduct = async (data: {
  categoryId: number;
  name: string;
  nameKm?: string | null;
  slug?: string;
  description?: string;
  descriptionKm?: string | null;
  imageUrl?: string;
  basePrice: number;
  isAvailable?: boolean;
  prepTime?: number;
  unit?: string;
  trackStock?: boolean;
}) => {
  const slug = await uniqueProductSlug(data.slug ?? data.name);
  const autoTrack = data.trackStock !== undefined ? data.trackStock : await shouldTrackStockForProduct(data.categoryId, data.name);

  return prisma.product.create({
    data: {
      categoryId: data.categoryId,
      name: data.name,
      nameKm: data.nameKm ? data.nameKm.trim() : null,
      slug,
      description: data.description,
      descriptionKm: data.descriptionKm ? data.descriptionKm.trim() : null,
      imageUrl: data.imageUrl,
      basePrice: data.basePrice,
      isAvailable: data.isAvailable ?? true,
      prepTime: data.prepTime ?? 10,
      unit: data.unit ?? "pc",
      trackStock: autoTrack,
      inventory: {
        create: {
          quantity: autoTrack ? 50 : 0,
          minStock: autoTrack ? 10 : 0,
        },
      },
    },
    include: productInclude,
  });
};

export const updateProduct = async (
  id: number,
  data: {
    categoryId?: number;
    name?: string;
    nameKm?: string | null;
    slug?: string;
    description?: string;
    descriptionKm?: string | null;
    imageUrl?: string | null;
    basePrice?: number;
    isAvailable?: boolean;
    prepTime?: number;
    unit?: string;
    trackStock?: boolean;
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
      ...(data.nameKm !== undefined ? { nameKm: data.nameKm ? data.nameKm.trim() : null } : {}),
      slug,
      description: data.description,
      ...(data.descriptionKm !== undefined ? { descriptionKm: data.descriptionKm ? data.descriptionKm.trim() : null } : {}),
      imageUrl: data.imageUrl,
      basePrice: data.basePrice,
      isAvailable: data.isAvailable,
      prepTime: data.prepTime,
      unit: data.unit,
      trackStock: data.trackStock,
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
