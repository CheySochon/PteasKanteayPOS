const { Queue } = require('bullmq');
const { canConnectToRedis, getQueueConnection } = require('./connection');

let telegramQueue;

function getTelegramQueue() {
  if (!telegramQueue) {
    telegramQueue = new Queue('telegram', { connection: getQueueConnection() });
  }
  return telegramQueue;
}

async function addTelegramJob(data) {
  if (!(await canConnectToRedis())) {
    console.warn('Telegram queue skipped because Redis is not available.');
    return null;
  }

  return getTelegramQueue().add('send-message', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  }).catch((err) => {
    console.warn('Telegram queue unavailable:', err.message);
  });
}

module.exports = { getTelegramQueue, addTelegramJob };
