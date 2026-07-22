import { RequestHandler } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-redundant-type-constituents
type AsyncFunction = (req: any, res: any, next: any) => Promise<any> | any;

export const asyncHandler =
  (fn: AsyncFunction): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
