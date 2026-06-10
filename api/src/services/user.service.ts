import { prisma } from '../lib/prisma.js';

export class UserService {
  static async createUser(data: { name: string; email: string }) {
    return prisma.user.create({
      data,
    });
  }

  static async getUsers() {
    return prisma.user.findMany({
      orderBy: { created: 'desc' },
    });
  }

  static async getUserById(id: number) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async updateUser(
    id: number,
    data: { name?: string; email?: string }
  ) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async deleteUser(id: number) {
    return prisma.user.delete({
      where: { id },
    });
  }
}
