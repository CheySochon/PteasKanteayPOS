"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  Database,
  Download,
  ImagePlus,
  Loader2,
  ReceiptText,
  Save,
  Settings2,
  SlidersHorizontal,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  apiOrigin,
  downloadBackup,
  getBackupFiles,
  getSettings,
  previewBackup,
  restoreBackup,
  updateSettings,
  uploadRestaurantImage,
  type BackupFile,
  type BackupSummary,
} from "../../../lib/api";
import type { AppSettings } from "../../../lib/types";
import { useAppTheme } from "../../../lib/theme";
import { DEFAULT_STAFF_PERMISSIONS, STAFF_PERMISSION_PAGES, permissionsForUser, serializePermissionSettings } from "../../../lib/permissions";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";

const DEFAULT_SETTINGS: AppSettings = {
  restaurantName: "The Tofu",
  restaurantEmail: "hello@thetofu.local",
  restaurantPhone: "+66 00 000 0000",
  restaurantImageUrl: "",
  address: "Bangkok, Thailand",
  currency: "USD",
  taxRate: 7,
  serviceChargeRate: 10,
  receiptFooter: "Thank you for dining with us.",
  autoAcceptQrOrders: false,
  lowStockAlerts: true,
  orderNotifications: true,
  kitchenDisplayMode: "compact",
  staffPermissions: DEFAULT_STAFF_PERMISSIONS,
};


function storedUserId() {
  if (typeof window === "undefined") return undefined;

  try {
    return (JSON.parse(localStorage.getItem("pos_user") || "{}") as { id?: number }).id;
  } catch {
    return undefined;
  }
}

function storedUserRole() {
  if (typeof window === "undefined") return "";

  try {
    const user = JSON.parse(localStorage.getItem("pos_user") || "{}") as { role?: string | { name?: string } };
    return typeof user.role === "string" ? user.role : user.role?.name || "";
  } catch {
    return "";
  }
}

