const backupService = require('../services/backupService');

async function download(req, res) {
  const backup = await backupService.createBackup(req.user);
  await backupService.saveBackupFile(backup);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="posv2-backup-${new Date().toISOString().slice(0, 10)}.json"`
  );
  res.send(JSON.stringify(backup, null, 2));
}

async function list(req, res) {
  const files = await backupService.listBackupFiles();

  res.json({
    success: true,
    message: 'Backups fetched',
    data: files,
  });
}

async function latest(req, res) {
  const files = await backupService.listBackupFiles();

  if (files.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No backup files found',
    });
  }

  const backup = await backupService.readBackupFile(files[0].filename);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${files[0].filename}"`);
  res.send(JSON.stringify(backup, null, 2));
}

async function preview(req, res) {
  const backup = req.body;
  backupService.validateBackup(backup);

  res.json({
    success: true,
    message: 'Backup preview ready',
    data: backupService.backupSummary(backup),
  });
}

async function restore(req, res) {
  const backup = req.body;
  const safetyBackup = await backupService.createBackup(req.user);
  const saved = await backupService.saveBackupFile(safetyBackup, 'before-restore');

  await backupService.restoreBackup(backup);

  res.json({
    success: true,
    message: 'Backup restored',
    data: {
      restored: backupService.backupSummary(backup),
      safetyBackup: {
        filename: saved.filename,
      },
    },
  });
}

module.exports = { download, list, latest, preview, restore };
