const { Queue } = require('bullmq');
const { canConnectToRedis, getQueueConnection } = require('./connection');

let inventoryQueue;

function getInventoryQueue() {
  if (!inventoryQueue) {
    inventoryQueue = new Queue('inventory', { connection: getQueueConnection() });
  }
  return inventoryQueue;
}

async function addInventoryDeductionJob(data) {
  if (!(await canConnectToRedis())) {
    console.warn('Inventory queue skipped because Redis is not available.');
    return null;
  }

  return getInventoryQueue().add('deduct-stock', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  }).catch((err) => {
    console.warn('Inventory queue unavailable:', err.message);
  });
}

module.exports = { getInventoryQueue, addInventoryDeductionJob };
