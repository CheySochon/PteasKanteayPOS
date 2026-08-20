import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../../src/utils/bcrypt.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password_123"),
}));

import { prisma } from "../../../src/config/prisma.js";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../../../src/services/user.service.js";

const mockUserFindMany = prisma.user.findMany as Mock;
const mockUserFindUnique = prisma.user.findUnique as Mock;
const mockUserCreate = prisma.user.create as Mock;
const mockUserUpdate = prisma.user.update as Mock;
const mockUserCount = prisma.user.count as Mock;

const mockRoleFindUnique = prisma.role.findUnique as Mock;
const mockRoleFindFirst = prisma.role.findFirst as Mock;
const mockRoleCreate = prisma.role.create as Mock;
const mockRoleFindMany = prisma.role.findMany as Mock;
const mockRoleUpdate = prisma.role.update as Mock;
const mockRoleDelete = prisma.role.delete as Mock;

const fakeRole = {
  id: 2,
  name: "Cashier",
  description: "Cashier Role",
  permissions: [],
};

const fakeUser = {
  id: 10,
  email: "john@example.com",
  name: "John Doe",
  role: fakeRole,
  isActive: true,
  pin: "1234",
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("user.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listUsers", () => {
    it("should return list of non-deleted users", async () => {
      mockUserFindMany.mockResolvedValue([fakeUser]);

      const result = await listUsers();

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } })
      );
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("john@example.com");
    });
  });

  describe("createUser", () => {
    it("should create user when email is not registered", async () => {
      mockUserFindUnique.mockResolvedValue(null);
      mockRoleFindUnique.mockResolvedValue(fakeRole);
      mockUserCreate.mockResolvedValue(fakeUser);

      const result = await createUser({
        email: "john@example.com",
        password: "secretpassword",
        name: "John Doe",
        roleName: "Cashier",
      });

      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "john@example.com",
            name: "John Doe",
            roleId: 2,
          }),
        })
      );
      expect(result.name).toBe("John Doe");
    });

    it("should throw error if email already exists", async () => {
      mockUserFindUnique.mockResolvedValue(fakeUser);

      await expect(
        createUser({
          email: "john@example.com",
          password: "secretpassword",
          name: "John Doe",
        })
      ).rejects.toThrow("Email is already registered");
    });
  });

  describe("updateUser", () => {
    it("should update user data when user exists", async () => {
      mockUserFindUnique.mockResolvedValue(fakeUser);
      mockRoleFindUnique.mockResolvedValue(fakeRole);
      mockUserUpdate.mockResolvedValue({ ...fakeUser, name: "John Updated" });

      const result = await updateUser(10, { name: "John Updated" });

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({ name: "John Updated" }),
        })
      );
      expect(result.name).toBe("John Updated");
    });

    it("should throw error if user not found", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(updateUser(999, { name: "New" })).rejects.toThrow("User not found");
    });
  });

  describe("deleteUser", () => {
    it("should soft-delete user by setting deletedAt", async () => {
      mockUserFindUnique.mockResolvedValue(fakeUser);
      mockUserUpdate.mockResolvedValue({ ...fakeUser, deletedAt: new Date() });

      await deleteUser(10);

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it("should throw error if user does not exist", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(deleteUser(999)).rejects.toThrow("User not found");
    });
  });

  describe("Role operations", () => {
    it("should list roles", async () => {
      mockRoleFindMany.mockResolvedValue([fakeRole]);

      const result = await listRoles();

      expect(result).toHaveLength(1);
    });

    it("should create a new role", async () => {
      mockRoleFindUnique.mockResolvedValue(null);
      mockRoleCreate.mockResolvedValue(fakeRole);

      const result = await createRole({
        name: "Cashier",
        description: "Cashier Role",
        permissions: [],
      });

      expect(result.name).toBe("Cashier");
    });

    it("should throw error when creating duplicate role name", async () => {
      mockRoleFindUnique.mockResolvedValue(fakeRole);

      await expect(
        createRole({
          name: "Cashier",
          description: "Cashier Role",
          permissions: [],
        })
      ).rejects.toThrow("Role name is already registered");
    });

    it("should delete a role if no users are assigned", async () => {
      mockRoleFindUnique.mockResolvedValue(fakeRole);
      mockUserCount.mockResolvedValue(0);
      mockRoleDelete.mockResolvedValue(fakeRole);

      await deleteRole(2);

      expect(mockRoleDelete).toHaveBeenCalledWith({ where: { id: 2 } });
    });

    it("should throw error when deleting role assigned to users", async () => {
      mockRoleFindUnique.mockResolvedValue(fakeRole);
      mockUserCount.mockResolvedValue(3);

      await expect(deleteRole(2)).rejects.toThrow("Cannot delete role");
    });
  });
});
