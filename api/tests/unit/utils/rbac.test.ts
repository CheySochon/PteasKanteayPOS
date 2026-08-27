import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    userGroup: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import { hasPermission, getUserPermissions, getUserGroups } from "../../../src/utils/rbac.js";

const mockUserGroupFindFirst = prisma.userGroup.findFirst as Mock;
const mockUserGroupFindMany = prisma.userGroup.findMany as Mock;

describe("rbac utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasPermission", () => {
    it("returns true if user group has requested permission code", async () => {
      mockUserGroupFindFirst.mockResolvedValue({ userId: 1, groupId: 2 });

      const result = await hasPermission(1, "pos.order.create");

      expect(result).toBe(true);
      expect(mockUserGroupFindFirst).toHaveBeenCalledWith({
        where: {
          userId: 1,
          group: {
            groupPermissions: {
              some: {
                permission: {
                  code: "pos.order.create",
                },
              },
            },
          },
        },
      });
    });

    it("returns false if user group does not have permission", async () => {
      mockUserGroupFindFirst.mockResolvedValue(null);

      const result = await hasPermission(1, "pos.reports.view");

      expect(result).toBe(false);
    });

    it("returns false if userId or permissionCode is invalid", async () => {
      expect(await hasPermission(0, "pos.order.create")).toBe(false);
      expect(await hasPermission(1, "")).toBe(false);
    });
  });

  describe("getUserPermissions", () => {
    it("returns flattened array of unique permission codes", async () => {
      mockUserGroupFindMany.mockResolvedValue([
        {
          group: {
            groupPermissions: [
              { permission: { code: "pos.order.create" } },
              { permission: { code: "pos.payment.process" } },
            ],
          },
        },
        {
          group: {
            groupPermissions: [
              { permission: { code: "pos.payment.process" } },
              { permission: { code: "pos.discount.apply" } },
            ],
          },
        },
      ]);

      const permissions = await getUserPermissions(1);

      expect(permissions).toEqual([
        "pos.order.create",
        "pos.payment.process",
        "pos.discount.apply",
      ]);
    });
  });

  describe("getUserGroups", () => {
    it("returns array of groups assigned to user", async () => {
      const fakeGroup = { id: 1, name: "Cashier" };
      mockUserGroupFindMany.mockResolvedValue([{ group: fakeGroup }]);

      const groups = await getUserGroups(1);

      expect(groups).toEqual([fakeGroup]);
    });
  });
});
