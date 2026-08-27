import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock prisma before importing the service
vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    userGroup: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../../src/utils/bcrypt.js", () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
}));

vi.mock("../../../src/utils/jwt.js", () => ({
  signToken: vi.fn(),
}));

vi.mock("../../../src/utils/rbac.js", () => ({
  getUserPermissions: vi.fn().mockResolvedValue(["pos.order.create", "pos.payment.process"]),
}));

import { prisma } from "../../../src/config/prisma.js";
import { hashPassword, comparePassword } from "../../../src/utils/bcrypt.js";
import { signToken } from "../../../src/utils/jwt.js";
import { register, login, updatePassword } from "../../../src/services/auth.service.js";

const mockFindUnique = prisma.user.findUnique as Mock;
const mockFindFirst = prisma.user.findFirst as Mock;
const mockCreate = prisma.user.create as Mock;
const mockUpdate = prisma.user.update as Mock;
const mockGroupFindUnique = prisma.group.findUnique as Mock;
const mockGroupFindFirst = prisma.group.findFirst as Mock;
const mockGroupCreate = prisma.group.create as Mock;
const mockHashPassword = hashPassword as Mock;
const mockComparePassword = comparePassword as Mock;
const mockSignToken = signToken as Mock;

const fakeGroup = { id: 1, name: "Staff", groupPermissions: [] };
const fakeUser = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
  password: "hashed_pw",
  isActive: true,
  userGroups: [{ groupId: 1, userId: 1, group: fakeGroup }],
};

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe("register", () => {
    it("should register a new user and return user + token", async () => {
      mockFindUnique.mockResolvedValueOnce(null); // no existing user
      mockHashPassword.mockResolvedValue("hashed_pw");
      mockGroupFindUnique.mockResolvedValue(fakeGroup);
      mockCreate.mockResolvedValue(fakeUser);
      mockSignToken.mockReturnValue("fake_token");

      const result = await register({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      });

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
      expect(mockHashPassword).toHaveBeenCalledWith("password123");
      expect(mockCreate).toHaveBeenCalled();
      expect(result.token).toBe("fake_token");
      expect(result.user.name).toBe("Test User");
    });

    it("should throw if email is already in use", async () => {
      mockFindUnique.mockResolvedValueOnce(fakeUser); // existing user

      await expect(
        register({ email: "test@example.com", password: "pw", name: "Test" })
      ).rejects.toThrow("Email already in use");
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("should return user and token on successful login", async () => {
      mockFindFirst.mockResolvedValue(fakeUser);
      mockComparePassword.mockResolvedValue(true);
      mockSignToken.mockReturnValue("fake_token");

      const result = await login("test@example.com", "password123");

      expect(mockFindFirst).toHaveBeenCalled();
      expect(mockComparePassword).toHaveBeenCalledWith("password123", fakeUser.password);
      expect(result.token).toBe("fake_token");
      expect(result.user.name).toBe("Test User");
    });

    it("should throw if user is not found", async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(login("nobody@example.com", "pw")).rejects.toThrow("Invalid credentials");
    });

    it("should throw if user is inactive", async () => {
      mockFindFirst.mockResolvedValue({ ...fakeUser, isActive: false });

      await expect(login("test@example.com", "pw")).rejects.toThrow("Account is disabled");
    });

    it("should throw if password is wrong", async () => {
      mockFindFirst.mockResolvedValue(fakeUser);
      mockComparePassword.mockResolvedValue(false);

      await expect(login("test@example.com", "wrong_pw")).rejects.toThrow("Invalid credentials");
    });
  });

  // ─── updatePassword ────────────────────────────────────────────────────────

  describe("updatePassword", () => {
    it("should update password successfully", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);
      mockComparePassword
        .mockResolvedValueOnce(true)  // current password valid
        .mockResolvedValueOnce(false); // new password is different
      mockHashPassword.mockResolvedValue("new_hashed_pw");
      mockUpdate.mockResolvedValue({ ...fakeUser, password: "new_hashed_pw" });

      const result = await updatePassword(1, {
        currentPassword: "password123",
        newPassword: "newPassword456",
      });

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.user.password).toBe("new_hashed_pw");
    });

    it("should throw if user not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        updatePassword(99, { currentPassword: "a", newPassword: "b" })
      ).rejects.toThrow("User not found");
    });

    it("should throw if current password is incorrect", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);
      mockComparePassword.mockResolvedValueOnce(false);

      await expect(
        updatePassword(1, { currentPassword: "wrong", newPassword: "new" })
      ).rejects.toThrow("Current password is incorrect");
    });

    it("should throw if new password is same as current password", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);
      mockComparePassword
        .mockResolvedValueOnce(true)  // current password correct
        .mockResolvedValueOnce(true); // same as new password

      await expect(
        updatePassword(1, { currentPassword: "password123", newPassword: "password123" })
      ).rejects.toThrow("New password must be different from current password");
    });
  });
});