export default function SettingsPage() {
  const [theme] = useAppTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [backupBusy, setBackupBusy] = useState<"download" | "latest" | "preview" | "restore" | "refresh" | "">("");
  const [restoreFileName, setRestoreFileName] = useState("");
  const [restorePayload, setRestorePayload] = useState<unknown>(null);
  const [restorePreview, setRestorePreview] = useState<BackupSummary | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]";
  const textPrimary = dark ? "text-[#566a7f]" : "text-[#566a7f]";
  const textSecondary = dark ? "text-slate-400" : "text-[#a1acb8]";
    const inputClass = `w-full rounded border px-3.5 py-2.5 text-sm outline-none transition placeholder-[#b4bdc6] focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 ${
    dark
      ? "border-[#4e4f6e] bg-[#232333] text-slate-100"
      : "border-[#d9dee3] bg-white text-[#566a7f]"
  }`;
  const isSuperAdmin = ["superadmin", "admin"].includes(storedUserRole().toLowerCase().replace(/[^a-z0-9]/g, ""));

  useEffect(() => {
    getSettings()
      .then((data) => {
        const next = { ...DEFAULT_SETTINGS, ...data };
        setSettings(next);
        localStorage.setItem("pos_staff_permissions", JSON.stringify(permissionsForUser(storedUserId(), next.staffPermissions)));
        window.dispatchEvent(new Event("pos-permissions-change"));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void refreshBackupFiles();
  }, [isSuperAdmin]);

  const saveDisabled = loading || saving;

  const previewRows = useMemo(
    () => [
      ["Subtotal", currency(42, settings.currency)],
      [`Tax ${Number(settings.taxRate || 0)}%`, currency(42 * (Number(settings.taxRate || 0) / 100), settings.currency)],
      [
        `Service ${Number(settings.serviceChargeRate || 0)}%`,
        currency(42 * (Number(settings.serviceChargeRate || 0) / 100), settings.currency),
      ],
    ],
    [settings.currency, settings.serviceChargeRate, settings.taxRate]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const next = await updateSettings({
        ...settings,
        staffPermissions: serializePermissionSettings(settings.staffPermissions),
      });
      setSettings({ ...DEFAULT_SETTINGS, ...next });
      localStorage.setItem("pos_restaurant_name", next.restaurantName || DEFAULT_SETTINGS.restaurantName);
      localStorage.setItem("pos_restaurant_image_url", next.restaurantImageUrl || "");
      localStorage.setItem("pos_staff_permissions", JSON.stringify(permissionsForUser(storedUserId(), next.staffPermissions)));
      window.dispatchEvent(new Event("pos-settings-change"));
      window.dispatchEvent(new Event("pos-permissions-change"));
      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Login as Admin to update settings.`
          : "Unable to update settings"
      );
    } finally {
      setSaving(false);
    }
  }

  function update<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function uploadRestaurantProfileImage(file?: File) {
    if (!file) return;

    setUploadingImage(true);
    setMessage("");
    setError("");

    try {
      const uploaded = await uploadRestaurantImage(file);
      const next = await updateSettings({ restaurantImageUrl: uploaded.imageUrl });
      const imageUrl = next.restaurantImageUrl || uploaded.imageUrl;
      update("restaurantImageUrl", imageUrl);
      localStorage.setItem("pos_restaurant_image_url", imageUrl);
      window.dispatchEvent(new Event("pos-settings-change"));
      setMessage("Restaurant image uploaded successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Login as Admin to upload restaurant image.`
          : "Unable to upload restaurant image",
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function refreshBackupFiles() {
    setBackupBusy((current) => current || "refresh");

    try {
      setBackupFiles(await getBackupFiles());
    } catch {
      setBackupFiles([]);
    } finally {
      setBackupBusy((current) => (current === "refresh" ? "" : current));
    }
  }

  async function createAndDownloadBackup() {
    setBackupBusy("download");
    setMessage("");
    setError("");

    try {
      await downloadBackup(false);
      await refreshBackupFiles();
      setMessage("Backup created and downloaded.");
    } catch (err) {
      setError(err instanceof Error ? `${err.message}. Login as Super Admin to create backups.` : "Unable to create backup");
    } finally {
      setBackupBusy("");
    }
  }

  async function downloadLatestBackup() {
    setBackupBusy("latest");
    setMessage("");
    setError("");

    try {
      await downloadBackup(true);
      setMessage("Latest backup downloaded.");
    } catch (err) {
      setError(err instanceof Error ? `${err.message}. No backup may exist yet.` : "Unable to download latest backup");
    } finally {
      setBackupBusy("");
    }
  }

  async function selectRestoreFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setMessage("");
    setError("");
    setRestoreFileName("");
    setRestorePayload(null);
    setRestorePreview(null);

    if (!file) return;

    setBackupBusy("preview");

    try {
      const raw = await file.text();
      const payload = JSON.parse(raw) as unknown;
      const preview = await previewBackup(payload);
      setRestoreFileName(file.name);
      setRestorePayload(payload);
      setRestorePreview(preview);
      setMessage("Backup file is valid. Review the counts before restoring.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid backup file");
    } finally {
      setBackupBusy("");
    }
  }

  async function restoreSelectedBackup() {
    if (!restorePayload || !restorePreview) return;

    const ok = window.confirm(
      `Restore ${restoreFileName}? This will replace current POS data. A safety backup will be saved first.`,
    );
    if (!ok) return;

    setBackupBusy("restore");
    setMessage("");
    setError("");

    try {
      const result = await restoreBackup(restorePayload);
      const nextSettings = { ...DEFAULT_SETTINGS, ...(await getSettings()) };
      setSettings(nextSettings);
      localStorage.setItem("pos_restaurant_name", nextSettings.restaurantName || DEFAULT_SETTINGS.restaurantName);
      localStorage.setItem("pos_restaurant_image_url", nextSettings.restaurantImageUrl || "");
      localStorage.setItem("pos_staff_permissions", JSON.stringify(permissionsForUser(storedUserId(), nextSettings.staffPermissions)));
      window.dispatchEvent(new Event("pos-settings-change"));
      window.dispatchEvent(new Event("pos-permissions-change"));
      await refreshBackupFiles();
      setRestorePayload(null);
      setRestorePreview(null);
      setRestoreFileName("");
      setMessage(`Backup restored. Safety backup saved as ${result.safetyBackup.filename}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to restore backup");
    } finally {
      setBackupBusy("");
    }
  }

  if (loading) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#696cff]" size={36} />
      </main>
    );
  }

  return (
    <main className={`flex-1 overflow-y-auto ${softSurface} p-6`}>
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <form onSubmit={submit}>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#696cff]/10 px-3 py-1 text-xs font-bold text-[#696cff]">
                <Settings2 size={14} />
                System Settings
              </div>
              <h1 className={`text-3xl font-black tracking-tight ${textPrimary}`}>
                Settings
              </h1>
              <p className={`mt-1 text-sm ${textSecondary}`}>
                Restaurant profile, order flow, receipts, and operational defaults.
              </p>
            </div>

            <button
              disabled={saveDisabled}
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#696cff] px-5 text-sm font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              Save Changes
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded border border-[#71dd37]/35 bg-[#e8fadf] px-4 py-3 text-sm font-bold text-[#71dd37]">
              {message}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <Panel
                Icon={Building2}
                title="Restaurant Profile"
                subtitle="Customer-facing identity used across receipts and QR ordering."
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <div className="mb-4 flex flex-col gap-4 rounded border border-dashed border-slate-200 p-4 sm:flex-row sm:items-center">
                  <div className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded ${softSurface}`}>
                    {settings.restaurantImageUrl ? (
                      <img
                        src={resolveImageUrl(settings.restaurantImageUrl)}
                        alt={settings.restaurantName || "Restaurant"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 size={26} className={textSecondary} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-black ${textPrimary}`}>Restaurant Image</div>
                    <p className={`mt-1 text-xs ${textSecondary}`}>
                      Upload a logo or profile image to show in the sidebar.
                    </p>
                  </div>

                  <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded bg-[#696cff] px-4 text-xs font-semibold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-sm shadow-[#696cff]/10">
                    {uploadingImage ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
                    {uploadingImage ? "Uploading" : "Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={(event) => {
                        void uploadRestaurantProfileImage(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Restaurant Name">
                    <input
                      value={settings.restaurantName}
                      onChange={(event) => update("restaurantName", event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Contact Email">
                    <input
                      type="email"
                      value={settings.restaurantEmail}
                      onChange={(event) => update("restaurantEmail", event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      value={settings.restaurantPhone}
                      onChange={(event) => update("restaurantPhone", event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Address">
                    <input
                      value={settings.address}
                      onChange={(event) => update("address", event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </Panel>

              <Panel
                Icon={CreditCard}
                title="Payments"
                subtitle="Default currency, tax, and service charge values."
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Currency">
                    <select
                      value={settings.currency}
                      onChange={(event) => update("currency", event.target.value)}
                      className={inputClass}
                    >
                      <option value="USD">USD</option>
                      <option value="KHR">KHR</option>
                      <option value="THB">THB</option>
                    </select>
                  </Field>
                  <Field label="Tax Rate">
                    <NumberInput
                      value={settings.taxRate}
                      onChange={(value) => update("taxRate", value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Service Charge">
                    <NumberInput
                      value={settings.serviceChargeRate}
                      onChange={(value) => update("serviceChargeRate", value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </Panel>

              <Panel
                Icon={SlidersHorizontal}
                title="Operations"
                subtitle="Order acceptance and kitchen display preferences."
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <ToggleRow
                    title="Auto Accept QR Orders"
                    note="Guest orders move directly into the active queue."
                    checked={settings.autoAcceptQrOrders}
                    onChange={(checked) => update("autoAcceptQrOrders", checked)}
                    softSurface={softSurface}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                  />
                  <Field label="Kitchen Display Mode">
                    <div className={`grid grid-cols-2 rounded p-1 ${softSurface}`}>
                      {(["compact", "comfortable"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => update("kitchenDisplayMode", mode)}
                          className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
                            settings.kitchenDisplayMode === mode
                              ? "bg-[#696cff] text-white shadow-sm"
                              : `${textSecondary} hover:bg-white/60`
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </Panel>

              <Panel
                Icon={Bell}
                title="Notifications"
                subtitle="Signals for staff and inventory attention."
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <ToggleRow
                    title="New Order Alerts"
                    note="Notify staff when a fresh order arrives."
                    checked={settings.orderNotifications}
                    onChange={(checked) => update("orderNotifications", checked)}
                    softSurface={softSurface}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                  />
                  <ToggleRow
                    title="Low Stock Alerts"
                    note="Flag ingredients at or below minimum stock."
                    checked={settings.lowStockAlerts}
                    onChange={(checked) => update("lowStockAlerts", checked)}
                    softSurface={softSurface}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                  />
                </div>
              </Panel>

              <Panel
                Icon={Settings2}
                title="Staff Page Permissions"
                subtitle="Tick pages Staff can open. Unticked pages are hidden and blocked for Staff."
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {STAFF_PERMISSION_PAGES.map((page) => {
                    const checked = Boolean((settings.staffPermissions || DEFAULT_STAFF_PERMISSIONS)[page.key]);

                    return (
                      <label
                        key={page.key}
                        className={`flex cursor-pointer items-center justify-between rounded border p-3 ${borderCol} ${softSurface}`}
                      >
                        <div>
                          <div className={`text-sm font-black ${textPrimary}`}>{page.label}</div>
                          <div className={`text-[11px] ${textSecondary}`}>{page.href}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            update("staffPermissions", {
                              ...(settings.staffPermissions || DEFAULT_STAFF_PERMISSIONS),
                              [page.key]: event.target.checked,
                            })
                          }
                          className="h-5 w-5 accent-[#696cff]"
                        />
                      </label>
                    );
                  })}
                </div>
              </Panel>
            </div>

            <aside className="space-y-5">
              <section className={`rounded border p-5 shadow-sm ${surface} ${borderCol}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-[#696cff]/10 text-[#696cff]">
                    <Database size={19} />
                  </div>
                  <div>
                    <h2 className={`text-sm font-black ${textPrimary}`}>Backup & Restore</h2>
                    <p className={`text-xs ${textSecondary}`}>Admin or Super Admin can export or restore POS data.</p>
                  </div>
                </div>

                {!isSuperAdmin ? (
                  <div className={`rounded border p-4 text-sm ${borderCol} ${softSurface} ${textSecondary}`}>
                    Login as Admin or Super Admin to manage backups.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={createAndDownloadBackup}
                      disabled={Boolean(backupBusy)}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-[#696cff] px-4 text-sm font-bold text-white hover:bg-[#5f61e6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {backupBusy === "download" ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                      Create Backup
                    </button>

                    <button
                      type="button"
                      onClick={downloadLatestBackup}
                      disabled={Boolean(backupBusy) || backupFiles.length === 0}
                      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded border px-4 text-sm font-bold ${borderCol} ${softSurface} ${textPrimary} disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {backupBusy === "latest" ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                      Download Latest
                    </button>

                    <label
                      className={`inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded border px-4 text-sm font-bold ${borderCol} ${softSurface} ${textPrimary}`}
                    >
                      {backupBusy === "preview" ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                      Choose Restore File
                      <input
                        type="file"
                        accept="application/json,.json"
                        disabled={Boolean(backupBusy)}
                        onChange={selectRestoreFile}
                        className="hidden"
                      />
                    </label>

                    {restorePreview && (
                      <div className={`rounded border p-3 ${borderCol} ${softSurface}`}>
                        <div className={`truncate text-sm font-black ${textPrimary}`}>{restoreFileName}</div>
                        <div className={`mt-1 text-xs ${textSecondary}`}>
                          {backupTotal(restorePreview)} records · {formatDate(restorePreview.createdAt)}
                        </div>
                        <button
                          type="button"
                          onClick={restoreSelectedBackup}
                          disabled={Boolean(backupBusy)}
                          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {backupBusy === "restore" ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                          Restore Backup
                        </button>
                      </div>
                    )}

                    <div className={`rounded border p-3 ${borderCol} ${softSurface}`}>
                      <div className={`text-xs font-black uppercase tracking-[0.12em] text-slate-400`}>Latest Saved</div>
                      {backupFiles[0] ? (
                        <>
                          <div className={`mt-2 truncate text-sm font-bold ${textPrimary}`}>{backupFiles[0].filename}</div>
                          <div className={`mt-1 text-xs ${textSecondary}`}>
                            {formatFileSize(backupFiles[0].size)} · {formatDate(backupFiles[0].updatedAt)}
                          </div>
                        </>
                      ) : (
                        <div className={`mt-2 text-xs ${textSecondary}`}>No saved backups yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className={`rounded border p-5 shadow-sm ${surface} ${borderCol}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-[#696cff]/10 text-[#696cff]">
                    <ReceiptText size={19} />
                  </div>
                  <div>
                    <h2 className={`text-sm font-black ${textPrimary}`}>Receipt Preview</h2>
                    <p className={`text-xs ${textSecondary}`}>Live totals using current settings.</p>
                  </div>
                </div>

                <div className={`rounded border p-4 ${borderCol} ${softSurface}`}>
                  <div className={`text-center text-base font-black ${textPrimary}`}>
                    {settings.restaurantName || "Restaurant"}
                  </div>
                  <div className={`mt-1 text-center text-xs ${textSecondary}`}>
                    {settings.address}
                  </div>

                  <div className={`my-4 h-px ${dark ? "bg-[#2a2f3d]" : "bg-slate-200"}`} />

                  <div className="space-y-2 text-sm">
                    {previewRows.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className={textSecondary}>{label}</span>
                        <span className={`font-bold ${textPrimary}`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className={`my-4 h-px ${dark ? "bg-[#2a2f3d]" : "bg-slate-200"}`} />

                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-black ${textPrimary}`}>Total</span>
                    <span className="text-lg font-black text-[#696cff]">
                      {currency(
                        42 +
                          42 * (Number(settings.taxRate || 0) / 100) +
                          42 * (Number(settings.serviceChargeRate || 0) / 100),
                        settings.currency
                      )}
                    </span>
                  </div>

                  <div className={`mt-5 text-center text-xs ${textSecondary}`}>
                    {settings.receiptFooter}
                  </div>
                </div>
              </section>

              <section className={`rounded border p-5 shadow-sm ${surface} ${borderCol}`}>
                <Field label="Receipt Footer">
                  <textarea
                    value={settings.receiptFooter}
                    onChange={(event) => update("receiptFooter", event.target.value)}
                    rows={5}
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </section>
            </aside>
          </div>
        </form>
      </div>
    </div>

      <style>{`
        @keyframes usersPageIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function Panel({
  Icon,
  title,
  subtitle,
  children,
  surface,
  borderCol,
  textPrimary,
  textSecondary,
}: {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
  surface: string;
  borderCol: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <section className={`rounded border p-5 shadow-sm ${surface} ${borderCol}`}>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#696cff]/10 text-[#696cff]">
          <Icon size={19} />
        </div>
        <div>
          <h2 className={`text-base font-black ${textPrimary}`}>{title}</h2>
          <p className={`mt-0.5 text-xs ${textSecondary}`}>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className={`${className} pr-9`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
        %
      </span>
    </div>
  );
}

function ToggleRow({
  title,
  note,
  checked,
  onChange,
  softSurface,
  textPrimary,
  textSecondary,
}: {
  title: string;
  note: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  softSurface: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded p-4 ${softSurface}`}>
      <div>
        <div className={`text-sm font-black ${textPrimary}`}>{title}</div>
        <div className={`mt-1 text-xs ${textSecondary}`}>{note}</div>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-[#696cff]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function currency(value: number, code: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code || "USD",
  }).format(Number(value || 0));
}

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${apiOrigin}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

function backupTotal(summary: BackupSummary) {
  return Object.values(summary.counts || {}).reduce((total, count) => total + Number(count || 0), 0);
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value?: string) {
  if (!value) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
