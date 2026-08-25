import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import qrcode from "qrcode";
import {
  listTables,
  createTable,
  updateTable,
  deleteTable,
  getQrMenu,
  moveTable,
  mergeTable,
  unmergeTable,
} from "../services/table.service.js";
import {
  CreateTableBody,
  UpdateTableBody,
  MoveTableBody,
  MergeTableBody,
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

export const move = asyncHandler(
  async (req: Request<object, object, MoveTableBody>, res: Response) => {
    const { sourceTableId, targetTableId } = req.body;
    const result = await moveTable(sourceTableId, targetTableId);
    const io = req.app.get("io");
    if (io) {
      io.emit("table:updated", result.sourceTable);
      io.emit("table:updated", result.targetTable);
      io.emit("order:updated", { tableId: targetTableId });
    }
    res.json({ success: true, message: result.message, data: result });
  },
);

export const merge = asyncHandler(
  async (req: Request<object, object, MergeTableBody>, res: Response) => {
    const { sourceTableId, targetTableId } = req.body;
    const result = await mergeTable(sourceTableId, targetTableId);
    const io = req.app.get("io");
    if (io) {
      io.emit("table:updated", result.sourceTable);
      io.emit("table:updated", result.targetTable);
      io.emit("order:updated", result.mergedOrder);
    }
    res.json({ success: true, message: result.message, data: result });
  },
);

export const unmerge = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const result = await unmergeTable(Number(req.params.id));
    const io = req.app.get("io");
    if (io) {
      io.emit("table:updated", result.table);
    }
    res.json({ success: true, message: result.message, data: result });
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

