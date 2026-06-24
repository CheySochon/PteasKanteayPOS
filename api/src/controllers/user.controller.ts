import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../services/user.service.js";
import { CreateUserBody, UpdateUserBody } from "../schemas/user.schema.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const users = await listUsers();
  res.json({ success: true, message: "Users fetched", data: users });
});

export const create = asyncHandler(
  async (req: Request<object, object, CreateUserBody>, res: Response) => {
    const user = await createUser(req.body);
    res.status(201).json({ success: true, message: "User created", data: user });
  },
);

export const update = asyncHandler(
  async (req: Request<{ id: string }, object, UpdateUserBody>, res: Response) => {
    const user = await updateUser(req.params.id, req.body);
    res.json({ success: true, message: "User updated", data: user });
  },
);

export const remove = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    await deleteUser(req.params.id);
    res.json({ success: true, message: "User deleted" });
  },
);
