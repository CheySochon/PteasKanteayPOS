import { Request, Response, NextFunction } from "express";
import { ZodType, z } from "zod";

export const validate =
  <T>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: z.treeifyError(result.error),
      });
    }

    req.body = result.data;

    return next();
  };
