"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Bell,
  Search,
  Clock3,
  Grid2X2,
  Languages,
  Maximize,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingBag,
  Utensils,
  UserRound,
  Sun,
  Moon,
  Eye,
  X,
  ChefHat,
} from "lucide-react";
import { setAppLanguage } from "../lib/language";
import { useAppTheme } from "../lib/theme";
import { canSeeHref, normalizeStaffPermissions } from "../lib/permissions";
import {
  getProfileImage,
  getProfileVersionSnapshot,
  getServerProfileVersionSnapshot,
  initials,
  parseProfileUserSnapshot,
  profileAvatarClass,
  subscribeToProfileChanges,
} from "../lib/profile";

export type Language = "en" | "km";

export type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  tone?: "default" | "warning";
  orderId?: string | number;
  orderNumber?: string;
  tableNo?: string;
  totalAmount?: number;
  time?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price?: number;
    notes?: string;
    image?: string;
  }>;
};

type TopBarProps = {
  title: string;
  subtitle: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
  notifications: NotificationItem[];
  onClearNotifications?: () => void;
  dark?: boolean;
  onMenuToggle?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
};

const quickLinks = [
  { label: "Orders History", href: "/admin/orders", Icon: Clock3 },
  { label: "Hold Orders", href: "/admin/orders", Icon: ReceiptText },
  { label: "POS", href: "/pos", Icon: Utensils },
  { label: "Table", href: "/admin/tables", Icon: Grid2X2 },
];

let cachedStaffPermissionsRaw = "";
let cachedStaffPermissions = normalizeStaffPermissions();

const labels = {
  km: {
    toggleMenu: "\u1794\u17d2\u178a\u17bc\u179a\u1798\u17c9\u17ba\u1793\u17bb\u1799",
    fullscreen: "\u1796\u17c1\u1789\u17a2\u17c1\u1780\u17d2\u179a\u1784\u17cb",
    notifications: "\u1780\u17b6\u179a\u1787\u17bc\u1793\u178a\u17c6\u178e\u17b9\u1784",
    noNotifications: "\u1782\u17d2\u1798\u17b6\u1793\u1780\u17b6\u179a\u1787\u17bc\u1793\u178a\u17c6\u178e\u17b9\u1784\u1790\u17d2\u1798\u17b8",
    clear: "\u179f\u1798\u17d2\u17a2\u17b6\u178f",
    settings: "\u1780\u17b6\u179a\u1780\u17c6\u178e\u178f\u17cb",
    quickLinks: {
      "Orders History": "ប្រវត្តិការបញ្ជាទិញ",
      "Hold Orders": "ការបញ្ជាទុក",
      POS: "POS",
      Table: "តុ",
    },
    khmer: "\u1781\u17d2\u1798\u17c2\u179a",
    english: "English",
  },
  en: {
    toggleMenu: "Toggle menu",
    fullscreen: "Fullscreen",
    notifications: "Notifications",
    noNotifications: "No new notifications",
    clear: "Clear",
    settings: "Settings",
    quickLinks: {
      "Orders History": "Orders History",
      "Hold Orders": "Hold Orders",
      POS: "POS",
      Table: "Table",
    },
    khmer: "Khmer",
    english: "English",
  },
};

