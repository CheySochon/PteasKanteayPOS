import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getDailySales,
  getMonthlySales,
  getTopProducts,
  exportCsv,
} from "../services/report.service.js";

export const dailySales = asyncHandler(async (req: Request, res: Response) => {
  const data = await getDailySales(req.query.date as string | undefined);
  res.json({ success: true, message: "Daily sales fetched", data });
});

export const monthlySales = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await getMonthlySales(req.query.date as string | undefined);
    res.json({ success: true, message: "Monthly sales fetched", data });
  },
);

export const topProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 10);
    const data = await getTopProducts(
      limit,
      req.query.date as string | undefined,
      req.query.period as string | undefined,
    );
    res.json({ success: true, message: "Top products fetched", data });
  },
);

export const exportCsvHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const csv = await exportCsv(
      req.query.date as string | undefined,
      req.query.period as string | undefined,
    );
    const period = (req.query.period as string) ?? "month";
    const date = (req.query.date as string) ?? "all";
    res.header("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="orders-report-${period}-${date}.csv"`,
    );
    res.send(csv);
  },
);
