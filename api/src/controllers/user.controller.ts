import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../services/user.service.js";
import { CreateUserBody, UpdateUserBody } from "../schemas/user.schema.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const users = await listUsers();
  res.json({ success: true, message: "Users fetched", data: users });
});

export const create = asyncHandler(
  async (req: Request<object, object, CreateUserBody>, res: Response) => {
    const user = await createUser(req.body);
    const io = req.app.get("io");
    if (io) io.emit("user:created", user);
    res.status(201).json({ success: true, message: "User created", data: user });
  },
);

export const update = asyncHandler(
  async (req: Request<{ id: string }, object, UpdateUserBody>, res: Response) => {
    const idVal = Number(req.params.id);
    if (isNaN(idVal) || idVal > 2147483647 || idVal < -2147483648) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const user = await updateUser(idVal, req.body);
    const io = req.app.get("io");
    if (io) io.emit("user:updated", user);
    res.json({ success: true, message: "User updated", data: user });
  },
);

export const remove = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const idVal = Number(req.params.id);
    if (isNaN(idVal) || idVal > 2147483647 || idVal < -2147483648) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    await deleteUser(idVal);
    const io = req.app.get("io");
    if (io) io.emit("user:deleted", { id: idVal });
    res.json({ success: true, message: "User deleted" });
  },
);

export const roles = asyncHandler(
  async (_req: Request, res: Response) => {
    const roleRows = await listRoles();
    res.json({ success: true, message: "Roles fetched", data: roleRows });
  },
);

export const createRoleHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const role = await createRole(req.body);
    const io = req.app.get("io");
    if (io) io.emit("roles:updated");
    res.status(201).json({ success: true, message: "Role created", data: role });
  }
);

export const updateRoleHandler = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const idVal = Number(req.params.id);
    if (isNaN(idVal)) {
      res.status(400).json({ success: false, message: "Invalid Role ID" });
      return;
    }
    const role = await updateRole(idVal, req.body);
    const io = req.app.get("io");
    if (io) io.emit("roles:updated");
    res.json({ success: true, message: "Role updated", data: role });
  }
);

export const removeRoleHandler = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const idVal = Number(req.params.id);
    if (isNaN(idVal)) {
      res.status(400).json({ success: false, message: "Invalid Role ID" });
      return;
    }
    await deleteRole(idVal);
    const io = req.app.get("io");
    if (io) io.emit("roles:updated");
    res.json({ success: true, message: "Role deleted" });
  }
);

export const uploadImage = asyncHandler(
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "User avatar image is required" });
      return;
    }

    const imageUrl = `/uploads/users/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: "User avatar image uploaded",
      data: { imageUrl },
    });
  },
);