export default function TopBar({
  title,
  subtitle,
  language,
  onLanguageChange,
  notifications,
  onClearNotifications,
  dark = false,
  onMenuToggle,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
}: TopBarProps) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const user = parseUserSnapshot(
    useSyncExternalStore(
      subscribeToUserChanges,
      getUserSnapshot,
      getServerUserSnapshot
    )
  );
  const staffPermissions = useSyncExternalStore(
    subscribeToPermissionChanges,
    getStaffPermissionsSnapshot,
    getServerStaffPermissionsSnapshot
  );
  useSyncExternalStore(
    subscribeToProfileChanges,
    getProfileVersionSnapshot,
    getServerProfileVersionSnapshot
  );

  const [appTheme, setAppTheme] = useAppTheme();
  const isDark = appTheme === "dark";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (languageRef.current && !languageRef.current.contains(target)) {
        setLanguageOpen(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const unreadCount = notifications.length;

  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const [mounted, setMounted] = useState(false);
  const prevNotificationsCount = useRef(notifications.length);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (notifications.length > prevNotificationsCount.current) {
      const newNotif = notifications[0]; 
      if (newNotif) {
        setToastNotification(newNotif);
        const timer = setTimeout(() => setToastNotification(null), 5000);
        return () => clearTimeout(timer);
      }
    }
    prevNotificationsCount.current = notifications.length;
  }, [notifications]);

  const bgCard = dark ? "bg-[#2b2c40]" : "bg-white";
  const surface = isDark ? "border-[#2a2f3d] bg-[#171a23]" : "border-slate-200 bg-white";
  const dropdownSurface = isDark ? "border-[#2a2f3d] bg-[#171a23]" : "border-slate-200 bg-white";
  const menuHover = isDark ? "hover:bg-white/10" : "hover:bg-slate-100";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const kmClass = language === "km" ? "font-khmer" : "";
  const t = labels[language];
  const allowedQuickLinks = quickLinks.filter(({ href }) => canSeeHref(href, user.role, staffPermissions));

  return (
    <header className={`sticky top-0 z-20 border-b px-3 shadow-sm ${surface}`}>
      <div className="flex h-[52px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onMenuToggle?.();
              window.dispatchEvent(new Event("pos-sidebar-toggle"));
            }}
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
            title={t.toggleMenu}
          >
            <Menu size={18} />
          </button>

          <div className="hidden min-w-0 border-l border-slate-200 dark:border-[#4e4f6e] pl-3 sm:block">
            <div className={`truncate text-xs font-black ${textPrimary} ${kmClass}`}>
              {title}
            </div>
            <div className={`truncate text-[10px] ${textSecondary} ${kmClass}`}>
              {subtitle}
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-[#a1acb8]" />
              <input
                type="text"
                value={searchQuery ?? ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder ?? "Search..."}
                className={`h-8.5 w-60 rounded-xl border pl-9 pr-3 text-xs outline-none transition placeholder:text-[#a1acb8] focus:border-[#0F522B] focus:ring-4 focus:ring-[#0F522B]/10 ${
                  isDark
                    ? "border-[#4e4f6e] bg-[#232333] text-slate-100"
                    : "border-slate-200/80 bg-[#f5f5f9] text-[#2c3e50]"
                }`}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Sleek Easy & Clean POS / KDS Quick Switcher */}
          <div className="hidden items-center gap-1.5 sm:flex mr-1 border-r border-slate-200/80 dark:border-[#4e4f6e] pr-2.5">
            <Link
              href="/pos"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#696cff]/10 px-2.5 text-xs font-black text-[#696cff] hover:bg-[#696cff] hover:text-white active:scale-95 transition-all shadow-sm"
              title="Open POS Terminal"
            >
              <Utensils size={14} />
              <span className="hidden md:inline font-bold">POS</span>
            </Link>

            <Link
              href="/kds"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white active:scale-95 transition-all shadow-sm"
              title="Open Kitchen Display (KDS)"
            >
              <ChefHat size={14} />
              <span className="hidden md:inline font-bold">KDS</span>
            </Link>
          </div>

          <div ref={languageRef} className="relative">
            <button
              type="button"
              onClick={() => setLanguageOpen((value) => !value)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
              title="Language"
            >
              <Languages size={16} />
            </button>

            {languageOpen && (
              <div className={`absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-sm border shadow-lg ${dropdownSurface}`}>
                <button
                  type="button"
                  onClick={() => {
                    setAppLanguage("en");
                    onLanguageChange("en");
                    setLanguageOpen(false);
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-sm ${
                    language === "en" ? "bg-[#4b5578] text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {t.english}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppLanguage("km");
                    onLanguageChange("km");
                    setLanguageOpen(false);
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-sm font-khmer ${
                    language === "km" ? "bg-[#4b5578] text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {t.khmer}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              document.fullscreenElement
                ? document.exitFullscreen()
                : document.documentElement.requestFullscreen()
            }
            className={`hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
            title={t.fullscreen}
          >
            <Maximize size={16} />
          </button>

          <button
            type="button"
            onClick={() => setAppTheme(isDark ? "light" : "dark")}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${textPrimary} ${menuHover} transition-all duration-300 active:scale-75`}
            title={isDark ? "Light Mode" : "Dark Mode"}
          >
            <span className="transition-transform duration-500 ease-out transform hover:rotate-[360deg] inline-flex">
              {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
            </span>
          </button>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
              title={t.notifications}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className={`absolute right-0 z-40 mt-2 w-80 rounded-xl border p-3 shadow-xl ${dropdownSurface}`}>
                <div className={`mb-2 flex items-center justify-between text-sm font-black ${textPrimary} ${kmClass}`}>
                  <span>{t.notifications}</span>
                  {notifications.length > 0 ? (
                    <button
                      type="button"
                      onClick={onClearNotifications}
                      className={`rounded-md px-2 py-1 text-[11px] font-bold ${textSecondary} ${menuHover}`}
                    >
                      {t.clear}
                    </button>
                  ) : (
                    <Bell size={15} className={textSecondary} />
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className={`rounded-lg bg-slate-50 p-4 text-center text-xs ${textSecondary} ${kmClass}`}>
                    {t.noNotifications}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedNotification(item);
                          setNotificationsOpen(false);
                        }}
                        className={`flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
                          isDark ? "bg-[#232333] hover:bg-[#2b2c40]" : "bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            item.tone === "warning"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-[#696cff]/10 text-[#696cff]"
                          }`}
                        >
                          {item.tone === "warning" ? <Package size={15} /> : <ShoppingBag size={15} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className={`truncate text-xs font-black ${textPrimary} ${kmClass}`}>
                              {item.title}
                            </div>
                            <span className="shrink-0 rounded bg-[#696cff]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#696cff]">
                              {language === "km" ? "មើលមុខម្ហូប" : "View Dishes"}
                            </span>
                          </div>
                          <div className={`mt-0.5 truncate text-xs ${textSecondary} ${kmClass}`}>
                            {item.detail}
                          </div>
                          {item.items && item.items.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.items.slice(0, 2).map((dish, dIdx) => (
                                <span key={dIdx} className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                  {dish.quantity}x {dish.name}
                                </span>
                              ))}
                              {item.items.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-bold">+{item.items.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            href="/admin/profile"
            className={`hidden h-8 items-center gap-2 rounded-md px-2 sm:flex ${textPrimary} ${menuHover}`}
            title="Profile"
          >
            <ProfileAvatar user={user} />
            <span className={`max-w-24 truncate text-sm ${kmClass}`}>{user.name}</span>
          </Link>
          <Link
            href="/admin/settings"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
            title={t.settings}
          >
            <Settings size={17} />
          </Link>
        </div>
      </div>

      {/* Quick Order Items Preview Modal */}
      {selectedNotification && mounted && createPortal(
        <div 
          onClick={() => setSelectedNotification(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-[usersPageIn_200ms_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl transition-all ${
              isDark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b px-5 py-4 ${isDark ? "border-[#4e4f6e] bg-[#2b2c40]/60" : "border-slate-100 bg-slate-50/80"}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#696cff] text-white shadow-md shadow-[#696cff]/20">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className={`text-base font-bold tracking-tight ${kmClass}`}>
                    {language === "km" ? "ព័ត៌មានលម្អិតនៃការជូនដំណឹង" : "Notification Details"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedNotification.orderNumber ? `Order #${selectedNotification.orderNumber}` : selectedNotification.title}
                    {selectedNotification.tableNo ? ` • Table ${selectedNotification.tableNo}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[380px] overflow-y-auto p-5 space-y-3">
              {selectedNotification.items && selectedNotification.items.length > 0 ? (
                <div>
                  <div className="mb-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {language === "km" ? "បញ្ជីមុខម្ហូបក្នុង Order" : "Ordered Items"}
                  </div>
                  <div className="space-y-2.5">
                    {selectedNotification.items.map((dish, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between rounded-xl p-3 border transition-all ${
                          isDark ? "bg-[#2b2c40] border-[#4e4f6e]" : "bg-slate-50 border-slate-200/60 hover:bg-slate-100/60"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {dish.image ? (
                            <img src={dish.image} alt={dish.name} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#696cff]/10 text-[#696cff]">
                              <ShoppingBag size={18} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{dish.name}</div>
                            {dish.notes && (
                              <div className="truncate text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                Note: {dish.notes}
                              </div>
                            )}
                            {dish.price ? (
                              <div className="text-[11px] text-slate-500 font-medium">${dish.price.toFixed(2)} / item</div>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block rounded-md bg-[#696cff] px-2.5 py-1 text-xs font-bold text-white">
                            x{dish.quantity}
                          </span>
                          {dish.price ? (
                            <div className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-100">
                              ${(dish.price * dish.quantity).toFixed(2)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl border p-4 space-y-3 ${isDark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/70 bg-slate-50/80"}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#696cff]/10 text-[#696cff]">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {selectedNotification.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedNotification.detail}
                      </p>
                    </div>
                  </div>

                  {/* Summary Info Cards */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {selectedNotification.tableNo && (
                      <div className={`rounded-lg p-2.5 border text-xs ${isDark ? "bg-[#232333] border-[#4e4f6e]" : "bg-white border-slate-200/60"}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === "km" ? "លេខតុ" : "Table"}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">Table {selectedNotification.tableNo}</span>
                      </div>
                    )}
                    {selectedNotification.orderNumber && (
                      <div className={`rounded-lg p-2.5 border text-xs ${isDark ? "bg-[#232333] border-[#4e4f6e]" : "bg-white border-slate-200/60"}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === "km" ? "លេខ Order" : "Order No."}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">#{selectedNotification.orderNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`flex items-center justify-between border-t px-5 py-3.5 ${isDark ? "border-[#4e4f6e] bg-[#2b2c40]/40" : "border-slate-100 bg-slate-50/50"}`}>
              <div>
                {selectedNotification.totalAmount ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "km" ? "សរុបទឹកប្រាក់" : "Total Amount"}
                    </span>
                    <div className="text-base font-black text-emerald-500">${selectedNotification.totalAmount.toFixed(2)}</div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <Link
                  href="/admin/orders"
                  onClick={() => setSelectedNotification(null)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#696cff] px-4 text-xs font-bold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-sm shadow-[#696cff]/20"
                >
                  <Eye size={14} />
                  <span>{language === "km" ? "មើលក្នុង Orders" : "View in Orders"}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="h-9 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-[#4e4f6e] dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                >
                  {language === "km" ? "បិទ" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Popup */}
      {toastNotification && (
        <div className={`fixed bottom-6 right-6 z-[9999] w-full max-w-sm rounded-lg p-4 shadow-xl ring-1 animate-[dashboardPageIn_0.3s_ease-out] ${bgCard} ${dark ? 'ring-white/10' : 'ring-black/5'}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#696cff]/10 text-[#696cff]">
              <Bell size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${textPrimary}`}>{toastNotification.title}</p>
              <p className={`mt-1 text-sm line-clamp-2 ${textSecondary}`}>{toastNotification.detail}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedNotification(toastNotification);
                    setToastNotification(null);
                  }}
                  className="text-sm font-semibold text-[#696cff] hover:text-[#5f61e6]"
                >
                  {t.notifications || "View"}
                </button>
              </div>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className={`flex-shrink-0 ml-4 ${textSecondary} hover:${textPrimary}`}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function subscribeToUserChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-auth-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-auth-change", onStoreChange);
  };
}

function subscribeToPermissionChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-permissions-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-permissions-change", onStoreChange);
  };
}

function getUserSnapshot() {
  return localStorage.getItem("pos_user") || JSON.stringify({ name: "Guest", role: "Not signed in" });
}

function getServerUserSnapshot() {
  return JSON.stringify({ name: "User", role: "Member" });
}

function getStaffPermissionsSnapshot() {
  const raw = localStorage.getItem("pos_staff_permissions") || "{}";
  if (raw === cachedStaffPermissionsRaw) return cachedStaffPermissions;

  try {
    cachedStaffPermissions = normalizeStaffPermissions(JSON.parse(raw));
  } catch {
    cachedStaffPermissions = normalizeStaffPermissions();
  }

  cachedStaffPermissionsRaw = raw;
  return cachedStaffPermissions;
}

function getServerStaffPermissionsSnapshot() {
  return cachedStaffPermissions;
}

function parseUserSnapshot(snapshot: string) {
  return parseProfileUserSnapshot(snapshot);
}

function ProfileAvatar({ user }: { user: ReturnType<typeof parseUserSnapshot> }) {
  const image = getProfileImage(user);

  if (image) {
    return (
      <img
        src={image}
        alt={user.name}
        className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
      />
    );
  }

  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white ${profileAvatarClass(
        user.role,
      )}`}
    >
      {user.name ? initials(user.name) : <UserRound size={15} />}
    </span>
  );
}
