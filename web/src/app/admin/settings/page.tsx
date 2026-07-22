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
  Plus,
  ReceiptText,
  Save,
  Settings2,
  SlidersHorizontal,
  Upload,
  Trash2,
  X,
  Send,
  ShieldAlert,
  History,
  SendHorizontal,
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
  getAuditLogs,
  getTelegramConfig,
  updateTelegramConfig,
  testTelegramBot,
  type BackupFile,
  type BackupSummary,
  type AuditLogItem,
  type TelegramConfig,
} from "../../../lib/api";
import type { AppSettings } from "../../../lib/types";
import { useAppTheme } from "../../../lib/theme";
import { DEFAULT_STAFF_PERMISSIONS, STAFF_PERMISSION_PAGES, permissionsForUser, serializePermissionSettings } from "../../../lib/permissions";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";
import { useAppLanguage, setAppLanguage } from "../../../lib/language";
import TopBar from "../../../components/TopBar";

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


type PrinterConfig = {
  id: string;
  name: string;
  ipAddress: string;
  type: "receipt" | "kitchen" | "bar";
  status: "connected" | "offline";
};

const DEFAULT_PRINTERS: PrinterConfig[] = [
  { id: "1", name: "Epson TM-T88VI", ipAddress: "192.168.1.102", type: "kitchen", status: "connected" },
  { id: "2", name: "Star Micronics TSP100", ipAddress: "192.168.1.105", type: "receipt", status: "connected" }
];

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
  const language = useAppLanguage();
  const [theme] = useAppTheme();
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [printerModal, setPrinterModal] = useState<{
    isOpen: boolean;
    printerId?: string;
  }>({ isOpen: false });

  const [printerForm, setPrinterForm] = useState<Omit<PrinterConfig, "id">>({
    name: "",
    ipAddress: "",
    type: "receipt",
    status: "connected"
  });

  useEffect(() => {
    const saved = localStorage.getItem("pos_printers");
    if (saved) {
      try {
        setPrinters(JSON.parse(saved));
      } catch {
        setPrinters(DEFAULT_PRINTERS);
      }
    } else {
      setPrinters(DEFAULT_PRINTERS);
      localStorage.setItem("pos_printers", JSON.stringify(DEFAULT_PRINTERS));
    }
  }, []);

  const savePrinters = (newPrinters: PrinterConfig[]) => {
    setPrinters(newPrinters);
    localStorage.setItem("pos_printers", JSON.stringify(newPrinters));
  };

  const openAddPrinterModal = () => {
    setPrinterForm({
      name: "",
      ipAddress: "",
      type: "receipt",
      status: "connected"
    });
    setPrinterModal({ isOpen: true });
  };

  const openEditPrinterModal = (printer: PrinterConfig) => {
    setPrinterForm({
      name: printer.name,
      ipAddress: printer.ipAddress,
      type: printer.type,
      status: printer.status
    });
    setPrinterModal({ isOpen: true, printerId: printer.id });
  };

  const closePrinterModal = () => {
    setPrinterModal({ isOpen: false });
  };

  const handlePrinterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (printerModal.printerId) {
      const updated = printers.map(p => p.id === printerModal.printerId ? { ...p, ...printerForm } : p);
      savePrinters(updated);
    } else {
      const newPrinter: PrinterConfig = {
        id: String(Date.now()),
        ...printerForm
      };
      savePrinters([...printers, newPrinter]);
    }
    closePrinterModal();
  };

  const handleDeletePrinter = () => {
    if (!printerModal.printerId) return;
    const filtered = printers.filter(p => p.id !== printerModal.printerId);
    savePrinters(filtered);
    closePrinterModal();
  };
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

  // Telegram & Audit Logs state
  const [telegramConfig, setTelegramConfigState] = useState<TelegramConfig>({
    botToken: "",
    chatId: "",
    alertLogin: true,
    alertFailedLogin: true,
    alertNewOrder: true,
  });
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState("all");
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    const savedLocal = localStorage.getItem("pos_telegram_config");
    if (savedLocal) {
      try {
        setTelegramConfigState(JSON.parse(savedLocal));
      } catch {
        // ignore
      }
    }

    getTelegramConfig()
      .then((cfg) => {
        if (cfg && (cfg.botToken || cfg.chatId)) {
          setTelegramConfigState(cfg);
        }
      })
      .catch(() => {});

    loadAuditLogs();
  }, []);

  const loadAuditLogs = async (search = auditSearch, status = auditStatusFilter) => {
    setAuditLoading(true);
    try {
      const res = await getAuditLogs({ search, status: status === "all" ? undefined : status });
      if (res?.items) setAuditLogs(res.items);
    } catch {
      // ignore
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSaveTelegram = async () => {
    setSavingTelegram(true);
    setMessage("");
    setError("");
    try {
      // Save via updateSettings API & fallback
      await updateSettings({
        ...settings,
        telegramBotToken: telegramConfig.botToken,
        telegramChatId: telegramConfig.chatId,
        telegramAlertLogin: telegramConfig.alertLogin,
        telegramAlertFailedLogin: telegramConfig.alertFailedLogin,
        telegramAlertNewOrder: telegramConfig.alertNewOrder,
      } as any).catch(() => {});

      await updateTelegramConfig(telegramConfig).catch(() => {});

      // Also save to localStorage as local fallback
      localStorage.setItem("pos_telegram_config", JSON.stringify(telegramConfig));

      setMessage("Telegram Bot settings saved successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to save Telegram settings.");
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      setError("Please enter both Telegram Bot Token and Chat ID first.");
      return;
    }
    setTestingTelegram(true);
    setMessage("");
    setError("");

    const tokenClean = telegramConfig.botToken.trim();
    const chatIdClean = telegramConfig.chatId.trim();

    try {
      // Direct Telegram API Call
      const messageText =
        `🤖 <b>POS TELEGRAM BOT CONNECTED SUCCESSFULLY!</b>\n\n` +
        `✅ Your POS System is now linked with this Telegram Chat.\n` +
        `⏰ <b>Tested At:</b> ${new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" })}\n\n` +
        `🎉 You will now receive real-time alerts for staff logins, security warnings, and new orders!`;

      const response = await fetch(
        `https://api.telegram.org/bot${tokenClean}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatIdClean,
            text: messageText,
            parse_mode: "HTML",
          }),
        }
      );

      const data = await response.json();
      if (data.ok) {
        setMessage("🎉 Test message sent to your Telegram successfully! Check your Telegram app now.");
        return;
      }

      // Try Backend API fallback if direct fetch blocked
      try {
        const res = await testTelegramBot({
          botToken: tokenClean,
          chatId: chatIdClean,
        });
        if (res?.message) {
          setMessage("🎉 " + res.message);
          return;
        }
      } catch {
        // ignore
      }

      setError(`Telegram Error: ${data.description || "Invalid Bot Token or Chat ID"}`);
    } catch (err: any) {
      setError(err?.message || "Telegram Connection Test Failed. Check Token & Chat ID.");
    } finally {
      setTestingTelegram(false);
    }
  };

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f8fafc]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";
  const inputClass = `w-full rounded-lg border px-3.5 py-2.5 text-xs font-semibold outline-none transition placeholder-slate-400 focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 ${
    dark
      ? "border-[#4e4f6e] bg-[#232333] text-slate-100"
      : "border-slate-300 bg-white text-slate-900"
  }`;
  const isSuperAdmin = ["superadmin", "admin"].includes(storedUserRole().toLowerCase().replace(/[^a-z0-9]/g, ""));

  const [savedSnapshot, setSavedSnapshot] = useState<string>("");

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    return JSON.stringify(settings) !== savedSnapshot;
  }, [settings, savedSnapshot]);

  function resetFormSettings() {
    if (!savedSnapshot) return;
    try {
      setSettings(JSON.parse(savedSnapshot));
    } catch {
      // fallback
    }
  }

  useEffect(() => {
    getSettings()
      .then((data) => {
        const next = { ...DEFAULT_SETTINGS, ...data };
        setSettings(next);
        setSavedSnapshot(JSON.stringify(next));
        localStorage.setItem("pos_staff_permissions", JSON.stringify(permissionsForUser(storedUserId(), next.staffPermissions)));
        window.dispatchEvent(new Event("pos-settings-change"));
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
      const updated = { ...DEFAULT_SETTINGS, ...next };
      setSettings(updated);
      setSavedSnapshot(JSON.stringify(updated));
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
    <>
      <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-[#f5f5f9]"}`}>
        <TopBar
          title={language === "km" ? "ការកំណត់ប្រព័ន្ធ" : "System Settings"}
          subtitle={language === "km" ? "គ្រប់គ្រងព័ត៌មានហាង ម៉ាស៊ីនបោះពុម្ព និងទិន្នន័យចងក្រង" : "Manage restaurant profile, network hardware, and backup files."}
          language={language}
          onLanguageChange={setAppLanguage}
          notifications={[]}
          dark={dark}
        />

        <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="mx-auto w-full">
            <form onSubmit={submit}>


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
                subtitle=""
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
                Icon={SlidersHorizontal}
                title="Operations"
                subtitle=""
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <ToggleRow
                    title="Auto Accept QR Orders"
                    note=""
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
                Icon={SlidersHorizontal}
                title="Hardware & Terminals"
                subtitle=""
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                {/* Real Printer/Device Boxes */}
                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                  {printers.map((printer) => (
                    <div 
                      key={printer.id}
                      onClick={() => openEditPrinterModal(printer)}
                      className={`flex items-center justify-between rounded border p-4 cursor-pointer hover:border-[#696cff] transition-all group ${
                        dark ? "border-[#4e4f6e] bg-[#232333]" : "border-slate-200 bg-[#f8fafc]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded ${
                          printer.type === "receipt" ? "bg-[#e7e7ff] text-[#696cff]" : "bg-[#fff2e2] text-[#ff9f43]"
                        }`}>
                          <SlidersHorizontal size={18} />
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${textPrimary} group-hover:text-[#696cff] transition-colors`}>{printer.name}</div>
                          <div className="text-[11px] text-[#a1acb8]">
                            IP: {printer.ipAddress} · {printer.type === "receipt" ? "Receipt Printer" : printer.type === "kitchen" ? "Kitchen Printer" : "Bar Printer"}
                          </div>
                        </div>
                      </div>
                      <span className={`rounded px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        printer.status === "connected" ? "bg-[#e8fadf] text-[#71dd37]" : "bg-slate-200 text-slate-500"
                      }`}>
                        {printer.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add New Peripheral button */}
                <button
                  type="button"
                  onClick={openAddPrinterModal}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#d9dee3] dark:border-[#4e4f6e] p-3 text-xs font-semibold text-[#8592a3] hover:bg-[#f5f5f9] dark:hover:bg-[#232333] transition-all"
                >
                  <Plus size={14} />
                  Add New Peripheral
                </button>
              </Panel>

              {/* Telegram Bot Integration Panel */}
              <Panel
                Icon={SendHorizontal}
                title={language === "km" ? "ការភ្ជាប់ជាមួយ Telegram Bot Alert" : "Telegram Bot Integration"}
                subtitle={language === "km" ? "ទទួលការជូនដំណឹងរហ័ស ពេលបុគ្គលិក Login, Password ខុស ឬ មាន Order ថ្មី" : "Receive instant alerts on Telegram for staff logins, failed attempts, and orders."}
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Telegram Bot Token">
                      <input
                        type="text"
                        value={telegramConfig.botToken}
                        onChange={(e) => setTelegramConfigState((prev) => ({ ...prev, botToken: e.target.value }))}
                        placeholder="e.g. 7123456789:AAE... (from @BotFather)"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Telegram Chat ID">
                      <input
                        type="text"
                        value={telegramConfig.chatId}
                        onChange={(e) => setTelegramConfigState((prev) => ({ ...prev, chatId: e.target.value }))}
                        placeholder="e.g. -100123456789 or User ID"
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 dark:border-[#4e4f6e] bg-slate-50/50 dark:bg-[#232333] p-4 space-y-3">
                    <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                      {language === "km" ? "ជម្រើសការជូនដំណឹងតាម Telegram (Alert Toggles)" : "Telegram Alert Options"}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={telegramConfig.alertLogin}
                          onChange={(e) => setTelegramConfigState((prev) => ({ ...prev, alertLogin: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-[#696cff] focus:ring-[#696cff]"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {language === "km" ? "🔐 ជូនដំណឹង ពេល Staff Login" : "🔐 Staff Login Alert"}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={telegramConfig.alertFailedLogin}
                          onChange={(e) => setTelegramConfigState((prev) => ({ ...prev, alertFailedLogin: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-red-500 focus:ring-red-500"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {language === "km" ? "⚠️ ជូនដំណឹង ពេល Password ខុស" : "⚠️ Failed Login Warning"}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={telegramConfig.alertNewOrder}
                          onChange={(e) => setTelegramConfigState((prev) => ({ ...prev, alertNewOrder: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {language === "km" ? "🛍️ ជូនដំណឹង ពេលមាន Order ថ្មី" : "🛍️ New Order Alert"}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestTelegram}
                      disabled={testingTelegram}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#696cff] bg-[#696cff]/10 px-4 text-xs font-bold text-[#696cff] hover:bg-[#696cff] hover:text-white transition-all disabled:opacity-50"
                    >
                      {testingTelegram ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      {language === "km" ? "សាកល្បងផ្ញើសារ Telegram" : "Test Telegram Connection"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveTelegram}
                      disabled={savingTelegram}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#696cff] px-4 text-xs font-bold text-white hover:bg-[#5f61e6] transition-all shadow-sm shadow-[#696cff]/20 disabled:opacity-50"
                    >
                      {savingTelegram ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                      {language === "km" ? "រក្សាទុក Telegram Settings" : "Save Telegram Settings"}
                    </button>
                  </div>
                </div>
              </Panel>

              {/* Login Audit Logs Table Panel */}
              <Panel
                Icon={History}
                title={language === "km" ? "កំណត់ត្រាប្រវត្តិ Login បុគ្គលិក (Login Audit Logs)" : "Staff Login Audit Logs"}
                subtitle={language === "km" ? "តាមដានរាល់សកម្មភាពចូលប្រើប្រាស់ប្រព័ន្ធ (Login History, IP Address, Device)" : "Track staff authentication history, devices, IP addresses, and login status."}
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => {
                          setAuditSearch(e.target.value);
                          loadAuditLogs(e.target.value, auditStatusFilter);
                        }}
                        placeholder={language === "km" ? "ស្វែងរកតាមឈ្មោះ, តួនាទី, IP..." : "Search user, role, IP..."}
                        className={`${inputClass} w-60`}
                      />
                      <select
                        value={auditStatusFilter}
                        onChange={(e) => {
                          setAuditStatusFilter(e.target.value);
                          loadAuditLogs(auditSearch, e.target.value);
                        }}
                        className={`${inputClass} w-36`}
                      >
                        <option value="all">{language === "km" ? "គ្រប់ស្ថានភាព" : "All Status"}</option>
                        <option value="SUCCESS">SUCCESS</option>
                        <option value="FAILED">FAILED</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => loadAuditLogs(auditSearch, auditStatusFilter)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 dark:border-[#4e4f6e] px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                      <Loader2 className={auditLoading ? "animate-spin" : ""} size={14} />
                      {language === "km" ? "Refresh Audit Logs" : "Refresh"}
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-[#4e4f6e]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b bg-slate-100/60 dark:bg-[#232333] dark:border-[#4e4f6e] font-black text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="px-4 py-3">Staff Name</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Action</th>
                          <th className="px-4 py-3">IP / Device</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-[#4e4f6e]">
                        {auditLogs.length > 0 ? (
                          auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                              <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-100">{log.userName}</td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-medium">{log.userRole}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">{log.action}</td>
                              <td className="px-4 py-2.5 text-slate-500 text-[11px]">{log.ipAddress || "Localhost"}</td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                                    log.status === "SUCCESS"
                                      ? "bg-[#e8fadf] text-[#71dd37]"
                                      : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                                {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400 font-medium">
                              {language === "km" ? "មិនទាន់មានកំណត់ត្រា Login ឡើយ" : "No audit logs found."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Panel>
            </div>

            <aside className="space-y-5">
              <section className={`rounded-xl border p-5 shadow-sm ${surface} ${borderCol}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#696cff]/10 text-[#696cff]">
                    <Database size={19} />
                  </div>
                  <div>
                    <h2 className={`text-sm font-black ${textPrimary}`}>Backup & Restore</h2>
                  </div>
                </div>

                {!isSuperAdmin ? (
                  <div className={`rounded-xl border p-4 text-xs font-medium ${borderCol} ${softSurface} ${textSecondary}`}>
                    Login as Admin or Super Admin to manage backups.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={createAndDownloadBackup}
                      disabled={Boolean(backupBusy)}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#696cff] px-4 text-xs font-bold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-sm shadow-[#696cff]/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {backupBusy === "download" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
                      Create Backup
                    </button>

                    <button
                      type="button"
                      onClick={downloadLatestBackup}
                      disabled={Boolean(backupBusy) || backupFiles.length === 0}
                      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all ${borderCol} ${softSurface} ${textPrimary} hover:bg-slate-100/50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {backupBusy === "latest" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
                      Download Latest
                    </button>

                    <label
                      className={`inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all ${borderCol} ${softSurface} ${textPrimary} hover:bg-slate-100/50 dark:hover:bg-slate-800`}
                    >
                      {backupBusy === "preview" ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
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
                      <div className={`rounded-xl border p-3.5 ${borderCol} ${softSurface}`}>
                        <div className={`truncate text-xs font-extrabold ${textPrimary}`}>{restoreFileName}</div>
                        <div className={`mt-1 text-[11px] font-medium ${textSecondary}`}>
                          {backupTotal(restorePreview)} records · {formatDate(restorePreview.createdAt)}
                        </div>
                        <button
                          type="button"
                          onClick={restoreSelectedBackup}
                          disabled={Boolean(backupBusy)}
                          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-red-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {backupBusy === "restore" ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                          Restore Backup
                        </button>
                      </div>
                    )}

                    <div className={`rounded-xl border p-3.5 ${borderCol} ${softSurface}`}>
                      <div className={`text-[10px] font-extrabold uppercase tracking-wider text-slate-400`}>Latest Saved</div>
                      {backupFiles[0] ? (
                        <>
                          <div className={`mt-1.5 truncate text-xs font-bold ${textPrimary}`}>{backupFiles[0].filename}</div>
                          <div className={`mt-0.5 text-[11px] font-medium ${textSecondary}`}>
                            {formatFileSize(backupFiles[0].size)} · {formatDate(backupFiles[0].updatedAt)}
                          </div>
                        </>
                      ) : (
                        <div className={`mt-1.5 text-xs ${textSecondary}`}>No saved backups yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className={`rounded-xl border p-5 shadow-sm ${surface} ${borderCol}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#696cff]/10 text-[#696cff]">
                    <ReceiptText size={19} />
                  </div>
                  <div>
                    <h2 className={`text-sm font-black ${textPrimary}`}>Receipt Preview</h2>
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${borderCol} ${softSurface} border-dashed`}>
                  <div className={`text-center text-sm font-black ${textPrimary}`}>
                    {settings.restaurantName || "Restaurant"}
                  </div>
                  <div className={`mt-0.5 text-center text-xs ${textSecondary}`}>
                    {settings.address}
                  </div>

                  <div className={`my-3 h-px border-b border-dashed ${dark ? "border-slate-700" : "border-slate-200"}`} />

                  <div className="space-y-1.5 text-xs">
                    {previewRows.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className={textSecondary}>{label}</span>
                        <span className={`font-bold ${textPrimary}`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className={`my-3 h-px border-b border-dashed ${dark ? "border-slate-700" : "border-slate-200"}`} />

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${textPrimary}`}>Total</span>
                    <span className="text-base font-black text-[#696cff]">
                      {currency(
                        42 +
                          42 * (Number(settings.taxRate || 0) / 100) +
                          42 * (Number(settings.serviceChargeRate || 0) / 100),
                        settings.currency
                      )}
                    </span>
                  </div>

                  <div className={`mt-4 text-center text-[11px] font-medium ${textSecondary}`}>
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

    {/* Sticky Floating Save Toast Bar (When settings modified) */}
    {isDirty && (
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-4 rounded-2xl bg-[#1f2130] px-5 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700 animate-[printerScaleIn_200ms_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="flex items-center gap-2 text-amber-400">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span>{language === "km" ? "អ្នកមានទិន្នន័យមិនទាន់រក្សាទុក" : "Unsaved changes detected"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetFormSettings}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {language === "km" ? "កំណត់ឡើងវិញ" : "Reset"}
          </button>
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector("form");
              if (form) form.requestSubmit();
            }}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#696cff] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-md shadow-[#696cff]/25"
          >
            {saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
            {language === "km" ? "រក្សាទុក" : "Save Changes"}
          </button>
        </div>
      </div>
    )}

      {/* Printer Modal */}
      {printerModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[1px] animate-[printerFadeIn_180ms_ease-out]">
          <div className={`relative max-h-[calc(100vh-32px)] w-full max-w-md overflow-y-auto rounded-xl shadow-2xl border p-6 animate-[printerScaleIn_200ms_cubic-bezier(0.16,1,0.3,1)] ${surface} ${borderCol}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {printerModal.printerId ? "Configure Printer" : "Register Printer"}
                </p>
                <h2 className={`mt-1 text-xl font-bold ${textPrimary}`}>
                  {printerModal.printerId ? "Edit Printer Connection" : "Add Network Printer"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePrinterModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePrinterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  Printer Name
                </label>
                <input
                  type="text"
                  required
                  value={printerForm.name}
                  onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                  placeholder="e.g. Cashier Printer"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                    IP Address
                  </label>
                  <input
                    type="text"
                    required
                    value={printerForm.ipAddress}
                    onChange={(e) => setPrinterForm({ ...printerForm, ipAddress: e.target.value })}
                    placeholder="192.168.1.150"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                    Printer Type
                  </label>
                  <select
                    value={printerForm.type}
                    onChange={(e) => setPrinterForm({ ...printerForm, type: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="receipt">Receipt Printer</option>
                    <option value="kitchen">Kitchen Printer</option>
                    <option value="bar">Bar Printer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  Status
                </label>
                <select
                  value={printerForm.status}
                  onChange={(e) => setPrinterForm({ ...printerForm, status: e.target.value as any })}
                  className={inputClass}
                >
                  <option value="connected">Connected (Online)</option>
                  <option value="offline">Offline / Standby</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                {printerModal.printerId && (
                  <button
                    type="button"
                    onClick={handleDeletePrinter}
                    className="h-10 rounded border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-4 text-sm font-semibold transition-colors"
                  >
                    Delete
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={closePrinterModal}
                  className={`h-10 flex-1 rounded border px-4 text-sm font-semibold hover:bg-slate-50 transition-colors ${
                    dark ? "border-slate-700 text-slate-300" : "border-[#d9dee3] text-[#8592a3]"
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="h-10 flex-1 rounded bg-[#696cff] hover:bg-[#5f61e6] px-4 text-sm font-semibold text-white shadow-sm transition-colors"
                >
                  Save Printer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes printerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes printerScaleIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(6px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
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
    </>
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
          <h2 className={`text-base font-bold ${textPrimary}`}>{title}</h2>
          {subtitle && <p className={`mt-0.5 text-xs ${textSecondary}`}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
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
    <div className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${softSurface} border-slate-100 dark:border-slate-800`}>
      <div>
        <div className={`text-xs font-extrabold ${textPrimary}`}>{title}</div>
        {note && <div className={`mt-1 text-[11px] ${textSecondary}`}>{note}</div>}
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-[#696cff]" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "left-[22px]" : "left-0.5"
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
