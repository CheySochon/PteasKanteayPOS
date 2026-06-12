import { Request, Response } from "express";

export const errorMiddleware = (err: unknown, req: Request, res: Response) => {
  console.error(err);

  const message = err instanceof Error ? err.message : "Internal Server Error";

  res.status(500).json({
    success: false,
    message,
  });
};
