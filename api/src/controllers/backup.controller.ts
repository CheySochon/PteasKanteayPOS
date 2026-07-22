import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createBackup,
  saveBackupFile,
  listBackupFiles,
  readBackupFile,
  validateBackup,
  backupSummary,
  type Backup,
} from "../services/backup.service.js";

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

  const safetyBackup = await createBackup(req.user);
  const saved = await saveBackupFile(safetyBackup, "before-restore");

  res.json({
    success: true,
    message: "Backup validated — restore logic pending full schema",
    data: {
      restored: backupSummary(backup),
      safetyBackup: { filename: saved.filename },
    },
  });
});
