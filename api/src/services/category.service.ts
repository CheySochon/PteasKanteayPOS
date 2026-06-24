import { prisma } from "../config/prisma.js";

function slugify(value: string): string {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
}) => {
  return prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug ?? slugify(data.name),
      description: data.description,
    },
  });
};

export const updateCategory = async (
  id: number,
  data: {
    name?: string;
    slug?: string;
    description?: string;
  },
) => {
  return prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug ?? (data.name ? slugify(data.name) : undefined),
      description: data.description,
    },
  });
};

export const deleteCategory = async (id: number) => {
  return prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
