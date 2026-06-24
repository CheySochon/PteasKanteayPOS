const { getRedisClient } = require('../lib/redis');
const net = require('net');

function getQueueConnection() {
  return getRedisClient();
}

function canConnectToRedis(timeout = 500) {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || 6379);

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

module.exports = { getQueueConnection, canConnectToRedis };
