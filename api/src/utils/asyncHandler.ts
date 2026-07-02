import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncFunction = (
  req: any,
  res: any,
  next: any,
) => Promise<any> | any;

export const asyncHandler =
  (fn: AsyncFunction): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
