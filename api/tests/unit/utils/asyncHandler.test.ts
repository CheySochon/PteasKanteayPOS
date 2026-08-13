import { describe, it, expect, vi } from "vitest";
import { asyncHandler } from "../../../src/utils/asyncHandler.js";

describe("asyncHandler", () => {
  it("should call the handler function with req, res, next", async () => {
    const req = {} as never;
    const res = {} as never;
    const next = vi.fn();

    const fn = vi.fn().mockResolvedValue("ok");
    const handler = asyncHandler(fn);

    await handler(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with the error when the handler throws", async () => {
    const req = {} as never;
    const res = {} as never;
    const next = vi.fn();

    const error = new Error("Something went wrong");
    const fn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(fn);

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should NOT catch synchronous throws (Promise.resolve cannot wrap them)", () => {
    const req = {} as never;
    const res = {} as never;
    const next = vi.fn();

    const error = new Error("sync error");
    const fn = vi.fn().mockImplementation(() => {
      throw error;
    });
    const handler = asyncHandler(fn);

    // Promise.resolve(fn(...)) does not catch synchronous throws —
    // the error propagates to the caller, not to `next`.
    expect(() => handler(req, res, next)).toThrow("sync error");
    expect(next).not.toHaveBeenCalled();
  });
});
