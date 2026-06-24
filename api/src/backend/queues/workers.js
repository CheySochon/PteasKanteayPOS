const { Worker } = require('bullmq');
const { canConnectToRedis, getQueueConnection } = require('./connection');
const telegramService = require('../services/telegramService');
const inventoryService = require('../services/inventoryService');

let started = false;

async function startWorkers() {
  if (started) return;
  if (!(await canConnectToRedis())) {
    console.warn('Redis is not available; BullMQ workers were not started.');
    return;
  }

  started = true;
  const connection = getQueueConnection();

  const telegramWorker = new Worker('telegram', async (job) => {
    if (job.name === 'send-message') {
      return telegramService.sendMessage(job.data);
    }
    return null;
  }, { connection });

  const inventoryWorker = new Worker('inventory', async (job) => {
    if (job.name === 'deduct-stock') {
      return inventoryService.deductIngredientsForOrder(job.data.orderId);
    }
    return null;
  }, { connection });

  for (const worker of [telegramWorker, inventoryWorker]) {
    worker.on('failed', (job, err) => {
      console.warn(`Queue job failed (${job?.queueName || 'unknown'}):`, err.message);
    });
    worker.on('error', (err) => {
      console.warn('Queue worker error:', err.message);
    });
  }
}

module.exports = { startWorkers };
