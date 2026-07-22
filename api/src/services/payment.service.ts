import { prisma } from "../config/prisma.js";
import { PaymentMethod, PaymentStatus } from "../prisma/client.js";

function toNum(value: unknown): number {
  return Number(value ?? 0);
}

export const listPayments = async () => {
  return prisma.payment.findMany({
    include: { order: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
};

export const listOrderPayments = async (orderId: number) => {
  return prisma.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
};

export const createPayment = async (
  payload: {
    orderId: number;
    method?: string;
    status?: string;
    amount: number;
    reference?: string;
  },
  userId?: number,
) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: payload.orderId },
      include: { payments: true },
    });

    if (!order) throw new Error("Order not found");

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        method: (payload.method ?? "cash") as PaymentMethod,
        status: (payload.status ?? "completed") as PaymentStatus,
        amount: toNum(payload.amount),
        reference: payload.reference,
        paidAt: payload.status === "pending" ? null : new Date(),
        createdById: userId,
      },
      include: { order: true },
    });

    const paidTotal =
      order.payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + toNum(p.amount), 0) +
      (payment.status === "completed" ? toNum(payment.amount) : 0);

    let updatedOrder = order;
    if (paidTotal >= toNum(order.totalAmount)) {
      updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: "completed" },
        include: { items: true, table: true, payments: true },
      });
    }

    return { payment, order: updatedOrder, paidTotal };
  });
};
