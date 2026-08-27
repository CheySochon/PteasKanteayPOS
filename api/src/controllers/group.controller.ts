import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listGroupsPaginated,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  assignUsersToGroup,
} from "../services/group.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const result = await listGroupsPaginated({ page, limit, search, status });

  res.json({
    success: true,
    message: "Groups fetched",
    data: result.data,
    pagination: result.pagination,
  });
});

export const getOne = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const idVal = Number(req.params.id);
  if (isNaN(idVal)) {
    res.status(400).json({ success: false, message: "Invalid group ID" });
    return;
  }
  const group = await getGroupById(idVal);
  res.json({ success: true, message: "Group fetched", data: group });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const group = await createGroup(req.body);
  const io = req.app.get("io");
  if (io) {
    io.emit("groups:updated", group);
    io.emit("group:created", group);
  }
  res.status(201).json({ success: true, message: "Group created successfully", data: group });
});

export const update = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const idVal = Number(req.params.id);
  if (isNaN(idVal)) {
    res.status(400).json({ success: false, message: "Invalid group ID" });
    return;
  }
  const group = await updateGroup(idVal, req.body);
  const io = req.app.get("io");
  if (io) {
    io.emit("groups:updated", group);
    io.emit("group:updated", group);
  }
  res.json({ success: true, message: "Group updated successfully", data: group });
});

export const remove = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const idVal = Number(req.params.id);
  if (isNaN(idVal)) {
    res.status(400).json({ success: false, message: "Invalid group ID" });
    return;
  }

  const cascade = req.query.cascade === "true" || req.body?.cascade === true;

  try {
    await deleteGroup(idVal, cascade);
    const io = req.app.get("io");
    if (io) {
      io.emit("groups:updated", { id: idVal });
      io.emit("group:deleted", { id: idVal });
    }
    res.json({ success: true, message: "Group deleted successfully" });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err?.message || "Failed to delete group",
    });
  }
});

export const assignUsers = asyncHandler(async (req: Request<{ id: string }, object, { userIds: number[] }>, res: Response) => {
  const idVal = Number(req.params.id);
  if (isNaN(idVal)) {
    res.status(400).json({ success: false, message: "Invalid group ID" });
    return;
  }
  const updatedGroup = await assignUsersToGroup(idVal, req.body.userIds || []);
  const io = req.app.get("io");
  if (io) {
    io.emit("groups:updated", updatedGroup);
    io.emit("group:updated", updatedGroup);
  }
  res.json({ success: true, message: "Group users updated", data: updatedGroup });
});
