const axios = require('axios');
const { prisma } = require('../lib/prisma');

async function sendMessage({ text, title = 'POS Notification', type = 'new_order', orderId = null }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  let notification;
  try {
    notification = await prisma.notification.create({
      data: {
        type,
        title,
        message: text,
        orderId,
      },
    });
  } catch (err) {
    console.warn('Could not create notification record:', err.message);
  }

  if (!token || !chatId) {
    if (notification) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { error: 'Telegram env variables are not configured' },
      });
    }
    return { skipped: true };
  }

  try {
    const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
    });

    if (notification) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { isSent: true, sentAt: new Date() },
      });
    }

    return response.data;
  } catch (err) {
    if (notification) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { error: err.message },
      });
    }
    throw err;
  }
}

module.exports = { sendMessage };
