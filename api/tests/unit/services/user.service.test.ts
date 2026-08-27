import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((cb) =>
      cb({
        group: {
          create: vi.fn().mockResolvedValue({ id: 2, name: "Cashier" }),
          findUnique: vi.fn().mockResolvedValue({ id: 2, name: "Cashier" }),
          update: vi.fn().mockResolvedValue({ id: 2, name: "Cashier" }),
          delete: vi.fn().mockResolvedValue({ id: 2, name: "Cashier" }),
        },
        groupPermission: {
          createMany: vi.fn(),
          deleteMany: vi.fn(),
        },
        userGroup: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      })
    ),
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    groupPermission: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      upsert: vi.fn(),
    },
    userGroup: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
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

const mockGroupFindUnique = prisma.group.findUnique as Mock;
const mockGroupCreate = prisma.group.create as Mock;
const mockGroupFindMany = prisma.group.findMany as Mock;
const mockGroupCount = prisma.group.count as Mock;
const mockGroupDelete = prisma.group.delete as Mock;

const fakeGroup = {
  id: 2,
  name: "Cashier",
  description: "Cashier Group",
  _count: { userGroups: 0, groupPermissions: 2 },
  groupPermissions: [],
  userGroups: [],
};

const fakeUser = {
  id: 10,
  email: "john@example.com",
  name: "John Doe",
  userGroups: [
    {
      groupId: 2,
      userId: 10,
      group: fakeGroup,
    },
  ],
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
      mockGroupFindUnique.mockResolvedValue(fakeGroup);
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
      mockGroupFindUnique.mockResolvedValue(fakeGroup);
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

  describe("Role/Group compatibility operations", () => {
    it("should list groups/roles", async () => {
      mockGroupCount.mockResolvedValue(1);
      mockGroupFindMany.mockResolvedValue([fakeGroup]);

      const result = await listRoles();

      expect(result).toHaveLength(1);
    });

    it("should create a new group/role", async () => {
      mockGroupFindUnique.mockResolvedValue(null);
      mockGroupCreate.mockResolvedValue(fakeGroup);

      const result = await createRole({
        name: "Cashier",
        description: "Cashier Group",
        permissions: [],
      });

      expect(result).toBeDefined();
    });

    it("should throw error when creating duplicate group name", async () => {
      mockGroupFindUnique.mockResolvedValue(fakeGroup);

      await expect(
        createRole({
          name: "Cashier",
          description: "Cashier Group",
          permissions: [],
        })
      ).rejects.toThrow("Group name is already registered");
    });

    it("should delete a group if no users are assigned", async () => {
      mockGroupFindUnique.mockResolvedValue(fakeGroup);

      await deleteRole(2);
    });

    it("should throw error when deleting group assigned to users", async () => {
      mockGroupFindUnique.mockResolvedValue({
        ...fakeGroup,
        _count: { userGroups: 3 },
      });

      await expect(deleteRole(2)).rejects.toThrow("Cannot delete group");
    });
  });
});
