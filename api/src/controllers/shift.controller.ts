import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listShifts,
  startShift,
  endShift,
} from "../services/shift.service.js";
import { StartShiftBody, EndShiftBody } from "../schemas/shift.schema.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listShifts();
  res.json({ success: true, message: "Shifts fetched", data });
});

export const start = asyncHandler(
  async (req: Request<object, object, StartShiftBody>, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const data = await startShift(userId, req.body);
    res.status(201).json({ success: true, message: "Shift started", data });
  },
);

export const end = asyncHandler(
  async (
    req: Request<{ id: string }, object, EndShiftBody>,
    res: Response,
  ) => {
    const data = await endShift(Number(req.params.id), req.body);
    res.json({ success: true, message: "Shift ended", data });
  },
);
