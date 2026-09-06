import cron from "node-cron";
import { createBackup, saveBackupFile, cleanOldAutoBackups } from "./backup.service.js";

export const initAutoBackupCron = () => {
  // Schedule task to run every day at midnight 12:00 AM (0 0 * * *)
  cron.schedule("0 0 * * *", async () => {
    console.log("[CRON] Running daily automatic database backup...");
    try {
      const backup = await createBackup({
        userId: 0,
        email: "system-auto-backup@pos.local",
        role: "System",
      });
      const saved = await saveBackupFile(backup, "auto-backup");
      console.log(`[CRON] Automatic backup saved: ${saved.filename}`);

      // Retain 30 days of auto backups
      await cleanOldAutoBackups(30);
    } catch (err) {
      console.error("[CRON] Auto-backup failed:", err);
    }
  });

  console.log("[CRON] Auto-backup scheduler initialized (Daily at 12:00 AM Midnight)");
};
