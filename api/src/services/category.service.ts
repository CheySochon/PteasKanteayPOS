import { prisma } from "../config/prisma.js";

function slugify(value: string): string {
  const cleaned = String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!cleaned) {
    return `cat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  }
  return cleaned;
}

async function uniqueCategorySlug(value: string, excludeId?: number): Promise<string> {
  const base = slugify(value);
  let slug = base;
  let suffix = 2;

  while (
    await prisma.category.findFirst({
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

export const listCategories = async () => {
  return prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
};

export const createCategory = async (data: {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string | null;
}) => {
  const cleanName = data.name.trim();
  const baseSlug = data.slug || cleanName;
  const targetSlug = slugify(baseSlug);

  // Check if active or soft-deleted category with same name or slug exists
  const existing = await prisma.category.findFirst({
    where: {
      OR: [
        { name: { equals: cleanName, mode: "insensitive" } },
        { slug: targetSlug },
      ],
    },
  });

  if (existing) {
    if (existing.deletedAt !== null) {
      return prisma.category.update({
        where: { id: existing.id },
        data: {
          name: cleanName,
          description: data.description,
          imageUrl: data.imageUrl,
          deletedAt: null,
        },
      });
    }
    // If active category with same name exists, return it
    if (existing.name.toLowerCase() === cleanName.toLowerCase()) {
      return existing;
    }
  }

  const slug = await uniqueCategorySlug(baseSlug);

  return prisma.category.create({
    data: {
      name: cleanName,
      slug,
      description: data.description,
      imageUrl: data.imageUrl,
    },
  });
};

export const updateCategory = async (
  id: number,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    imageUrl?: string | null;
  },
) => {
  const cleanName = data.name?.trim();
  const slug =
    data.slug ?? cleanName
      ? await uniqueCategorySlug((data.slug ?? cleanName)!, id)
      : undefined;

  return prisma.category.update({
    where: { id },
    data: {
      ...(cleanName ? { name: cleanName } : {}),
      ...(slug ? { slug } : {}),
      description: data.description,
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
    },
  });
};

export const deleteCategory = async (id: number) => {
  return prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
