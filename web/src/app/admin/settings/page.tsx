"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  Download,
  Grid2X2,
  Globe,
  History,
  ImagePlus,
  Info,
  BookOpen,
  Armchair,
  LayoutGrid,
  Loader2,
  Mail,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Send,
  SendHorizontal,
  Settings,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  User,
  UsersRound,
  ShoppingBag,
  X,
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

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"dashboard" | "general" | "billing" | "printers" | "integrations" | "security">("general");
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(true);

  useEffect(() => {
    if (tabParam && ["general", "billing", "printers", "integrations", "security"].includes(tabParam)) {
      setActiveTab(tabParam as "dashboard" | "general" | "billing" | "printers" | "integrations" | "security");
    }
  }, [tabParam]);

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
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

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

    function handleAuditUpdate() {
      loadAuditLogs();
    }

    window.addEventListener("pos-audit-logs-updated", handleAuditUpdate);

    return () => {
      window.removeEventListener("pos-audit-logs-updated", handleAuditUpdate);
    };
  }, []);

  const loadAuditLogs = async (
    search = auditSearch,
    status = auditStatusFilter,
    page = auditPage
  ) => {
    setAuditLoading(true);
    try {
      const res = await getAuditLogs({
        search,
        status: status === "all" ? undefined : status,
        page,
        limit: 8,
      });
      if (res) {
        setAuditLogs(res.items || []);
        setAuditTotal(res.total || 0);
        setAuditTotalPages(res.totalPages || 1);
      }
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
  const borderCol = dark ? "border-[#3b3c54]" : "border-slate-200/80";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-300 font-medium" : "text-[#64748b]";
  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition placeholder-slate-400 focus:border-[#55a060] ${
    dark
      ? "border-[#3b3c54] bg-[#232333] text-slate-100 focus:bg-[#2b2c40]"
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
      <main className={`flex flex-1 flex-col overflow-y-auto ${dark ? "bg-[#232333]" : "bg-white"}`}>

        {/* Secondary Sub-Navigation Bar */}
        <div className={`border-b shrink-0 ${
          dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-200/80"
        }`}>
          <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6 py-3 flex flex-wrap items-center gap-2.5 text-sm font-semibold overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* 1. Store Details */}
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === "general"
                ? "bg-[#55a060] text-white font-bold shadow-xs"
                : dark
                ? "bg-[#232333] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Info size={17} />
            <span>{language === "km" ? "ព័ត៌មានហាង" : "Store Details"}</span>
          </button>

          {/* 2. Print Settings */}
          <button
            type="button"
            onClick={() => setActiveTab("printers")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === "printers"
                ? "bg-[#55a060] text-white font-bold shadow-xs"
                : dark
                ? "bg-[#232333] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Printer size={17} />
            <span>{language === "km" ? "ការកំណត់ការបោះពុម្ព" : "Print Settings"}</span>
          </button>

          {/* Tax Setup */}
          <button
            type="button"
            onClick={() => setActiveTab("billing")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === "billing"
                ? "bg-[#55a060] text-white font-bold shadow-xs"
                : dark
                ? "bg-[#232333] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <ReceiptText size={17} />
            <span>{language === "km" ? "ការកំណត់ពន្ធ" : "Tax Setup"}</span>
          </button>

          {/* 8. Integrations */}
          <button
            type="button"
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === "integrations"
                ? "bg-[#55a060] text-white font-bold shadow-xs"
                : dark
                ? "bg-[#232333] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <SendHorizontal size={17} />
            <span>{language === "km" ? "ការភ្ជាប់ទំនាក់ទំនង" : "Integrations"}</span>
          </button>

          {/* 9. System & Backups */}
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === "security"
                ? "bg-[#55a060] text-white font-bold shadow-xs"
                : dark
                ? "bg-[#232333] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Database size={17} />
            <span>{language === "km" ? "ប្រព័ន្ធ & ការចម្លងទុក" : "System & Backups"}</span>
          </button>
          </div>
        </div>

        <div className="flex-1 mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
          <div className="w-full">


                <form id="settingsForm" onSubmit={submit}>





              {/* TAB 1: GENERAL SETTINGS */}
              {activeTab === "general" && (
                <div className="animate-[printerFadeIn_200ms_ease-out]">
                  {/* Page heading */}
                  <h2 className={`text-2xl font-normal mb-5 ${textPrimary}`}>Store Details</h2>

                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* LEFT: Store Image Card */}
                    <div className={`shrink-0 w-full lg:w-56 rounded-2xl border ${borderCol} ${surface} p-5 flex flex-col items-center gap-3`}>
                      <span className={`text-xs font-semibold ${textSecondary}`}>Store Image</span>

                      {/* Upload zone */}
                      <label className="cursor-pointer w-full">
                        <div className={`relative w-full aspect-square rounded-xl border-2 border-dashed border-[#4caf50]/60 flex flex-col items-center justify-center gap-2 overflow-hidden transition-colors hover:border-[#4caf50] ${softSurface}`}>
                          {settings.restaurantImageUrl ? (
                            <img
                              src={resolveImageUrl(settings.restaurantImageUrl)}
                              alt={settings.restaurantName || "Restaurant"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <>
                              {uploadingImage ? (
                                <Loader2 className="animate-spin text-[#4caf50]" size={24} />
                              ) : (
                                <Upload size={22} className="text-[#4caf50]" />
                              )}
                              <span className={`text-xs ${textSecondary}`}>
                                {uploadingImage ? "Uploading…" : "No image"}
                              </span>
                            </>
                          )}
                        </div>
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

                      <div className="text-center">
                        <div className={`text-[11px] ${textSecondary}`}>Recommended size</div>
                        <div className={`text-[11px] font-semibold ${textSecondary}`}>500 × 500 px</div>
                        <div className={`text-[11px] ${textSecondary}`}>JPG or PNG</div>
                      </div>
                    </div>

                    {/* RIGHT: Form fields */}
                    <div className={`flex-1 max-w-5xl rounded-2xl border ${borderCol} ${surface} p-6 space-y-5`}>
                      {/* Store Name */}
                      <div className="space-y-1.5">
                        <label className={`block text-xs font-semibold ${textSecondary}`}>Store Name</label>
                        <input
                          value={settings.restaurantName}
                          onChange={(event) => update("restaurantName", event.target.value)}
                          placeholder="e.g. Park Fast Food"
                          className={`${inputClass} w-full`}
                        />
                      </div>

                      {/* Address */}
                      <div className="space-y-1.5">
                        <label className={`block text-xs font-semibold ${textSecondary}`}>Address</label>
                        <textarea
                          value={settings.address}
                          onChange={(event) => update("address", event.target.value)}
                          rows={3}
                          placeholder="e.g. 123 Main St, City, Country"
                          className={`${inputClass} w-full resize-none`}
                        />
                      </div>

                      {/* Email + Phone side by side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className={`block text-xs font-semibold ${textSecondary}`}>Email</label>
                          <div className="relative">
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4caf50]" />
                            <input
                              type="email"
                              value={settings.restaurantEmail}
                              onChange={(event) => update("restaurantEmail", event.target.value)}
                              placeholder="contact@restaurant.com"
                              className={`${inputClass} w-full pl-9`}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className={`block text-xs font-semibold ${textSecondary}`}>Phone</label>
                          <div className="relative">
                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4caf50]" />
                            <input
                              value={settings.restaurantPhone}
                              onChange={(event) => update("restaurantPhone", event.target.value)}
                              placeholder="+855 12 345 678"
                              className={`${inputClass} w-full pl-9`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Currency */}
                      <div className="space-y-1.5">
                        <label className={`block text-xs font-semibold ${textSecondary}`}>Currency</label>
                        <select
                          value={settings.currency}
                          onChange={(event) => update("currency", event.target.value)}
                          className={`${inputClass} w-full`}
                        >
                          <option value="USD">United States dollar - ($)</option>
                          <option value="KHR">Cambodian Riel - (៛)</option>
                          <option value="THB">Thai Baht - (฿)</option>
                        </select>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          form="settingsForm"
                          disabled={saving}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#55a060] hover:bg-[#498b52] active:scale-95 px-6 text-sm font-bold text-white transition-all shadow-sm shadow-[#55a060]/20 disabled:opacity-50 cursor-pointer"
                        >
                          {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                          {language === "km" ? "រក្សាទុក" : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TAX SETUP */}
              {activeTab === "billing" && (
                <div className="animate-[printerFadeIn_200ms_ease-out]">
                  <h2 className={`text-2xl font-normal mb-5 ${textPrimary}`}>
                    {language === "km" ? "ការកំណត់ពន្ធ" : "Tax Setup"}
                  </h2>

                  <div className="flex flex-col lg:flex-row gap-5">

                    {/* ── LEFT: Form fields ── */}
                    <div className={`flex-1 rounded-2xl border ${borderCol} ${surface} p-6 space-y-5`}>

                      {/* Currency */}
                      <div className="space-y-1.5">
                        <label className={`block text-xs font-semibold ${textSecondary}`}>
                          {language === "km" ? "រូបិយប័ណ្ណ" : "Currency"}
                        </label>
                        <select
                          value={settings.currency}
                          onChange={(event) => update("currency", event.target.value)}
                          className={`${inputClass} w-full`}
                        >
                          <option value="USD">United States dollar – ($)</option>
                          <option value="KHR">Cambodian Riel – (៛)</option>
                          <option value="THB">Thai Baht – (฿)</option>
                        </select>
                      </div>

                      {/* Tax Rate + Service Charge */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className={`block text-xs font-semibold ${textSecondary}`}>
                            {language === "km" ? "អត្រាពន្ធ (%)" : "Tax Rate (%)"}
                          </label>
                          <input
                            type="number" min={0} max={100} step={0.1}
                            value={settings.taxRate}
                            onChange={(event) => update("taxRate", Number(event.target.value))}
                            placeholder="e.g. 7"
                            className={`${inputClass} w-full`}
                          />
                          <p className={`text-[11px] ${textSecondary}`}>
                            {language === "km" ? "ត្រូវបានប្រើលើតម្លៃសរុប" : "Applied on subtotals"}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <label className={`block text-xs font-semibold ${textSecondary}`}>
                            {language === "km" ? "ថ្លៃសេវា (%)" : "Service Charge (%)"}
                          </label>
                          <input
                            type="number" min={0} max={100} step={0.1}
                            value={settings.serviceChargeRate}
                            onChange={(event) => update("serviceChargeRate", Number(event.target.value))}
                            placeholder="e.g. 10"
                            className={`${inputClass} w-full`}
                          />
                          <p className={`text-[11px] ${textSecondary}`}>
                            {language === "km" ? "ត្រូវបានបន្ថែមលើវិក្កយបត្រ" : "Added to final bill"}
                          </p>
                        </div>
                      </div>

                      {/* Receipt Footer */}
                      <div className="space-y-1.5">
                        <label className={`block text-xs font-semibold ${textSecondary}`}>
                          {language === "km" ? "ចំណារបញ្ចប់វិក្កយបត្រ" : "Receipt Footer Note"}
                        </label>
                        <textarea
                          value={settings.receiptFooter}
                          onChange={(event) => update("receiptFooter", event.target.value)}
                          rows={2}
                          placeholder="e.g. Thank you for dining with us."
                          className={`${inputClass} w-full resize-none`}
                        />
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#55a060] hover:bg-[#498b52] active:scale-95 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#55a060]/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                          {saving
                            ? (language === "km" ? "កំពុងរក្សាទុក..." : "Saving...")
                            : (language === "km" ? "រក្សាទុក" : "Save Changes")}
                        </button>
                      </div>
                    </div>

                    {/* ── RIGHT: Live Preview ── */}
                    <div className={`w-full lg:w-64 shrink-0 rounded-2xl border ${borderCol} ${surface} p-5 flex flex-col gap-4`}>
                      {/* Header */}
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#696cff]/10 text-[#696cff]">
                          <ReceiptText size={16} />
                        </div>
                        <div>
                          <div className={`text-xs font-black ${textPrimary}`}>
                            {language === "km" ? "ការគណនាជាក់ស្ដែង" : "Live Preview"}
                          </div>
                          <div className={`text-[10px] ${textSecondary}`}>
                            {language === "km" ? "ដោយផ្អែកលើ $42.00" : "Based on $42.00"}
                          </div>
                        </div>
                      </div>

                      {/* Store name */}
                      <div className={`text-center py-2 border-b ${dark ? "border-[#4e4f6e]/40" : "border-slate-100"}`}>
                        <div className={`text-xs font-black ${textPrimary}`}>{settings.restaurantName || "Restaurant"}</div>
                        {settings.address && <div className={`text-[10px] ${textSecondary} mt-0.5`}>{settings.address}</div>}
                      </div>

                      {/* Rows */}
                      <div className="space-y-2 flex-1">
                        {[
                          { label: language === "km" ? "តម្លៃសរុបមុន" : "Subtotal", value: "$42.00" },
                          {
                            label: `${language === "km" ? "ពន្ធ" : "Tax"} (${settings.taxRate}%)`,
                            value: `$${(42 * (Number(settings.taxRate || 0) / 100)).toFixed(2)}`
                          },
                          {
                            label: `${language === "km" ? "ថ្លៃសេវា" : "Service"} (${settings.serviceChargeRate}%)`,
                            value: `$${(42 * (Number(settings.serviceChargeRate || 0) / 100)).toFixed(2)}`
                          },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between text-xs">
                            <span className={textSecondary}>{label}</span>
                            <span className={`font-semibold ${textPrimary}`}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className={`border-t pt-3 ${dark ? "border-[#4e4f6e]/40" : "border-slate-100"}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black ${textPrimary}`}>
                            {language === "km" ? "សរុប" : "Total"}
                          </span>
                          <span className="text-lg font-black text-[#696cff]">
                            ${(42 + 42 * (Number(settings.taxRate || 0) / 100) + 42 * (Number(settings.serviceChargeRate || 0) / 100)).toFixed(2)}
                          </span>
                        </div>
                        {settings.receiptFooter && (
                          <div className={`mt-2 text-center text-[10px] ${textSecondary} italic`}>
                            {settings.receiptFooter}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}




              {/* TAB 3: PRINT SETTINGS */}
              {activeTab === "printers" && (
                <div className="animate-[printerFadeIn_200ms_ease-out]">
                  {/* Page heading + Add button */}
                  <div className="flex items-center justify-between mb-5">
                    <h2 className={`text-2xl font-normal ${textPrimary}`}>
                      {language === "km" ? "ការកំណត់ម៉ាស៊ីនបោះពុម្ព" : "Print Settings"}
                    </h2>
                    <button
                      type="button"
                      onClick={openAddPrinterModal}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#55a060] hover:bg-[#498b52] active:scale-95 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#55a060]/20 transition-all duration-200 cursor-pointer"
                    >
                      <Plus size={15} />
                      {language === "km" ? "បន្ថែម Printer" : "Add Printer"}
                    </button>
                  </div>

                  {/* Single card */}
                  <div className={`rounded-2xl border ${borderCol} ${surface} overflow-hidden`}>
                    {printers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 ${textSecondary}`}>
                          <Printer size={26} />
                        </div>
                        <p className={`text-sm font-semibold ${textSecondary}`}>
                          {language === "km" ? "មិនទាន់មាន Printer ទេ" : "No printers added yet"}
                        </p>
                        <p className={`text-xs ${textSecondary} opacity-60`}>
                          {language === "km" ? "ចុច «បន្ថែម Printer» ដើម្បីចាប់ផ្ដើម" : "Click \"Add Printer\" to get started"}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className={`border-b ${dark ? "bg-[#232333] border-[#4e4f6e]" : "bg-[#f8f9fa] border-slate-100"}`}>
                            <tr>
                              <th className={`px-5 py-3.5 text-[11px] font-black uppercase tracking-wider ${textSecondary}`}>
                                {language === "km" ? "ឈ្មោះ Printer" : "Printer Name"}
                              </th>
                              <th className={`px-5 py-3.5 text-[11px] font-black uppercase tracking-wider ${textSecondary}`}>
                                IP Address
                              </th>
                              <th className={`px-5 py-3.5 text-[11px] font-black uppercase tracking-wider ${textSecondary}`}>
                                {language === "km" ? "ប្រភេទ" : "Type"}
                              </th>
                              <th className={`px-5 py-3.5 text-[11px] font-black uppercase tracking-wider ${textSecondary}`}>
                                {language === "km" ? "ស្ថានភាព" : "Status"}
                              </th>
                              <th className={`px-5 py-3.5 text-[11px] font-black uppercase tracking-wider ${textSecondary} text-right`}>
                                {language === "km" ? "សកម្មភាព" : "Actions"}
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${dark ? "divide-[#4e4f6e]/40" : "divide-slate-100"}`}>
                            {printers.map((printer) => (
                              <tr
                                key={printer.id}
                                className={`transition-colors duration-150 ${dark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50/60"}`}
                              >
                                <td className={`px-5 py-4 font-bold text-sm ${textPrimary}`}>
                                  {printer.name}
                                </td>
                                <td className={`px-5 py-4 font-mono text-xs ${textSecondary}`}>
                                  {printer.ipAddress}
                                </td>
                                <td className="px-5 py-4">
                                  <span className="inline-flex items-center rounded-lg bg-[#696cff]/10 px-2.5 py-1 text-[11px] font-black uppercase text-[#696cff]">
                                    {printer.type}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black uppercase ${
                                    printer.status === "connected"
                                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                      : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${printer.status === "connected" ? "bg-emerald-500" : "bg-red-500"}`} />
                                    {printer.status}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openEditPrinterModal(printer)}
                                    className={`text-xs font-bold text-[#696cff] hover:text-[#5f61e6] transition-colors`}
                                  >
                                    {language === "km" ? "កែប្រែ" : "Edit"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* TAB 4: INTEGRATIONS */}
              {activeTab === "integrations" && (
                <div className="animate-[printerFadeIn_200ms_ease-out]">

                  {/* Page heading */}
                  <h2 className={`text-2xl font-normal mb-5 ${textPrimary}`}>
                    {language === "km" ? "ការភ្ជាប់ទំនាក់ទំនង" : "Integrations"}
                  </h2>

                  {/* Telegram card */}
                  <div className={`rounded-2xl border ${borderCol} ${surface} p-6 space-y-5`}>

                    {/* Card title row */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#229ED9]/10 text-[#229ED9]">
                        <SendHorizontal size={18} />
                      </div>
                      <div>
                        <div className={`text-sm font-black ${textPrimary}`}>
                          {language === "km" ? "Telegram Bot" : "Telegram Bot Integration"}
                        </div>
                        <div className={`text-xs ${textSecondary} mt-0.5`}>
                          {language === "km"
                            ? "ទទួលការជូនដំណឹង Login, Password ខុស, Order ថ្មី"
                            : "Receive instant alerts for logins, failed attempts, and new orders"}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className={`border-t ${dark ? "border-[#4e4f6e]/50" : "border-slate-100"}`} />

                    {/* Token + Chat ID */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className={`block text-xs font-semibold ${textSecondary}`}>
                          Telegram Bot Token
                        </label>
                        <input
                          type="text"
                          value={telegramConfig.botToken}
                          onChange={(e) => setTelegramConfigState((prev) => ({ ...prev, botToken: e.target.value }))}
                          placeholder="e.g. 7123456789:AAE... (from @BotFather)"
                          className={`${inputClass} w-full`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`block text-xs font-semibold ${textSecondary}`}>
                          Telegram Chat ID
                        </label>
                        <input
                          type="text"
                          value={telegramConfig.chatId}
                          onChange={(e) => setTelegramConfigState((prev) => ({ ...prev, chatId: e.target.value }))}
                          placeholder="e.g. 1511785587 (from @userinfobot)"
                          className={`${inputClass} w-full`}
                        />
                      </div>
                    </div>

                    {/* Alert toggles */}
                    <div className={`rounded-xl border p-4 space-y-3 ${dark ? "border-[#4e4f6e]/50 bg-[#232333]" : "border-slate-100 bg-slate-50/60"}`}>
                      <div className={`text-xs font-bold ${textPrimary}`}>
                        {language === "km" ? "ជ្រើសរើសសំណរការជូនដំណឹង" : "Alert Notifications"}
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {[
                          {
                            key: "alertLogin" as const,
                            emoji: "🔐",
                            label: language === "km" ? "Staff Login" : "Staff Login Alert",
                            checked: telegramConfig.alertLogin,
                            color: "text-[#696cff]",
                          },
                          {
                            key: "alertFailedLogin" as const,
                            emoji: "⚠️",
                            label: language === "km" ? "Password ខុស" : "Failed Login Warning",
                            checked: telegramConfig.alertFailedLogin,
                            color: "text-red-500",
                          },
                          {
                            key: "alertNewOrder" as const,
                            emoji: "🛍️",
                            label: language === "km" ? "Order ថ្មី" : "New Order Alert",
                            checked: telegramConfig.alertNewOrder,
                            color: "text-emerald-500",
                          },
                        ].map(({ key, emoji, label, checked, color }) => (
                          <label key={key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                            checked
                              ? dark ? "border-[#4e4f6e] bg-white/5" : "border-slate-200 bg-white"
                              : dark ? "border-transparent" : "border-transparent"
                          }`}>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${
                              checked ? (dark ? "bg-white/10" : "bg-slate-100") : (dark ? "bg-white/5" : "bg-slate-100/60")
                            }`}>
                              {emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-bold ${textPrimary}`}>{label}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => setTelegramConfigState((prev) => ({ ...prev, [key]: e.target.checked }))}
                              className={`h-4 w-4 rounded border-slate-300 ${color} focus:ring-current shrink-0`}
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        disabled={testingTelegram}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${dark ? "border-[#4e4f6e] text-slate-300 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      >
                        {testingTelegram ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                        {language === "km" ? "សាកល្បង Telegram" : "Test Connection"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveTelegram}
                        disabled={savingTelegram}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#55a060] hover:bg-[#498b52] active:scale-95 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#55a060]/20 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {savingTelegram ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        {language === "km" ? "រក្សាទុក" : "Save Settings"}
                      </button>
                    </div>

                  </div>
                </div>
              )}


              {/* TAB 5: SYSTEM & BACKUPS */}
              {activeTab === "security" && (
                <div className="animate-[printerFadeIn_200ms_ease-out] space-y-6">

                  {/* Page heading */}
                  <h2 className={`text-2xl font-normal ${textPrimary}`}>
                    {language === "km" ? "ប្រព័ន្ធ និងការចម្លងទុក" : "System & Backups"}
                  </h2>

                  {/* ── Backup & Restore Card ── */}
                  <div className={`rounded-2xl border ${borderCol} ${surface} p-6`}>
                    <div className="mb-5">
                      <div className={`text-sm font-black ${textPrimary}`}>
                        {language === "km" ? "ការចម្លងទុក និងស្ដារ" : "Backup & Restore"}
                      </div>
                      <div className={`text-xs ${textSecondary} mt-0.5`}>
                        {language === "km" ? "គ្រប់គ្រងការចម្លង Export និង Recovery" : "Manage system backups, automatic exports, and disaster recovery."}
                      </div>
                    </div>

                    {!isSuperAdmin ? (
                      <div className={`rounded-xl border p-4 text-xs font-medium ${borderCol} ${softSurface} ${textSecondary}`}>
                        {language === "km" ? "សូម Login ជា Admin ដើម្បីគ្រប់គ្រង Backup" : "Login as Admin or Super Admin to manage backups."}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={createAndDownloadBackup}
                            disabled={Boolean(backupBusy)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#55a060] hover:bg-[#498b52] active:scale-95 px-4 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-sm shadow-[#55a060]/20"
                          >
                            {backupBusy === "download" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
                            {language === "km" ? "បង្កើត Backup" : "Create Backup"}
                          </button>

                          <button
                            type="button"
                            onClick={downloadLatestBackup}
                            disabled={Boolean(backupBusy) || backupFiles.length === 0}
                            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all ${borderCol} ${surface} ${textPrimary} hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {backupBusy === "latest" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
                            {language === "km" ? "ទាញយកចុងក្រោយ" : "Download Latest"}
                          </button>

                          <label className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all ${borderCol} ${surface} ${textPrimary} hover:bg-slate-50 dark:hover:bg-slate-800`}>
                            {backupBusy === "preview" ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                            {language === "km" ? "ជ្រើសរើស Restore File" : "Choose Restore File"}
                            <input type="file" accept="application/json,.json" disabled={Boolean(backupBusy)} onChange={selectRestoreFile} className="hidden" />
                          </label>
                        </div>

                        {restorePreview && (
                          <div className={`rounded-xl border p-4 ${borderCol} ${softSurface}`}>
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
                              {language === "km" ? "ស្ដារ Backup" : "Restore Backup"}
                            </button>
                          </div>
                        )}

                        <div className={`rounded-xl border p-4 ${borderCol} ${softSurface}`}>
                          <div className={`text-[10px] font-extrabold uppercase tracking-wider ${textSecondary}`}>
                            {language === "km" ? "Backup ចុងក្រោយ" : "Latest Saved Backup"}
                          </div>
                          {backupFiles[0] ? (
                            <>
                              <div className={`mt-1.5 truncate text-xs font-bold ${textPrimary}`}>{backupFiles[0].filename}</div>
                              <div className={`mt-0.5 text-[11px] font-medium ${textSecondary}`}>
                                {formatFileSize(backupFiles[0].size)} · {formatDate(backupFiles[0].updatedAt || backupFiles[0].createdAt, backupFiles[0].filename)}
                              </div>
                            </>
                          ) : (
                            <div className={`mt-1.5 text-xs ${textSecondary}`}>
                              {language === "km" ? "មិនទាន់មាន Backup ទេ" : "No saved backups yet."}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </form>
      </div>
    </div>



      {/* Printer Modal */}
      {printerModal.isOpen && (
        <div onClick={closePrinterModal} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-[2px] animate-[printerFadeIn_180ms_ease-out]">
          <div onClick={(e) => e.stopPropagation()} className={`relative max-h-[calc(100vh-32px)] w-full max-w-md overflow-y-auto rounded-2xl shadow-xl border p-6 animate-[printerScaleIn_200ms_cubic-bezier(0.16,1,0.3,1)] ${surface} ${borderCol}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#55a060]">
                  {printerModal.printerId ? "Configure Printer" : "Register Printer"}
                </p>
                <h2 className={`mt-0.5 text-xl font-bold ${textPrimary}`}>
                  {printerModal.printerId ? "Edit Printer Connection" : "Add Network Printer"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePrinterModal}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                    className="h-10 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-4 text-sm font-bold transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={closePrinterModal}
                  className={`h-10 flex-1 rounded-xl border px-4 text-sm font-bold hover:bg-slate-50 transition-colors cursor-pointer ${
                    dark ? "border-slate-700 text-slate-300" : "border-[#d9dee3] text-[#8592a3]"
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="h-10 flex-1 rounded-xl bg-[#55a060] hover:bg-[#498b52] active:scale-95 px-4 text-sm font-bold text-white shadow-sm shadow-[#55a060]/20 transition-all cursor-pointer"
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
    <section className={`rounded-2xl border p-5 shadow-none ${surface} ${borderCol}`}>
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

function formatDate(value?: string | number | Date | null, filename?: string) {
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    }
  }

  if (filename) {
    const tsMatch = filename.match(/-(\d{12,14})\./);
    if (tsMatch && tsMatch[1]) {
      const d = new Date(Number(tsMatch[1]));
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(d);
      }
    }

    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch && dateMatch[1]) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(d);
      }
    }
  }

  return "Unknown date";
}
