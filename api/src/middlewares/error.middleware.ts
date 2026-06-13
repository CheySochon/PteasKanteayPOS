import { Request, Response, NextFunction } from "express";

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  console.error(err);

  const message = err instanceof Error ? err.message : "Internal server error";

  res.status(500).json({
    success: false,
    message,
  });
};
