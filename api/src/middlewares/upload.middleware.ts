import type { Request } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root public uploads directory
const uploadProductDir = path.resolve(__dirname, "..", "..", "public", "uploads", "products");
const uploadSettingDir = path.resolve(__dirname, "..", "..", "public", "uploads", "settings");
const uploadUserDir = path.resolve(__dirname, "..", "..", "public", "uploads", "users");

fs.mkdirSync(uploadProductDir, { recursive: true });
fs.mkdirSync(uploadSettingDir, { recursive: true });
fs.mkdirSync(uploadUserDir, { recursive: true });

const productStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadProductDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);

    cb(null, `${Date.now()}-${safeName || "product"}${ext}`);
  },
});

const settingStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadSettingDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);

    cb(null, `${Date.now()}-${safeName || "setting"}${ext}`);
  },
});

const userStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadUserDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);

    cb(null, `${Date.now()}-${safeName || "user"}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }
  cb(null, true);
}

export const uploadProductImage = multer({
  storage: productStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const uploadSettingImage = multer({
  storage: settingStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const uploadUserImage = multer({
  storage: userStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
