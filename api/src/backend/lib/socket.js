let io;

function initSocket(server) {
  const { Server } = require('socket.io');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  io = new Server(server, {
    cors: {
      origin: frontendUrl,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    socket.emit('socket:connected', { ok: true });
  });

  return io;
}

function emit(event, payload) {
  if (io) {
    io.emit(event, payload);
  }
}

function emitOrderCreated(order) {
  emit('order:created', order);
  emit('dashboard:update', { type: 'order:created', order });
}

function emitOrderUpdated(order) {
  emit('order:updated', order);
  emit('dashboard:update', { type: 'order:updated', order });
}

function emitPaymentCompleted(payment) {
  emit('payment:completed', payment);
  emit('dashboard:update', { type: 'payment:completed', payment });
}

function emitLowStockAlert(payload) {
  emit('inventory:low-stock', payload);
  emit('dashboard:update', { type: 'inventory:low-stock', payload });
}

function emitDashboardUpdate(payload) {
  emit('dashboard:update', payload);
}

function emitPermissionsUpdated(staffPermissions) {
  emit('permissions:updated', { staffPermissions });
}

module.exports = {
  initSocket,
  emitOrderCreated,
  emitOrderUpdated,
  emitPaymentCompleted,
  emitLowStockAlert,
  emitDashboardUpdate,
  emitPermissionsUpdated,
};
