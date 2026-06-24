const { prisma } = require('../lib/prisma');
const { emitPaymentCompleted } = require('../lib/socket');
const { addTelegramJob } = require('../queues/telegramQueue');

function number(value) {
  return Number(value || 0);
}

async function listPayments() {
  return prisma.payment.findMany({
    include: { order: true, createdBy: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function listOrderPayments(orderId) {
  return prisma.payment.findMany({
    where: { orderId: Number(orderId) },
    orderBy: { createdAt: 'desc' },
  });
}

async function createPayment(payload, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: Number(payload.orderId) },
      include: { payments: true },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        method: payload.method || 'cash',
        status: payload.status || 'completed',
        amount: number(payload.amount),
        reference: payload.reference,
        paidAt: payload.status === 'pending' ? null : new Date(),
        createdById: userId || undefined,
      },
      include: { order: true },
    });

    const paidTotal = order.payments
      .filter((entry) => entry.status === 'completed')
      .reduce((sum, entry) => sum + number(entry.amount), 0) + (payment.status === 'completed' ? number(payment.amount) : 0);

    let updatedOrder = order;
    if (paidTotal >= number(order.totalAmount)) {
      updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'completed' },
      });
    }

    return { payment, order: updatedOrder, paidTotal };
  });

  if (result.payment.status === 'completed') {
    emitPaymentCompleted(result.payment);
    await addTelegramJob({
      type: 'payment_completed',
      title: 'Payment completed',
      text: `Payment completed for order ${result.order.orderNumber}: $${number(result.payment.amount).toFixed(2)}`,
      orderId: result.order.id,
    });
  }

  return result;
}

module.exports = { listPayments, listOrderPayments, createPayment };
