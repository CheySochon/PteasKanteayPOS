import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../../../src/utils/jwt.js";
import type { JwtPayload } from "../../../src/types/jwt.type.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

const mockedSign = jwt.sign as unknown as Mock;
const mockedVerify = jwt.verify as unknown as Mock;

describe("jwt utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should sign token with payload", () => {
    mockedSign.mockReturnValue("fake_token");

    const payload: JwtPayload = {
      userId: 123,
      role: "Staff",
    };

    const result = signToken(payload);

    expect(mockedSign).toHaveBeenCalledWith(
      payload,
      expect.any(String),
      expect.objectContaining({
        expiresIn: expect.anything(),
      }),
    );

    expect(result).toBe("fake_token");
  });

  it("should verify token and return payload", () => {
    const decoded: JwtPayload = {
      userId: 123,
      role: "Staff",
    };

    mockedVerify.mockReturnValue(decoded);

    const result = verifyToken("fake_token");

    expect(mockedVerify).toHaveBeenCalledWith("fake_token", expect.any(String));

    expect(result).toEqual(decoded);
  });
});
