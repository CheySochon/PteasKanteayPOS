const Redis = require('ioredis');

let client;
let warned = false;

function getRedisClient() {
  if (!client) {
    client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
    });

    client.on('error', (err) => {
      if (!warned) {
        warned = true;
        console.warn('Redis connection error:', err.message);
      }
    });
  }

  return client;
}

module.exports = { getRedisClient };
