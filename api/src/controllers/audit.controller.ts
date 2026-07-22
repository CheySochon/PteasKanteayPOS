import { Request, Response } from "express";
import { getAuditLogs } from "../services/audit.service.js";
import { getTelegramConfig, sendTelegramMessage } from "../services/telegram.service.js";
import { prisma } from "../config/prisma.js";

export const getAuditLogsHandler = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const action = req.query.action as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const data = await getAuditLogs({ search, status, action, page, limit });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTelegramConfigHandler = async (_req: Request, res: Response) => {
  try {
    const config = await getTelegramConfig();
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTelegramConfigHandler = async (req: Request, res: Response) => {
  try {
    const { botToken, chatId, alertLogin, alertFailedLogin, alertNewOrder } = req.body;

    const upsertSetting = async (key: string, value: any) => {
      await prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, category: "telegram" },
      });
    };

    if (botToken !== undefined) {
      await upsertSetting("telegramBotToken", botToken);
      await upsertSetting("telegram_bot_token", botToken);
    }
    if (chatId !== undefined) {
      await upsertSetting("telegramChatId", chatId);
      await upsertSetting("telegram_chat_id", chatId);
    }
    if (alertLogin !== undefined) {
      await upsertSetting("telegramAlertLogin", alertLogin);
      await upsertSetting("telegram_alert_login", alertLogin);
    }
    if (alertFailedLogin !== undefined) {
      await upsertSetting("telegramAlertFailedLogin", alertFailedLogin);
      await upsertSetting("telegram_alert_failed_login", alertFailedLogin);
    }
    if (alertNewOrder !== undefined) {
      await upsertSetting("telegramAlertNewOrder", alertNewOrder);
      await upsertSetting("telegram_alert_new_order", alertNewOrder);
    }

    const updatedConfig = await getTelegramConfig();
    res.json({ success: true, data: updatedConfig, message: "Telegram settings saved successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const testTelegramBotHandler = async (req: Request, res: Response) => {
  try {
    const { botToken, chatId } = req.body;

    const message =
      `🤖 <b>POS TELEGRAM BOT CONNECTED SUCCESSFULLY!</b>\n\n` +
      `✅ Your POS System is now linked with this Telegram Chat.\n` +
      `⏰ <b>Tested At:</b> ${new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" })}\n\n` +
      `🎉 You will now receive real-time alerts for staff logins, security warnings, and new orders!`;

    const result = await sendTelegramMessage(message, botToken, chatId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error || "Failed to send test message." });
    }

    res.json({ success: true, message: "Test message sent to Telegram successfully!" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
