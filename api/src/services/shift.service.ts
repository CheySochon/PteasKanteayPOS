import { prisma } from "../config/prisma.js";

export const listShifts = async () => {
  return prisma.shift.findMany({
    include: { user: true },
    orderBy: { startTime: "desc" },
  });
};

export const startShift = async (
  userId: string,
  data: { openingCash?: number; notes?: string },
) => {
  return prisma.shift.create({
    data: {
      userId,
      openingCash: data.openingCash ?? 0,
      notes: data.notes,
      status: "open",
    },
  });
};

export const endShift = async (
  id: number,
  data: { closingCash?: number; notes?: string },
) => {
  return prisma.shift.update({
    where: { id },
    data: {
      endTime: new Date(),
      closingCash: data.closingCash ?? 0,
      notes: data.notes,
      status: "closed",
    },
  });
};
