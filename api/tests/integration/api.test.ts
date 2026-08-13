import { describe, it, expect, vi, type Mock } from "vitest";
import request from "supertest";

vi.mock("../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../src/config/prisma.js";
import app from "../../src/app.js";

const mockFindMany = prisma.user.findMany as Mock;

describe("API Integration Tests", () => {
  describe("GET /health", () => {
    it("should return status 200 and health status OK", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "OK" });
    });
  });

  describe("GET /api/auth/staff", () => {
    it("should return status 200 and list of staff", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "1",
          name: "Sok",
          role: "Cashier",
          avatarBg: "bg-blue-500",
          initial: "S",
          pin: "1234",
        },
      ]);

      const response = await request(app).get("/api/auth/staff");
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty("name", "Sok");
    });
  });
});
