import { prisma } from "../config/prisma.js";

export async function getTelegramConfig() {
  const settings = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "telegramBotToken",
          "telegramChatId",
          "telegramAlertLogin",
          "telegramAlertFailedLogin",
          "telegramAlertNewOrder",
          "telegram_bot_token",
          "telegram_chat_id",
          "telegram_alert_login",
          "telegram_alert_failed_login",
          "telegram_alert_new_order",
        ],
      },
    },
  });

  const configMap: Record<string, any> = {};
  for (const s of settings) {
    configMap[s.key] = typeof s.value === "string" ? s.value : (s.value as any)?.value ?? s.value;
  }

  return {
    botToken: String(configMap["telegramBotToken"] || configMap["telegram_bot_token"] || process.env.TELEGRAM_BOT_TOKEN || ""),
    chatId: String(configMap["telegramChatId"] || configMap["telegram_chat_id"] || process.env.TELEGRAM_CHAT_ID || ""),
    alertLogin: Boolean(configMap["telegramAlertLogin"] ?? configMap["telegram_alert_login"] ?? true),
    alertFailedLogin: Boolean(configMap["telegramAlertFailedLogin"] ?? configMap["telegram_alert_failed_login"] ?? true),
    alertNewOrder: Boolean(configMap["telegramAlertNewOrder"] ?? configMap["telegram_alert_new_order"] ?? true),
  };
}

export async function sendTelegramMessage(message: string, customToken?: string, customChatId?: string) {
  try {
    const config = await getTelegramConfig();
    const token = customToken || config.botToken;
    const chatId = customChatId || config.chatId;

    if (!token || !chatId) {
      console.log("[Telegram Alert] Skipped: Bot Token or Chat ID not configured yet.");
      return { success: false, error: "Missing Bot Token or Chat ID" };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data: any = await response.json();
    if (!data.ok) {
      console.error("[Telegram API Error]:", data.description);
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Telegram Network Error]:", err.message);
    return { success: false, error: err.message };
  }
}
