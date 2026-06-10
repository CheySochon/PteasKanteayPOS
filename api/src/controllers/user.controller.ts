import { Request, Response } from 'express';
import { UserService } from '../services/user.service.js';

export class UserController {
  static async create(req: Request, res: Response) {
    try {
      const user = await UserService.createUser(req.body);
      return res.status(201).json(user);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    const users = await UserService.getUsers();
    return res.json(users);
  }

  static async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const user = await UserService.getUserById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  }

  static async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const user = await UserService.updateUser(id, req.body);
      return res.json(user);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await UserService.deleteUser(id);
      return res.json({ message: 'User deleted' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
