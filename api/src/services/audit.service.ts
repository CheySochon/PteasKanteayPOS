import { prisma } from "../config/prisma.js";
import { getTelegramConfig, sendTelegramMessage } from "./telegram.service.js";

export type CreateAuditLogInput = {
  userId?: number;
  userName: string;
  userRole: string;
  action: "LOGIN" | "FAILED_LOGIN" | "LOGOUT" | string;
  ipAddress?: string;
  userAgent?: string;
  status: "SUCCESS" | "FAILED";
  details?: string;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        userName: input.userName,
        userRole: input.userRole,
        action: input.action,
        ipAddress: input.ipAddress || "Localhost",
        userAgent: input.userAgent || "Unknown Device",
        status: input.status,
        details: input.details || null,
      },
    });

    // Send Telegram Alert
    const telegramConfig = await getTelegramConfig();
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" });
    const actionUpper = String(input.action || "").toUpperCase();
    const isLoginSuccess = (actionUpper === "LOGIN" || actionUpper.includes("LOGIN")) && input.status === "SUCCESS";

    if (isLoginSuccess && telegramConfig.alertLogin) {
      const message =
        `🔐 <b>STAFF LOGIN ALERT</b>\n\n` +
        `👤 <b>Staff:</b> ${input.userName} (${input.userRole})\n` +
        `⏰ <b>Time:</b> ${nowStr}\n` +
        `🌐 <b>IP/Device:</b> ${input.ipAddress || "Localhost"}\n` +
        `✅ <b>Status:</b> Successful Login`;
      const result = await sendTelegramMessage(message);
      console.log("[Telegram Login Alert Result]:", result);
    } else if (input.status === "FAILED" && telegramConfig.alertFailedLogin) {
      const message =
        `⚠️ <b>SECURITY WARNING: FAILED LOGIN ATTEMPT!</b>\n\n` +
        `👤 <b>Target User:</b> ${input.userName}\n` +
        `⏰ <b>Time:</b> ${nowStr}\n` +
        `🌐 <b>IP/Device:</b> ${input.ipAddress || "Localhost"}\n` +
        `❌ <b>Reason:</b> ${input.details || "Invalid Credentials"}\n` +
        `⚠️ <b>Status:</b> Login Failed`;
      const result = await sendTelegramMessage(message);
      console.log("[Telegram Security Warning Result]:", result);
    }

    return log;
  } catch (err: any) {
    console.error("[AuditLog Error]:", err.message);
  }
}

export async function getAuditLogs(query?: {
  search?: string;
  status?: string;
  action?: string;
  limit?: number;
  page?: number;
}) {
  const limit = Number(query?.limit) || 20;
  const page = Number(query?.page) || 1;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query?.status) where.status = query.status;
  if (query?.action) where.action = query.action;
  if (query?.search) {
    where.OR = [
      { userName: { contains: query.search, mode: "insensitive" } },
      { userRole: { contains: query.search, mode: "insensitive" } },
      { details: { contains: query.search, mode: "insensitive" } },
      { ipAddress: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
