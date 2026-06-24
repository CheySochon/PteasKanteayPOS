import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import qrcode from "qrcode";
import {
  listTables,
  createTable,
  updateTable,
  deleteTable,
  getQrMenu,
} from "../services/table.service.js";
import {
  CreateTableBody,
  UpdateTableBody,
} from "../schemas/table.schema.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listTables();
  res.json({ success: true, message: "Tables fetched", data });
});

export const create = asyncHandler(
  async (req: Request<object, object, CreateTableBody>, res: Response) => {
    const data = await createTable(req.body);
    res.status(201).json({ success: true, message: "Table created", data });
  },
);

export const update = asyncHandler(
  async (
    req: Request<{ id: string }, object, UpdateTableBody>,
    res: Response,
  ) => {
    const data = await updateTable(Number(req.params.id), req.body);
    res.json({ success: true, message: "Table updated", data });
  },
);

export const remove = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    await deleteTable(Number(req.params.id));
    res.json({ success: true, message: "Table deleted" });
  },
);

export const qrMenu = asyncHandler(
  async (req: Request<{ qrToken: string }>, res: Response) => {
    const data = await getQrMenu(req.params.qrToken);
    res.json({ success: true, message: "QR menu fetched", data });
  },
);

export const qrCode = asyncHandler(
  async (req: Request<{ qrToken: string }>, res: Response) => {
    const { qrToken } = req.params;
    const fallbackUrl = `${process.env.CLIENT_URL ?? "http://localhost:3000"}/qr/${qrToken}`;
    const qrUrl =
      typeof req.query.url === "string" && req.query.url
        ? req.query.url
        : fallbackUrl;

    const png = await qrcode.toBuffer(qrUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.send(png);
  },
);
