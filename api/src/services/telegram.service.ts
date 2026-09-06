import { prisma } from "../config/prisma.js";

const DEFAULT_BOT_TOKEN = "8948111433:AAHBfQ5a45EdpjfgK8ljgx0RRK6HGNBHFIU";
const DEFAULT_CHAT_ID = "1511785587";

function extractVal(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object" && val.value && typeof val.value === "string") {
    return val.value.trim();
  }
  return String(val).trim();
}

export async function getTelegramConfig() {
  let settings: any[] = [];
  try {
    settings = await prisma.appSetting.findMany({
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
  } catch (err: any) {
    console.error("[getTelegramConfig Error]:", err?.message);
  }

  const configMap: Record<string, any> = {};
  for (const s of settings) {
    configMap[s.key] = s.value;
  }

  const rawToken = extractVal(configMap["telegramBotToken"] || configMap["telegram_bot_token"]);
  const rawChatId = extractVal(configMap["telegramChatId"] || configMap["telegram_chat_id"]);

  const botToken = rawToken || process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = rawChatId || process.env.TELEGRAM_CHAT_ID || "";

  return {
    botToken,
    chatId,
    alertLogin: Boolean(configMap["telegramAlertLogin"] ?? configMap["telegram_alert_login"] ?? true),
    alertFailedLogin: Boolean(configMap["telegramAlertFailedLogin"] ?? configMap["telegram_alert_failed_login"] ?? true),
    alertNewOrder: Boolean(configMap["telegramAlertNewOrder"] ?? configMap["telegram_alert_new_order"] ?? true),
  };
}

export async function sendTelegramMessage(message: string, customToken?: string, customChatId?: string) {
  try {
    const config = await getTelegramConfig();
    const token = (customToken || config.botToken).trim();
    const chatId = (customChatId || config.chatId).trim();

    if (!token || !chatId) {
      console.log("[Telegram Alert] Skipped: Bot Token or Chat ID empty.");
      return { success: false, error: "Missing Bot Token or Chat ID" };
    }

    console.log(`[Telegram Alert] Sending to Chat ID: ${chatId}...`);

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

    console.log("[Telegram Alert Success]: Message sent!");
    return { success: true };
  } catch (err: any) {
    console.error("[Telegram Network Error]:", err.message);
    return { success: false, error: err.message };
  }
}
