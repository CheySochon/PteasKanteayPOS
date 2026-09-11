import { Request, Response, NextFunction } from "express";

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  console.error(err);

  let message = err instanceof Error ? err.message : "Internal server error";

  // Prevent internal Prisma/Database schema information disclosure
  if (
    message.includes("prisma") ||
    message.includes("invocation:") ||
    (err as any)?.name?.includes("Prisma")
  ) {
    message = "Internal server error";
  }

  res.status(500).json({
    success: false,
    message,
  });
};
