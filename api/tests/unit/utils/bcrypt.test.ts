import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "../../../src/utils/bcrypt.js";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

const mockedHash = bcrypt.hash as unknown as Mock;
const mockedCompare = bcrypt.compare as unknown as Mock;

describe("bcrypt utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should hash password", async () => {
    mockedHash.mockResolvedValue("hashed_password");

    const result = await hashPassword("plain123");

    expect(mockedHash).toHaveBeenCalledWith("plain123", 12);
    expect(result).toBe("hashed_password");
  });

  it("should compare password", async () => {
    mockedCompare.mockResolvedValue(true);

    const result = await comparePassword("plain123", "hashed_password");

    expect(mockedCompare).toHaveBeenCalledWith("plain123", "hashed_password");
    expect(result).toBe(true);
  });
});
