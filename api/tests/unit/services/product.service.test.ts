import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../../src/services/product.service.js";

const mockFindMany = prisma.product.findMany as Mock;
const mockFindFirst = prisma.product.findFirst as Mock;
const mockCreate = prisma.product.create as Mock;
const mockUpdate = prisma.product.update as Mock;

const fakeProduct = {
  id: 1,
  name: "Iced Coffee",
  slug: "iced-coffee",
  description: "Cold brew coffee",
  basePrice: 3.5,
  isAvailable: true,
  categoryId: 1,
  category: { id: 1, name: "Drinks" },
  deletedAt: null,
};

describe("product.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── listProducts ──────────────────────────────────────────────────────────

  describe("listProducts", () => {
    it("should return all non-deleted products ordered by name", async () => {
      mockFindMany.mockResolvedValue([fakeProduct]);

      const result = await listProducts();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Iced Coffee");
    });

    it("should return an empty array when no products exist", async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await listProducts();

      expect(result).toEqual([]);
    });
  });

  // ─── getProduct ────────────────────────────────────────────────────────────

  describe("getProduct", () => {
    it("should return the product when found", async () => {
      mockFindFirst.mockResolvedValue(fakeProduct);

      const result = await getProduct(1);

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, deletedAt: null } })
      );
      expect(result.name).toBe("Iced Coffee");
    });

    it("should throw 'Product not found' when product does not exist", async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(getProduct(999)).rejects.toThrow("Product not found");
    });
  });

  // ─── createProduct ─────────────────────────────────────────────────────────

  describe("createProduct", () => {
    it("should create and return a product with a generated slug", async () => {
      // uniqueProductSlug calls findFirst once (returns null = slug is free)
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeProduct);

      const result = await createProduct({
        categoryId: 1,
        name: "Iced Coffee",
        basePrice: 3.5,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Iced Coffee",
            slug: "iced-coffee",
            basePrice: 3.5,
            isAvailable: true,
          }),
        })
      );
      expect(result.name).toBe("Iced Coffee");
    });

    it("should use a provided slug over the auto-generated one", async () => {
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ ...fakeProduct, slug: "my-custom-slug" });

      await createProduct({
        categoryId: 1,
        name: "Iced Coffee",
        slug: "my-custom-slug",
        basePrice: 3.5,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "my-custom-slug" }),
        })
      );
    });

    it("should append a suffix when the slug already exists", async () => {
      // First findFirst → slug taken, second → free
      mockFindFirst
        .mockResolvedValueOnce({ id: 99 }) // "iced-coffee" is taken
        .mockResolvedValueOnce(null);       // "iced-coffee-2" is free
      mockCreate.mockResolvedValue({ ...fakeProduct, slug: "iced-coffee-2" });

      await createProduct({ categoryId: 1, name: "Iced Coffee", basePrice: 3.5 });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "iced-coffee-2" }),
        })
      );
    });

    it("should default isAvailable to true when not provided", async () => {
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeProduct);

      await createProduct({ categoryId: 1, name: "Latte", basePrice: 4 });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isAvailable: true }),
        })
      );
    });
  });

  // ─── updateProduct ─────────────────────────────────────────────────────────

  describe("updateProduct", () => {
    it("should update the product and return the result", async () => {
      mockFindFirst.mockResolvedValue(null); // slug is free
      mockUpdate.mockResolvedValue({ ...fakeProduct, basePrice: 5.0 });

      const result = await updateProduct(1, { basePrice: 5.0 });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } })
      );
      expect(result.basePrice).toBe(5.0);
    });

    it("should allow setting isAvailable to false", async () => {
      mockFindFirst.mockResolvedValue(null);
      mockUpdate.mockResolvedValue({ ...fakeProduct, isAvailable: false });

      await updateProduct(1, { isAvailable: false });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isAvailable: false }),
        })
      );
    });
  });

  // ─── deleteProduct ─────────────────────────────────────────────────────────

  describe("deleteProduct", () => {
    it("should soft-delete the product by setting deletedAt", async () => {
      mockUpdate.mockResolvedValue({ ...fakeProduct, deletedAt: new Date() });

      await deleteProduct(1);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });
});
