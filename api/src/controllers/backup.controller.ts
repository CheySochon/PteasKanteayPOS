import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createBackup,
  saveBackupFile,
  listBackupFiles,
  readBackupFile,
  validateBackup,
  backupSummary,
  restoreBackupData,
  type Backup,
} from "../services/backup.service.js";
import { createAuditLog } from "../services/audit.service.js";

export const download = asyncHandler(async (req: Request, res: Response) => {
  const backup = await createBackup(req.user);
  await saveBackupFile(backup);

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="pos-backup-${new Date().toISOString().slice(0, 10)}.json"`,
  );
  res.send(JSON.stringify(backup, null, 2));
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listBackupFiles();
  res.json({ success: true, message: "Backups fetched", data });
});

export const latest = asyncHandler(async (_req: Request, res: Response) => {
  const files = await listBackupFiles();

  if (files.length === 0) {
    res.status(404).json({ success: false, message: "No backup files found" });
    return;
  }

  const backup = await readBackupFile(files[0].filename);

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${files[0].filename}"`,
  );
  res.send(JSON.stringify(backup, null, 2));
});

export const preview = asyncHandler((req: Request, res: Response) => {
  const backup = req.body as unknown as Backup;
  validateBackup(backup);

  res.json({
    success: true,
    message: "Backup preview ready",
    data: backupSummary(backup),
  });
});

export const restore = asyncHandler(async (req: Request, res: Response) => {
  const backup = req.body as unknown as Backup;
  validateBackup(backup);

  // 1. Save safety backup before performing database wipe & restore
  const safetyBackup = await createBackup(req.user);
  const saved = await saveBackupFile(safetyBackup, "before-restore");

  // 2. Perform full relational database restore
  await restoreBackupData(backup);

  // 3. Log audit event
  if (req.user) {
    await createAuditLog({
      userId: req.user.userId,
      userName: `Admin (ID: ${req.user.userId})`,
      userRole: req.user.role,
      action: "RESTORE_DATABASE",
      ipAddress: req.ip || "Localhost",
      userAgent: req.headers["user-agent"] || "Unknown",
      status: "SUCCESS",
      details: `Restored database backup. Safety backup saved as ${saved.filename}`,
    });
  }


  // 4. Emit real-time Socket.io event to notify all connected clients
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const io = req.app.get("io");
  if (io) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    io.emit("system:restored", {
      restoredAt: new Date().toISOString(),
      summary: backupSummary(backup),
    });
  }

  res.json({
    success: true,
    message: "Database backup restored successfully",
    data: {
      restored: backupSummary(backup),
      safetyBackup: { filename: saved.filename },
    },
  });
});

